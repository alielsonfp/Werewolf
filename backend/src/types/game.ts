// 🐺 LOBISOMEM ONLINE - Game Types
// Type definitions for game-related functionality

//====================================================================
// GAME ENUMS
//====================================================================
export enum GameStatus {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  NIGHT = 'NIGHT',
  DAY = 'DAY',
  VOTING = 'VOTING',
  ENDED = 'ENDED',
}

export enum Role {
  // Town roles
  VILLAGER = 'VILLAGER',
  SHERIFF = 'SHERIFF',
  DOCTOR = 'DOCTOR',
  VIGILANTE = 'VIGILANTE',
  // Werewolf roles
  WEREWOLF = 'WEREWOLF',
  WEREWOLF_KING = 'WEREWOLF_KING',
  // Neutral roles
  JESTER = 'JESTER',
  SERIAL_KILLER = 'SERIAL_KILLER',
}

export enum Faction {
  TOWN = 'TOWN',
  WEREWOLF = 'WEREWOLF',
  NEUTRAL = 'NEUTRAL',
}

export enum ActionType {
  INVESTIGATE = 'INVESTIGATE',
  PROTECT = 'PROTECT',
  KILL = 'KILL',
  VOTE = 'VOTE',
}

//====================================================================
// GAME CONFIGURATION
//====================================================================
export interface GameConfig {
  minPlayers: number;
  maxPlayers: number;
  maxSpectators: number;
  nightDuration: number; // milliseconds
  dayDuration: number; // milliseconds
  votingDuration: number; // milliseconds
  roleDistribution: RoleDistribution;
  allowSpectators: boolean;
  randomizeNicknames: boolean;
}

export interface RoleDistribution {
  [Role.VILLAGER]: number;
  [Role.SHERIFF]: number;
  [Role.DOCTOR]: number;
  [Role.VIGILANTE]: number;
  [Role.WEREWOLF]: number;
  [Role.WEREWOLF_KING]: number;
  [Role.JESTER]: number;
  [Role.SERIAL_KILLER]: number;
}

//====================================================================
// PLAYER STATE
//====================================================================
export interface Player {
  id: string;
  userId: string;
  username: string;
  nickname?: string; // Temático (ex: "João Ferreiro")
  avatar?: string;
  role?: Role;
  faction?: Faction;
  isAlive: boolean;
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;

  // Game state
  votedFor?: string; // Player ID
  votesReceived: number;
  hasActed: boolean; // Used current phase action

  // Role-specific state
  roleData: Record<string, any>;

  // Connection state
  isConnected: boolean;
  lastSeen: Date;
  reconnectAttempts: number;
}

//====================================================================
// GAME STATE
//====================================================================
export interface GameState {
  gameId: string;
  roomId: string;
  status: GameStatus;
  phase: GamePhase;

  // Players
  players: Player[];
  spectators: Player[];
  hostId: string;

  // Game progress
  currentDay: number;
  timeLeft: number; // milliseconds remaining in current phase

  // Events and history
  events: GameEvent[];
  eliminatedPlayers: EliminatedPlayer[];

  // Winners (when game ends)
  winners?: {
    faction: Faction;
    players: string[]; // Player IDs
  };

  // Configuration
  config: GameConfig;

  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

//====================================================================
// GAME EVENTS
//====================================================================
export interface GameEvent {
  id: string;
  type: GameEventType;
  phase: GamePhase;
  day: number;
  data: Record<string, any>;
  timestamp: Date;
  visible: boolean; // Whether event is visible to players
}

export enum GameEventType {
  GAME_STARTED = 'GAME_STARTED',
  PHASE_CHANGED = 'PHASE_CHANGED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_DIED = 'PLAYER_DIED',
  PLAYER_VOTED = 'PLAYER_VOTED',
  PLAYER_EXECUTED = 'PLAYER_EXECUTED',
  ACTION_PERFORMED = 'ACTION_PERFORMED',
  GAME_ENDED = 'GAME_ENDED',
}

export interface EliminatedPlayer {
  playerId: string;
  username: string;
  role: Role;
  faction: Faction;
  eliminatedBy: 'VOTE' | 'WEREWOLF' | 'VIGILANTE' | 'SERIAL_KILLER';
  day: number;
  phase: GamePhase;
  timestamp: Date;
}

//====================================================================
// ACTIONS
//====================================================================
export interface GameAction {
  id: string;
  playerId: string;
  type: ActionType;
  targetId?: string; // Target player ID
  data?: Record<string, any>;
  phase: GamePhase;
  day: number;
  timestamp: Date;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  effects?: ActionEffect[];
}

export interface ActionEffect {
  type: 'PROTECT' | 'INVESTIGATE' | 'KILL' | 'BLOCK';
  targetId: string;
  data?: Record<string, any>;
}

//====================================================================
// VOTING
//====================================================================
export interface Vote {
  voterId: string;
  targetId: string;
  timestamp: Date;
}

export interface VotingResult {
  eliminated?: {
    playerId: string;
    username: string;
    role: Role;
    voteCount: number;
  };
  votes: VoteCount[];
  isTie: boolean;
}

export interface VoteCount {
  playerId: string;
  username: string;
  votes: number;
  voters: string[]; // Voter IDs
}

//====================================================================
// ROLE DEFINITIONS
//====================================================================
export interface RoleDefinition {
  role: Role;
  faction: Faction;
  name: string;
  description: string;
  abilities: string[];
  goalDescription: string;

  // Game mechanics
  canAct: boolean;
  actsDuring: GamePhase[];
  hasNightChat: boolean; // Can chat during night (werewolves)
  immuneToInvestigation: boolean; // Werewolf King

  // Action limits
  maxActions?: number; // Vigilante has 3 kills
  cooldown?: number; // Actions per game/phase
}

//====================================================================
// WIN CONDITIONS
//====================================================================
export interface WinCondition {
  faction: Faction;
  condition: WinConditionType;
  achieved: boolean;
  players: string[]; // Player IDs of winners
}

export enum WinConditionType {
  TOWN_WINS = 'TOWN_WINS', // All werewolves eliminated
  WEREWOLF_WINS = 'WEREWOLF_WINS', // Werewolves >= town
  JESTER_WINS = 'JESTER_WINS', // Jester executed by vote
  SERIAL_KILLER_WINS = 'SERIAL_KILLER_WINS', // Last player standing
}

//====================================================================
// GAME CREATION & MANAGEMENT
//====================================================================
export interface CreateGameRequest {
  roomId: string;
  config?: Partial<GameConfig>;
}

export interface JoinGameRequest {
  gameId: string;
  asSpectator?: boolean;
}

export interface GameActionRequest {
  type: ActionType;
  targetId?: string;
  data?: Record<string, any>;
}