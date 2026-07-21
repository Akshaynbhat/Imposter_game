import { Server, Socket } from 'socket.io';
import { GamePhase, Player, RoomPublicState, PersonalRolePayload, WordPair } from './types.js';
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
  civilianWord: string;
  imposterWord: string;
  imposterId: string;
  clues: { playerId: string; playerName: string; round: 1 | 2; clue: string }[];
  votes: Map<string, string>; // voterId -> targetId
  eliminatedPlayerId?: string;
  winner?: 'CIVILIANS' | 'IMPOSTER';
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
      name: playerName.trim() || 'Player 1',
      isHost: true,
      isImposter: false,
      secretWord: '',
      isConnected: true,
    };

    const room: Room = {
      code,
      phase: 'LOBBY',
      currentRound: 1,
      timerSeconds: 0,
      timerInterval: null,
      players: new Map([[socket.id, player]]),
      sessionToSocketMap: new Map([[sessionId, socket.id]]),
      civilianWord: '',
      imposterWord: '',
      imposterId: '',
      clues: [],
      votes: new Map(),
    };

    this.rooms.set(code, room);
    socket.join(code);

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
    };

    room.players.set(socket.id, player);
    room.sessionToSocketMap.set(sessionId, socket.id);
    socket.join(code);

    this.broadcastRoomState(code);
    return { success: true, player };
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

    socket.join(code);

    // Send secret word to reconnected player if game in progress
    if (room.phase !== 'LOBBY' && existingPlayer.secretWord) {
      socket.emit('assign-role', {
        role: existingPlayer.isImposter ? 'IMPOSTER' : 'CIVILIAN',
        secretWord: existingPlayer.secretWord,
      } as PersonalRolePayload);
    }

    this.broadcastRoomState(code);
    return true;
  }

  public handleDisconnect(socket: Socket) {
    for (const [code, room] of this.rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id)!;
        player.isConnected = false;

        // Check if host disconnected
        if (player.isHost) {
          player.isHost = false;
          // Find next active player to transfer host
          const nextHost = Array.from(room.players.values()).find((p) => p.isConnected);
          if (nextHost) {
            nextHost.isHost = true;
          }
        }

        // If all players disconnected, clean up room
        const activePlayersCount = Array.from(room.players.values()).filter((p) => p.isConnected).length;
        if (activePlayersCount === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          this.rooms.delete(code);
          return;
        }

        this.broadcastRoomState(code);
      }
    }
  }

  public startGame(socket: Socket, roomCode: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found.' };

    const player = room.players.get(socket.id);
    if (!player || !player.isHost) return { success: false, message: 'Only the host can start the game.' };

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    if (connectedPlayers.length < 3) {
      return { success: false, message: 'Need at least 3 connected players to start!' };
    }

    // Pick random word pair
    const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    room.civilianWord = pair.civilian;
    room.imposterWord = pair.imposter;

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

    // Reset clues & votes
    room.clues = [];
    room.votes.clear();
    room.eliminatedPlayerId = undefined;
    room.winner = undefined;

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
    room.timerSeconds = 15;

    this.broadcastRoomState(room.code);

    room.timerInterval = setInterval(() => {
      room.timerSeconds -= 1;
      this.broadcastRoomState(room.code);

      if (room.timerSeconds <= 0) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        this.handleRoundTimeout(room);
      }
    }, 1000);
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
      return { success: false, message: 'You have already submitted a clue for this round.' };
    }

    // Validate clue: strictly single word, no spaces
    const cleanClue = clueText.trim();
    if (cleanClue.includes(' ') || cleanClue.includes('\t') || cleanClue.includes('\n')) {
      return { success: false, message: 'Clue must be exactly ONE word with no spaces!' };
    }

    room.clues.push({
      playerId: player.id,
      playerName: player.name,
      round: room.currentRound as 1 | 2,
      clue: cleanClue || '-',
    });

    this.broadcastRoomState(room.code);

    // Check if all connected players submitted for this round
    const activePlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    const roundClues = room.clues.filter((c) => c.round === room.currentRound);

    if (roundClues.length >= activePlayers.length) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      this.advanceFromRound(room);
    }

    return { success: true };
  }

  private handleRoundTimeout(room: Room) {
    const activePlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    for (const player of activePlayers) {
      const existing = room.clues.find((c) => c.playerId === player.id && c.round === room.currentRound);
      if (!existing) {
        room.clues.push({
          playerId: player.id,
          playerName: player.name,
          round: room.currentRound as 1 | 2,
          clue: '-',
        });
      }
    }
    this.advanceFromRound(room);
  }

  private advanceFromRound(room: Room) {
    if (room.currentRound === 1) {
      this.startClueRevealPhase(room, 'CLUES_REVEAL_1', 2);
    } else {
      this.startClueRevealPhase(room, 'CLUES_REVEAL_2', 'VOTING');
    }
  }

  private startClueRevealPhase(room: Room, phase: 'CLUES_REVEAL_1' | 'CLUES_REVEAL_2', nextTarget: 2 | 'VOTING') {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = phase;
    room.timerSeconds = 5;
    this.broadcastRoomState(room.code);

    room.timerInterval = setInterval(() => {
      room.timerSeconds -= 1;
      this.broadcastRoomState(room.code);

      if (room.timerSeconds <= 0) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        if (nextTarget === 2) {
          this.startRound(room, 2);
        } else {
          this.startVotingPhase(room);
        }
      }
    }, 1000);
  }

  private startVotingPhase(room: Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.phase = 'VOTING';
    room.timerSeconds = 30;
    room.votes.clear();

    this.broadcastRoomState(room.code);

    room.timerInterval = setInterval(() => {
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

    if (room.phase !== 'VOTING') return { success: false, message: 'Voting phase is not active.' };

    if (socket.id === targetPlayerId) {
      return { success: false, message: 'You cannot vote for yourself!' };
    }

    if (!room.players.has(targetPlayerId)) {
      return { success: false, message: 'Target player not found in room.' };
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

    // Calculate vote counts
    const tally: { [playerId: string]: number } = {};
    for (const targetId of room.votes.values()) {
      tally[targetId] = (tally[targetId] || 0) + 1;
    }

    let maxVotes = 0;
    let candidates: string[] = [];

    for (const [playerId, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count;
        candidates = [playerId];
      } else if (count === maxVotes) {
        candidates.push(playerId);
      }
    }

    // Tie-breaker: pick randomly among candidates if tied or if no votes cast, pick random active player
    let eliminatedId: string;
    if (candidates.length > 0) {
      eliminatedId = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      const activePlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
      eliminatedId = activePlayers[Math.floor(Math.random() * activePlayers.length)].id;
    }

    room.eliminatedPlayerId = eliminatedId;
    const eliminatedPlayer = room.players.get(eliminatedId);

    if (eliminatedPlayer && eliminatedPlayer.isImposter) {
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
    if (!player || !player.isHost) return { success: false, message: 'Only the host can restart the game.' };

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

    for (const p of room.players.values()) {
      p.isImposter = false;
      p.secretWord = '';
    }

    this.broadcastRoomState(room.code);
    return { success: true };
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
        hasSubmittedClue: room.clues.some((c) => c.playerId === p.id && c.round === room.currentRound),
        hasVoted: room.votes.has(p.id),
      })),
      clues: room.clues,
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
