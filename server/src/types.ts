export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'ROUND_1'
  | 'CLUES_REVEAL_1'
  | 'DISCUSSION_1'
  | 'ROUND_2'
  | 'CLUES_REVEAL_2'
  | 'DISCUSSION_2'
  | 'VOTING'
  | 'TIE_BREAK_VOTING'
  | 'VOTE_RESULTS'
  | 'GAME_OVER';

export interface GameSettings {
  category: string;
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard';
  roundTimer: number; // in seconds
  discussionTimer: number; // in seconds
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isImposter: boolean;
  secretWord: string;
  isConnected: boolean;
  isReady: boolean;
  voteForId?: string;
}

export interface ClueSubmission {
  playerId: string;
  playerName: string;
  round: 1 | 2;
  clue: string;
}

export interface WordPair {
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  civilian: string;
  imposter: string;
}

export interface PlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  isReady: boolean;
  hasSubmittedClue?: boolean;
  hasVoted?: boolean;
}

export interface RoomPublicState {
  code: string;
  phase: GamePhase;
  currentRound: number;
  timerSeconds: number;
  players: PlayerPublic[];
  clues: ClueSubmission[];
  settings: GameSettings;
  isPaused: boolean;
  tieBreakCandidates: string[];
  voteCounts?: { [playerId: string]: number };
  eliminatedPlayer?: { id: string; name: string; isImposter: boolean };
  winner?: 'CIVILIANS' | 'IMPOSTER';
  civilianWord?: string;
  imposterWord?: string;
  imposterName?: string;
}

export interface PersonalRolePayload {
  role: 'CIVILIAN' | 'IMPOSTER';
  secretWord: string;
}
