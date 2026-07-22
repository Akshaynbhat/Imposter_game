export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'CLUE_SUBMISSION'
  | 'ROUND_DECISION'
  | 'VOTING'
  | 'TIE_BREAK_VOTING'
  | 'GAME_OVER';

export type DecisionOption = 'PLAY_AGAIN' | 'GUESS_IMPOSTER';

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
  decisionVote?: DecisionOption;
}

export interface ClueSubmission {
  playerId: string;
  playerName: string;
  round: number;
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
  decisionVote?: DecisionOption;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
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
  chatHistory: ChatMessage[];
  activeWriterId?: string;
  clueOrder: string[];
  voteCounts?: { [playerId: string]: number };
  decisionVotesCount?: { PLAY_AGAIN: number; GUESS_IMPOSTER: number };
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
