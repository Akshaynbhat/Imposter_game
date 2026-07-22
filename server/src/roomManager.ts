import { Server, Socket } from 'socket.io';
import { GamePhase, Player, RoomPublicState, PersonalRolePayload, WordPair, GameSettings } from './types.js';
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
  clues: { playerId: string; playerName: string; round: 1 | 2; clue: string }[];
  votes: Map<string, string>; // voterId -> targetId
  readyToVote: Set<string>; // socketIds of players ready to vote during discussion
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
      readyToVote: new Set(),
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
    
    // Fix: Critical Create Room Transition Bug
    // We must broadcast the initial room state to the host's socket right after creation!
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

    // Check if name is duplicate in this room
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
      isReady: false, // Players must mark ready
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

    // Update player socket ID
    room.players.delete(oldSocketId);
    existingPlayer.id = socket.id;
    existingPlayer.isConnected = true;
    room.players.set(socket.id, existingPlayer);
    room.sessionToSocketMap.set(sessionId, socket.id);

    // Update votes map if they voted
    for (const [voter, target] of room.votes.entries()) {
      if (voter === oldSocketId) {
        room.votes.delete(voter);
        room.votes.set(socket.id, target);
      }
    }

    socket.join(code);

    // Send secret word to reconnected player if game in progress
    if (room.phase !== 'LOBBY' && existingPlayer.secretWord) {
      socket.emit('assign-role', {
        role: existingPlayer.isImposter ? 'IMPOSTER' : 'CIVILIAN',
        secretWord: existingPlayer.secretWord,
      } as PersonalRolePayload);
    }

    // Check if we need to resume a paused game
    this.checkPauseStatus(room);

    this.broadcastRoomState(code);
    return true;
  }

  public handleDisconnect(socket: Socket) {
    for (const [code, room] of this.rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id)!;
        player.isConnected = false;

        // Automatically transfer host if host disconnected
        if (player.isHost) {
          player.isHost = false;
          
          // Oldest connected player migration logic using joinOrder
          let newHostFound = false;
          for (const sessId of room.joinOrder) {
            const sockId = room.sessionToSocketMap.get(sessId);
            if (sockId) {
              const p = room.players.get(sockId);
              if (p && p.isConnected) {
                p.isHost = true;
                p.isReady = true; // Host is always ready
                newHostFound = true;
                this.io.to(code).emit('host-changed', { newHostName: p.name });
                break;
              }
            }
          }
          
          if (!newHostFound) {
            // Fallback to any connected player
            const nextHost = Array.from(room.players.values()).find((p) => p.isConnected);
            if (nextHost) {
              nextHost.isHost = true;
              nextHost.isReady = true;
              this.io.to(code).emit('host-changed', { newHostName: nextHost.name });
            }
          }
        }

        // Remove from ready to vote set
        room.readyToVote.delete(socket.id);

        // Clean up empty room
        const activePlayersCount = Array.from(room.players.values()).filter((p) => p.isConnected).length;
        if (activePlayersCount === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          this.rooms.delete(code);
          return;
        }

        // Check if phase can complete after disconnect
        if (room.phase === 'ROUND_1' || room.phase === 'ROUND_2') {
          this.checkClueSubmissionsComplete(room);
        } else if (room.phase === 'DISCUSSION_1' || room.phase === 'DISCUSSION_2') {
          const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
          if (connectedPlayers.length > 0 && connectedPlayers.every((p) => room.readyToVote.has(p.id))) {
            if (room.timerInterval) clearInterval(room.timerInterval);
            const isFirstDiscussion = room.phase === 'DISCUSSION_1';
            if (isFirstDiscussion) {
              this.startRound(room, 2);
            } else {
              this.startVotingPhase(room, 'VOTING');
            }
          }
        }

        // Check if we need to pause the active game
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

      // Validations: letters only, max 20 length
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
      // Filter words matching host settings
      let pool = wordPairs;
      if (room.settings.category !== 'All') {
        pool = pool.filter((w) => w.category === room.settings.category);
      }
      if (room.settings.difficulty !== 'All') {
        pool = pool.filter((w) => w.difficulty === room.settings.difficulty);
      }

      // Fallback if no words match the filtered pool
      if (pool.length === 0) {
        pool = wordPairs;
      }

      // Pick random word pair
      const pair = pool[Math.floor(Math.random() * pool.length)];
      room.civilianWord = pair.civilian;
      room.imposterWord = pair.imposter;
    }

    // Pick random imposter
    const imposterIndex = Math.floor(Math.random() * connectedPlayers.length);
    const imposterPlayer = connectedPlayers[imposterIndex];
    room.imposterId = imposterPlayer.id;

    // Assign roles & secret words
    for (const p of room.players.values()) {
      if (p.id === room.imposterId) {
        p.isImposter = true;
        p.secretWord = room.imposterWord;
      } else {
        p.isImposter = false;
        p.secretWord = room.civilianWord;
      }
    }

    // Shuffled connected players list to make the turn sequence unpredictable
    const connectedPlayerIds = connectedPlayers.map((p) => p.id);
    for (let i = connectedPlayerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [connectedPlayerIds[i], connectedPlayerIds[j]] = [connectedPlayerIds[j], connectedPlayerIds[i]];
    }
    room.clueOrder = connectedPlayerIds;
    room.activeWriterIndex = 0;

    // Reset clues, votes, and tie break variables
    room.clues = [];
    room.votes.clear();
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

    // Move to Round 1
    this.startRound(room, 1);
    return { success: true };
  }

  private startRound(room: Room, roundNumber: 1 | 2) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = roundNumber === 1 ? 'ROUND_1' : 'ROUND_2';
    room.currentRound = roundNumber;
    room.timerSeconds = 0; // No countdown timer for clue submission phase

    this.broadcastRoomState(room.code);
  }

  public submitClue(socket: Socket, roomCode: string, clueText: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    if (room.phase !== 'ROUND_1' && room.phase !== 'ROUND_2') {
      return { success: false, message: 'Not in clue submission phase.' };
    }

    const player = room.players.get(socket.id);
    if (!player) return { success: false, message: 'Player not found.' };

    // Check if already submitted for current round
    const existing = room.clues.find((c) => c.playerId === socket.id && c.round === room.currentRound);
    if (existing) {
      return { success: false, message: 'Already submitted for this round.' };
    }

    // Strictly validate clue: ONE word, letters only, no spaces, emojis, numbers, special characters, max 20 chars
    const cleaned = clueText.trim();
    if (!/^[a-zA-Z]{1,20}$/.test(cleaned)) {
      return { success: false, message: 'Clue must be exactly ONE word with only letters (no spaces, numbers, emojis or special characters, max 20 letters)!' };
    }

    room.clues.push({
      playerId: player.id,
      playerName: player.name,
      round: room.currentRound as 1 | 2,
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
      if (room.timerInterval) clearInterval(room.timerInterval);
      if (room.currentRound === 1) {
        this.startClueRevealPhase(room, 'CLUES_REVEAL_1', 2);
      } else {
        this.startClueRevealPhase(room, 'CLUES_REVEAL_2', 'VOTING');
      }
    } else {
      this.broadcastRoomState(room.code);
    }
  }

  private startClueRevealPhase(room: Room, phase: 'CLUES_REVEAL_1' | 'CLUES_REVEAL_2', nextTarget: 2 | 'VOTING') {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = phase;
    room.timerSeconds = 5;
    this.broadcastRoomState(room.code);

    room.timerInterval = setInterval(() => {
      if (room.isPaused) return;

      room.timerSeconds -= 1;
      this.broadcastRoomState(room.code);

      if (room.timerSeconds <= 0) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        this.startDiscussionPhase(room, nextTarget);
      }
    }, 1000);
  }

  private startDiscussionPhase(room: Room, nextTarget: 2 | 'VOTING') {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = nextTarget === 2 ? 'DISCUSSION_1' : 'DISCUSSION_2';
    room.timerSeconds = room.settings.discussionTimer;
    room.readyToVote.clear(); // Clear previous ready-to-vote states
    this.broadcastRoomState(room.code);

    room.timerInterval = setInterval(() => {
      if (room.isPaused) return;

      room.timerSeconds -= 1;
      this.broadcastRoomState(room.code);

      if (room.timerSeconds <= 0) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        if (nextTarget === 2) {
          this.startRound(room, 2);
        } else {
          this.startVotingPhase(room, 'VOTING');
        }
      }
    }, 1000);
  }

  public toggleReadyToVote(socket: Socket, roomCode: string): { success: boolean } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false };

    if (room.phase !== 'DISCUSSION_1' && room.phase !== 'DISCUSSION_2') {
      return { success: false };
    }

    const player = room.players.get(socket.id);
    if (!player || !player.isConnected) return { success: false };

    if (room.readyToVote.has(socket.id)) {
      room.readyToVote.delete(socket.id);
    } else {
      room.readyToVote.add(socket.id);
    }

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    const allReady = connectedPlayers.length > 0 && connectedPlayers.every((p) => room.readyToVote.has(p.id));

    if (allReady) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      const isFirstDiscussion = room.phase === 'DISCUSSION_1';
      if (isFirstDiscussion) {
        this.startRound(room, 2);
      } else {
        this.startVotingPhase(room, 'VOTING');
      }
    } else {
      this.broadcastRoomState(room.code);
    }

    return { success: true };
  }

  private startVotingPhase(room: Room, phase: 'VOTING' | 'TIE_BREAK_VOTING') {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = phase;
    room.timerSeconds = 30;
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

    // If in tie break, you can only vote for players in the tie candidates list
    if (room.phase === 'TIE_BREAK_VOTING' && !room.tieBreakCandidates.includes(targetPlayerId)) {
      return { success: false, message: 'Must vote for one of the tied players!' };
    }

    room.votes.set(socket.id, targetPlayerId);
    this.broadcastRoomState(room.code);

    // Check if all connected players voted
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
    
    // Calculate vote counts (only active players can be voted for)
    const tally: { [playerId: string]: number } = {};
    for (const p of activePlayers) {
      tally[p.id] = 0;
    }

    for (const [voterId, targetId] of room.votes.entries()) {
      // Validate voter is still connected
      const voter = room.players.get(voterId);
      if (voter && voter.isConnected && tally[targetId] !== undefined) {
        tally[targetId] += 1;
      }
    }

    let maxVotes = -1;
    let candidates: string[] = [];

    // Determine candidate list based on voting phase restrictions
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

    // Handle ties
    if (candidates.length > 1) {
      // Tie Break Logic
      if (room.tieBreakIteration === 0) {
        // Trigger Tie Break Voting Phase
        room.tieBreakCandidates = candidates;
        room.tieBreakIteration = 1;
        this.io.to(room.code).emit('tie-break-triggered', { candidates });
        this.startVotingPhase(room, 'TIE_BREAK_VOTING');
        return;
      } else {
        // If still tied on tie break, pick random among candidates to prevent endless loops
        const randomElim = candidates[Math.floor(Math.random() * candidates.length)];
        this.eliminatePlayer(room, randomElim);
      }
    } else if (candidates.length === 1) {
      this.eliminatePlayer(room, candidates[0]);
    } else {
      // No votes cast -> pick random among all active players
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
    this.broadcastRoomState(room.code);
  }

  public playAgain(socket: Socket, roomCode: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    const player = room.players.get(socket.id);
    if (!player || !player.isHost) return { success: false, message: 'Only the host can reset the lobby.' };

    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = 'LOBBY';
    room.currentRound = 1;
    room.timerSeconds = 0;
    room.clues = [];
    room.votes.clear();
    room.eliminatedPlayerId = undefined;
    room.winner = undefined;
    room.civilianWord = '';
    room.imposterWord = '';
    room.imposterId = '';
    room.tieBreakCandidates = [];
    room.tieBreakIteration = 0;
    room.isPaused = false;
    room.chatHistory = [];

    // Reset player configurations, clear roles, set non-hosts isReady = false (must mark ready again)
    for (const p of room.players.values()) {
      p.isImposter = false;
      p.secretWord = '';
      p.isReady = p.isHost; // Host is automatically ready
    }

    this.broadcastRoomState(room.code);
    return { success: true };
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

    // Build vote counts dictionary
    const voteCounts: { [playerId: string]: number } = {};
    for (const targetId of room.votes.values()) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
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
        hasReadyToVote: room.readyToVote.has(p.id),
      })),
      clues: room.clues,
      settings: room.settings,
      isPaused: room.isPaused,
      tieBreakCandidates: room.tieBreakCandidates,
      chatHistory: room.chatHistory,
      activeWriterId: room.clueOrder[room.activeWriterIndex],
      clueOrder: room.clueOrder,
      voteCounts: room.phase === 'GAME_OVER' ? voteCounts : undefined,
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
