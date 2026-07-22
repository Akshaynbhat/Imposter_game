import { Server, Socket } from 'socket.io';
import { GamePhase, Player, RoomPublicState, PersonalRolePayload, WordPair, GameSettings, DecisionOption } from './types.js';
import wordPairsData from './words.json' with { type: 'json' };

const wordPairs: WordPair[] = wordPairsData as WordPair[];

interface Room {
  code: string;
  phase: GamePhase;
  currentRound: number;
  timerSeconds: number;
  timerInterval: NodeJS.Timeout | null;
  players: Map<string, Player>; // socketId -> Player
  sessionToSocketMap: Map<string, string>; // sessionId -> socketId
  joinOrder: string[]; // List of session IDs in join order
  civilianWord: string;
  imposterWord: string;
  imposterId: string;
  clues: { playerId: string; playerName: string; round: number; clue: string }[];
  votes: Map<string, string>; // voterId -> targetId
  decisionVotes: Map<string, DecisionOption>; // socketId -> PLAY_AGAIN | GUESS_IMPOSTER
  eliminatedPlayerId?: string;
  winner?: 'CIVILIANS' | 'IMPOSTER';
  settings: GameSettings;
  isPaused: boolean;
  tieBreakCandidates: string[];
  tieBreakIteration: number; // 0 = first tie break
  chatHistory: { senderId: string; senderName: string; message: string; timestamp: string }[];
  clueOrder: string[];
  activeWriterIndex: number;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(socket: Socket, playerName: string, sessionId: string): { code: string; player: Player } {
    const code = this.generateRoomCode();
    const player: Player = {
      id: socket.id,
      name: playerName.trim() || 'Host',
      isHost: true,
      isImposter: false,
      secretWord: '',
      isConnected: true,
      isReady: true, // Host is ready by default
      isReadyForNextGame: false,
    };

    const room: Room = {
      code,
      phase: 'LOBBY',
      currentRound: 1,
      timerSeconds: 0,
      timerInterval: null,
      players: new Map([[socket.id, player]]),
      sessionToSocketMap: new Map([[sessionId, socket.id]]),
      joinOrder: [sessionId],
      civilianWord: '',
      imposterWord: '',
      imposterId: '',
      clues: [],
      votes: new Map(),
      decisionVotes: new Map(),
      settings: {
        category: 'All',
        difficulty: 'All',
        roundTimer: 15,
        discussionTimer: 45,
      },
      isPaused: false,
      tieBreakCandidates: [],
      tieBreakIteration: 0,
      chatHistory: [],
      clueOrder: [],
      activeWriterIndex: 0,
    };

    this.rooms.set(code, room);
    socket.join(code);
    this.broadcastRoomState(code);

    return { code, player };
  }

  public joinRoom(socket: Socket, roomCode: string, playerName: string, sessionId: string): { success: boolean; message?: string; player?: Player } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, message: 'Room not found. Check the code and try again.' };
    }

    if (room.phase !== 'LOBBY') {
      return { success: false, message: 'Game in progress. Cannot join right now.' };
    }

    const nameExists = Array.from(room.players.values()).some(
      (p) => p.isConnected && p.name.toLowerCase() === playerName.trim().toLowerCase()
    );
    if (nameExists) {
      return { success: false, message: 'Name already taken in this room. Choose a unique name!' };
    }

    if (room.players.size >= 10) {
      return { success: false, message: 'Room is full (Maximum 10 players).' };
    }

    const player: Player = {
      id: socket.id,
      name: playerName.trim() || `Player ${room.players.size + 1}`,
      isHost: room.players.size === 0,
      isImposter: false,
      secretWord: '',
      isConnected: true,
      isReady: false,
      isReadyForNextGame: false,
    };

    room.players.set(socket.id, player);
    room.sessionToSocketMap.set(sessionId, socket.id);
    if (!room.joinOrder.includes(sessionId)) {
      room.joinOrder.push(sessionId);
    }
    socket.join(code);

    this.broadcastRoomState(code);
    return { success: true, player };
  }

  public toggleReady(socket: Socket, roomCode: string): { success: boolean; ready?: boolean } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false };

    const player = room.players.get(socket.id);
    if (!player) return { success: false };

    player.isReady = !player.isReady;
    this.broadcastRoomState(roomCode);
    return { success: true, ready: player.isReady };
  }

  public updateSettings(socket: Socket, roomCode: string, settings: GameSettings): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    const player = room.players.get(socket.id);
    if (!player || !player.isHost) {
      return { success: false, message: 'Only the host can modify settings.' };
    }

    room.settings = {
      category: settings.category || 'All',
      difficulty: settings.difficulty || 'All',
      roundTimer: Number(settings.roundTimer) || 15,
      discussionTimer: Number(settings.discussionTimer) || 45,
    };

    this.broadcastRoomState(roomCode);
    return { success: true };
  }

  public reconnect(socket: Socket, roomCode: string, sessionId: string): boolean {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return false;

    const oldSocketId = room.sessionToSocketMap.get(sessionId);
    if (!oldSocketId) return false;

    const existingPlayer = room.players.get(oldSocketId);
    if (!existingPlayer) return false;

    room.players.delete(oldSocketId);
    existingPlayer.id = socket.id;
    existingPlayer.isConnected = true;
    room.players.set(socket.id, existingPlayer);
    room.sessionToSocketMap.set(sessionId, socket.id);

    // Update maps
    for (const [voter, target] of room.votes.entries()) {
      if (voter === oldSocketId) {
        room.votes.delete(voter);
        room.votes.set(socket.id, target);
      }
    }
    if (room.decisionVotes.has(oldSocketId)) {
      const dec = room.decisionVotes.get(oldSocketId)!;
      room.decisionVotes.delete(oldSocketId);
      room.decisionVotes.set(socket.id, dec);
    }

    socket.join(code);

    if (room.phase !== 'LOBBY' && existingPlayer.secretWord) {
      socket.emit('assign-role', {
        role: existingPlayer.isImposter ? 'IMPOSTER' : 'CIVILIAN',
        secretWord: existingPlayer.secretWord,
      } as PersonalRolePayload);
    }

    this.checkPauseStatus(room);
    this.broadcastRoomState(code);
    return true;
  }

  public leaveRoom(socket: Socket, roomCode: string): { success: boolean } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return { success: false };

    const player = room.players.get(socket.id);
    if (!player) return { success: false };

    room.players.delete(socket.id);
    room.decisionVotes.delete(socket.id);
    room.votes.delete(socket.id);
    socket.leave(code);

    // Remove from session map if present
    for (const [sessId, sockId] of room.sessionToSocketMap.entries()) {
      if (sockId === socket.id) {
        room.sessionToSocketMap.delete(sessId);
        break;
      }
    }

    // Host transfer if player was host
    if (player.isHost) {
      this.transferHost(room);
    }

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    if (connectedPlayers.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      this.rooms.delete(code);
      return { success: true };
    }

    if (room.phase === 'GAME_OVER') {
      this.checkPlayAgainStatus(room);
    } else {
      this.checkPauseStatus(room);
    }

    this.broadcastRoomState(code);
    return { success: true };
  }

  private transferHost(room: Room) {
    let newHostFound = false;
    for (const sessId of room.joinOrder) {
      const sockId = room.sessionToSocketMap.get(sessId);
      if (sockId) {
        const p = room.players.get(sockId);
        if (p && p.isConnected) {
          p.isHost = true;
          p.isReady = true;
          newHostFound = true;
          this.io.to(room.code).emit('host-changed', { newHostName: p.name });
          break;
        }
      }
    }
    if (!newHostFound) {
      const nextHost = Array.from(room.players.values()).find((p) => p.isConnected);
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
        this.io.to(room.code).emit('host-changed', { newHostName: nextHost.name });
      }
    }
  }

  public handleDisconnect(socket: Socket) {
    for (const [code, room] of this.rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id)!;
        player.isConnected = false;

        if (player.isHost) {
          this.transferHost(room);
        }

        room.decisionVotes.delete(socket.id);

        const activePlayersCount = Array.from(room.players.values()).filter((p) => p.isConnected).length;
        if (activePlayersCount === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          this.rooms.delete(code);
          return;
        }

        if (room.phase === 'GAME_OVER') {
          this.checkPlayAgainStatus(room);
        } else if (room.phase === 'CLUE_SUBMISSION') {
          this.checkClueSubmissionsComplete(room);
        } else if (room.phase === 'ROUND_DECISION') {
          this.checkDecisionVotesComplete(room);
        } else if (room.phase === 'VOTING' || room.phase === 'TIE_BREAK_VOTING') {
          if (room.votes.size >= activePlayersCount) {
            if (room.timerInterval) clearInterval(room.timerInterval);
            this.finishVoting(room);
          }
        }

        this.checkPauseStatus(room);
        this.broadcastRoomState(code);
      }
    }
  }

  private checkPauseStatus(room: Room) {
    if (room.phase === 'LOBBY' || room.phase === 'GAME_OVER') {
      room.isPaused = false;
      return;
    }

    const connectedCount = Array.from(room.players.values()).filter((p) => p.isConnected).length;
    if (connectedCount < 3) {
      if (!room.isPaused) {
        room.isPaused = true;
        this.io.to(room.code).emit('game-paused', { message: 'Too few players connected. Pausing...' });
      }
    } else {
      if (room.isPaused) {
        room.isPaused = false;
        this.io.to(room.code).emit('game-resumed', { message: 'Players reconnected. Resuming!' });
      }
    }
  }

  public playerReadyForNextGame(socket: Socket, roomCode: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    if (room.phase !== 'GAME_OVER') {
      return { success: false, message: 'Game is not over.' };
    }

    const player = room.players.get(socket.id);
    if (!player || !player.isConnected) return { success: false, message: 'Player not found.' };

    player.isReadyForNextGame = true;
    this.checkPlayAgainStatus(room);
    return { success: true };
  }

  private checkPlayAgainStatus(room: Room) {
    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    if (connectedPlayers.length === 0) return;

    const readyCount = connectedPlayers.filter((p) => p.isReadyForNextGame).length;

    if (readyCount >= connectedPlayers.length) {
      if (connectedPlayers.length >= 3) {
        this.startFreshGame(room);
      } else {
        this.returnToLobbyWithWaiting(room);
      }
    } else {
      this.broadcastRoomState(room.code);
    }
  }

  private startFreshGame(room: Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);

    // Pick new random word pair
    let pool = wordPairs;
    if (room.settings.category !== 'All') {
      pool = pool.filter((w) => w.category === room.settings.category);
    }
    if (room.settings.difficulty !== 'All') {
      pool = pool.filter((w) => w.difficulty === room.settings.difficulty);
    }
    if (pool.length === 0) pool = wordPairs;

    const pair = pool[Math.floor(Math.random() * pool.length)];
    room.civilianWord = pair.civilian;
    room.imposterWord = pair.imposter;

    // Pick new random imposter
    const imposterIndex = Math.floor(Math.random() * connectedPlayers.length);
    const imposterPlayer = connectedPlayers[imposterIndex];
    room.imposterId = imposterPlayer.id;

    for (const p of room.players.values()) {
      p.isReadyForNextGame = false;
      if (p.id === room.imposterId) {
        p.isImposter = true;
        p.secretWord = room.imposterWord;
      } else {
        p.isImposter = false;
        p.secretWord = room.civilianWord;
      }
    }

    room.currentRound = 1;
    room.clues = [];
    room.votes.clear();
    room.decisionVotes.clear();
    room.eliminatedPlayerId = undefined;
    room.winner = undefined;
    room.tieBreakCandidates = [];
    room.tieBreakIteration = 0;
    room.isPaused = false;

    // Send secret word ONLY to respective sockets
    for (const p of room.players.values()) {
      const clientSocket = this.io.sockets.sockets.get(p.id);
      if (clientSocket) {
        clientSocket.emit('assign-role', {
          role: p.isImposter ? 'IMPOSTER' : 'CIVILIAN',
          secretWord: p.secretWord,
        } as PersonalRolePayload);
      }
    }

    this.startClueRound(room);
  }

  private returnToLobbyWithWaiting(room: Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = 'LOBBY';
    room.currentRound = 1;
    room.timerSeconds = 0;
    room.clues = [];
    room.votes.clear();
    room.decisionVotes.clear();
    room.eliminatedPlayerId = undefined;
    room.winner = undefined;
    room.civilianWord = '';
    room.imposterWord = '';
    room.imposterId = '';
    room.tieBreakCandidates = [];
    room.tieBreakIteration = 0;
    room.isPaused = false;

    for (const p of room.players.values()) {
      p.isImposter = false;
      p.secretWord = '';
      p.isReadyForNextGame = false;
      p.isReady = p.isHost;
    }

    this.io.to(room.code).emit('lobby-waiting', { message: 'Waiting for more players...' });
    this.broadcastRoomState(room.code);
  }

  public startGame(
    socket: Socket,
    roomCode: string,
    customCivilianWord?: string,
    customImposterWord?: string
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    const player = room.players.get(socket.id);
    if (!player || !player.isHost) return { success: false, message: 'Only the host can start the game.' };

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    if (connectedPlayers.length < 3) {
      return { success: false, message: 'Need at least 3 connected players to start!' };
    }

    const allReady = connectedPlayers.every((p) => p.isHost || p.isReady);
    if (!allReady) {
      return { success: false, message: 'Waiting for all players to be Ready!' };
    }

    if (room.settings.category === 'Custom') {
      const civ = (customCivilianWord || '').trim();
      const imp = (customImposterWord || '').trim();

      if (!civ || !imp) {
        return { success: false, message: 'Please enter both custom Civilian and Imposter words!' };
      }

      const lettersOnly = /^[a-zA-Z]+$/;
      if (!lettersOnly.test(civ) || !lettersOnly.test(imp)) {
        return { success: false, message: 'Custom words must contain letters only (no spaces, numbers, or special characters)!' };
      }

      if (civ.length > 20 || imp.length > 20) {
        return { success: false, message: 'Custom words must be 20 characters or less!' };
      }

      if (civ.toLowerCase() === imp.toLowerCase()) {
        return { success: false, message: 'Civilian and Imposter words must be different!' };
      }

      room.civilianWord = civ;
      room.imposterWord = imp;
    } else {
      let pool = wordPairs;
      if (room.settings.category !== 'All') {
        pool = pool.filter((w) => w.category === room.settings.category);
      }
      if (room.settings.difficulty !== 'All') {
        pool = pool.filter((w) => w.difficulty === room.settings.difficulty);
      }

      if (pool.length === 0) {
        pool = wordPairs;
      }

      const pair = pool[Math.floor(Math.random() * pool.length)];
      room.civilianWord = pair.civilian;
      room.imposterWord = pair.imposter;
    }

    const imposterIndex = Math.floor(Math.random() * connectedPlayers.length);
    const imposterPlayer = connectedPlayers[imposterIndex];
    room.imposterId = imposterPlayer.id;

    for (const p of room.players.values()) {
      p.isReadyForNextGame = false;
      if (p.id === room.imposterId) {
        p.isImposter = true;
        p.secretWord = room.imposterWord;
      } else {
        p.isImposter = false;
        p.secretWord = room.civilianWord;
      }
    }

    room.currentRound = 1;
    room.clues = [];
    room.votes.clear();
    room.decisionVotes.clear();
    room.eliminatedPlayerId = undefined;
    room.winner = undefined;
    room.tieBreakCandidates = [];
    room.tieBreakIteration = 0;
    room.isPaused = false;

    for (const p of room.players.values()) {
      const clientSocket = this.io.sockets.sockets.get(p.id);
      if (clientSocket) {
        clientSocket.emit('assign-role', {
          role: p.isImposter ? 'IMPOSTER' : 'CIVILIAN',
          secretWord: p.secretWord,
        } as PersonalRolePayload);
      }
    }

    this.startClueRound(room);
    return { success: true };
  }

  private startClueRound(room: Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = 'CLUE_SUBMISSION';
    room.timerSeconds = 0;

    this.broadcastRoomState(room.code);
  }

  public submitClue(socket: Socket, roomCode: string, clueText: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    if (room.phase !== 'CLUE_SUBMISSION') {
      return { success: false, message: 'Not in clue submission phase.' };
    }

    const player = room.players.get(socket.id);
    if (!player) return { success: false, message: 'Player not found.' };

    const existing = room.clues.find((c) => c.playerId === socket.id && c.round === room.currentRound);
    if (existing) {
      return { success: false, message: 'Already submitted a clue for this round.' };
    }

    const cleaned = clueText.trim();
    if (!/^[a-zA-Z]{1,20}$/.test(cleaned)) {
      return { success: false, message: 'Clue must be exactly ONE word with only letters (no spaces, numbers, emojis or special characters, max 20 letters)!' };
    }

    room.clues.push({
      playerId: player.id,
      playerName: player.name,
      round: room.currentRound,
      clue: cleaned,
    });

    this.checkClueSubmissionsComplete(room);
    return { success: true };
  }

  private checkClueSubmissionsComplete(room: Room) {
    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    const submittedCount = connectedPlayers.filter((p) =>
      room.clues.some((c) => c.playerId === p.id && c.round === room.currentRound)
    ).length;

    if (submittedCount >= connectedPlayers.length && connectedPlayers.length > 0) {
      this.startRoundDecisionPhase(room);
    } else {
      this.broadcastRoomState(room.code);
    }
  }

  private startRoundDecisionPhase(room: Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = 'ROUND_DECISION';
    room.timerSeconds = 0;
    room.decisionVotes.clear();

    this.broadcastRoomState(room.code);
  }

  public submitDecision(socket: Socket, roomCode: string, decision: DecisionOption): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    if (room.phase !== 'ROUND_DECISION') {
      return { success: false, message: 'Not in decision phase.' };
    }

    const player = room.players.get(socket.id);
    if (!player || !player.isConnected) return { success: false, message: 'Player not found.' };

    room.decisionVotes.set(socket.id, decision);
    this.checkDecisionVotesComplete(room);
    return { success: true };
  }

  private checkDecisionVotesComplete(room: Room) {
    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    if (connectedPlayers.length === 0) return;

    if (room.decisionVotes.size >= connectedPlayers.length) {
      let playAgainCount = 0;
      let guessImposterCount = 0;

      for (const dec of room.decisionVotes.values()) {
        if (dec === 'PLAY_AGAIN') playAgainCount++;
        else if (dec === 'GUESS_IMPOSTER') guessImposterCount++;
      }

      if (playAgainCount > guessImposterCount) {
        room.currentRound += 1;
        this.startClueRound(room);
      } else {
        this.startVotingPhase(room, 'VOTING');
      }
    } else {
      this.broadcastRoomState(room.code);
    }
  }

  private startVotingPhase(room: Room, phase: 'VOTING' | 'TIE_BREAK_VOTING') {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = phase;
    room.timerSeconds = 45;
    room.votes.clear();

    this.broadcastRoomState(room.code);

    room.timerInterval = setInterval(() => {
      if (room.isPaused) return;

      room.timerSeconds -= 1;
      this.broadcastRoomState(room.code);

      if (room.timerSeconds <= 0) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        this.finishVoting(room);
      }
    }, 1000);
  }

  public submitVote(socket: Socket, roomCode: string, targetPlayerId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    if (room.phase !== 'VOTING' && room.phase !== 'TIE_BREAK_VOTING') {
      return { success: false, message: 'Voting is not active.' };
    }

    if (socket.id === targetPlayerId) {
      return { success: false, message: 'You cannot vote for yourself!' };
    }

    if (room.phase === 'TIE_BREAK_VOTING' && !room.tieBreakCandidates.includes(targetPlayerId)) {
      return { success: false, message: 'Must vote for one of the tied players!' };
    }

    room.votes.set(socket.id, targetPlayerId);
    this.broadcastRoomState(room.code);

    const activePlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    if (room.votes.size >= activePlayers.length) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      this.finishVoting(room);
    }

    return { success: true };
  }

  private finishVoting(room: Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    const activePlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    
    const tally: { [playerId: string]: number } = {};
    for (const p of activePlayers) {
      tally[p.id] = 0;
    }

    for (const [voterId, targetId] of room.votes.entries()) {
      const voter = room.players.get(voterId);
      if (voter && voter.isConnected && tally[targetId] !== undefined) {
        tally[targetId] += 1;
      }
    }

    let maxVotes = -1;
    let candidates: string[] = [];

    const listToCheck = room.phase === 'TIE_BREAK_VOTING' ? room.tieBreakCandidates : activePlayers.map(p => p.id);

    for (const id of listToCheck) {
      const count = tally[id] || 0;
      if (count > maxVotes) {
        maxVotes = count;
        candidates = [id];
      } else if (count === maxVotes) {
        candidates.push(id);
      }
    }

    if (candidates.length > 1) {
      if (room.tieBreakIteration === 0) {
        room.tieBreakCandidates = candidates;
        room.tieBreakIteration = 1;
        this.io.to(room.code).emit('tie-break-triggered', { candidates });
        this.startVotingPhase(room, 'TIE_BREAK_VOTING');
        return;
      } else {
        const randomElim = candidates[Math.floor(Math.random() * candidates.length)];
        this.eliminatePlayer(room, randomElim);
      }
    } else if (candidates.length === 1) {
      this.eliminatePlayer(room, candidates[0]);
    } else {
      const randomElim = activePlayers[Math.floor(Math.random() * activePlayers.length)].id;
      this.eliminatePlayer(room, randomElim);
    }
  }

  private eliminatePlayer(room: Room, playerId: string) {
    room.eliminatedPlayerId = playerId;
    const player = room.players.get(playerId);

    if (player && player.isImposter) {
      room.winner = 'CIVILIANS';
    } else {
      room.winner = 'IMPOSTER';
    }

    room.phase = 'GAME_OVER';
    for (const p of room.players.values()) {
      p.isReadyForNextGame = false;
    }
    this.broadcastRoomState(room.code);
  }

  public playAgain(socket: Socket, roomCode: string): { success: boolean; message?: string } {
    return this.playerReadyForNextGame(socket, roomCode);
  }

  public addChatMessage(socket: Socket, roomCode: string, messageText: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const player = room.players.get(socket.id);
    if (!player) return false;

    const msg = messageText.trim();
    if (!msg || msg.length > 200) return false;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const chatMsg = {
      senderId: player.id,
      senderName: player.name,
      message: msg,
      timestamp,
    };

    room.chatHistory.push(chatMsg);
    if (room.chatHistory.length > 50) {
      room.chatHistory.shift();
    }

    this.broadcastRoomState(room.code);
    return true;
  }

  private broadcastRoomState(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const voteCounts: { [playerId: string]: number } = {};
    for (const targetId of room.votes.values()) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    let playAgainCount = 0;
    let guessImposterCount = 0;
    for (const dec of room.decisionVotes.values()) {
      if (dec === 'PLAY_AGAIN') playAgainCount++;
      else if (dec === 'GUESS_IMPOSTER') guessImposterCount++;
    }

    const imposterPlayer = Array.from(room.players.values()).find((p) => p.isImposter);

    const publicState: RoomPublicState = {
      code: room.code,
      phase: room.phase,
      currentRound: room.currentRound,
      timerSeconds: room.timerSeconds,
      players: Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isConnected: p.isConnected,
        isReady: p.isReady,
        hasSubmittedClue: room.clues.some((c) => c.playerId === p.id && c.round === room.currentRound),
        hasVoted: room.votes.has(p.id),
        decisionVote: room.decisionVotes.get(p.id),
        isReadyForNextGame: p.isReadyForNextGame ?? false,
      })),
      clues: room.clues,
      settings: room.settings,
      isPaused: room.isPaused,
      tieBreakCandidates: room.tieBreakCandidates,
      chatHistory: room.chatHistory,
      clueOrder: room.clueOrder,
      voteCounts: room.phase === 'GAME_OVER' ? voteCounts : undefined,
      decisionVotesCount: { PLAY_AGAIN: playAgainCount, GUESS_IMPOSTER: guessImposterCount },
      eliminatedPlayer: room.eliminatedPlayerId
        ? {
            id: room.eliminatedPlayerId,
            name: room.players.get(room.eliminatedPlayerId)?.name || 'Unknown',
            isImposter: !!room.players.get(room.eliminatedPlayerId)?.isImposter,
          }
        : undefined,
      winner: room.winner,
      civilianWord: room.phase === 'GAME_OVER' ? room.civilianWord : undefined,
      imposterWord: room.phase === 'GAME_OVER' ? room.imposterWord : undefined,
      imposterName: room.phase === 'GAME_OVER' ? imposterPlayer?.name : undefined,
    };

    this.io.to(roomCode).emit('room-state', publicState);
  }
}
