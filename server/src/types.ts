export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'ROUND_1'
  | 'CLUES_REVEAL_1'
  | 'ROUND_2'
  | 'CLUES_REVEAL_2'
  | 'VOTING'
  | 'VOTE_RESULTS'
  | 'GAME_OVER';

export interface Player {
  id: string; // Socket ID or Session ID
  name: string;
  isHost: boolean;
  isImposter: boolean;
  secretWord: string;
  isConnected: boolean;
  voteForId?: string;
}

export interface ClueSubmission {
  playerId: string;
  playerName: string;
  round: 1 | 2;
  clue: string;
}

export interface WordPair {
  civilian: string;
  imposter: string;
}

export interface RoomPublicState {
  code: string;
  phase: GamePhase;
  currentRound: number;
  timerSeconds: number;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    isConnected: boolean;
    hasSubmittedClue?: boolean;
    hasVoted?: boolean;
  }[];
  clues: ClueSubmission[];
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
