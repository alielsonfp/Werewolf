// 🐺 LOBISOMEM ONLINE - Frontend Types
// Baseado no Town of Salem

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  level: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// =============================================================================
// GAME TYPES
// =============================================================================
export enum GamePhase {
  LOBBY = 'LOBBY',
  NIGHT = 'NIGHT',
  DAY = 'DAY',
  VOTING = 'VOTING',
  ENDED = 'ENDED',
}

export enum Role {
  VILLAGER = 'VILLAGER',
  SHERIFF = 'SHERIFF',
  DOCTOR = 'DOCTOR',
  VIGILANTE = 'VIGILANTE',
  WEREWOLF = 'WEREWOLF',
  WEREWOLF_KING = 'WEREWOLF_KING',
  JESTER = 'JESTER',
  SERIAL_KILLER = 'SERIAL_KILLER',
}

export enum Faction {
  TOWN = 'TOWN',
  WEREWOLF = 'WEREWOLF',
  NEUTRAL = 'NEUTRAL',
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  nickname?: string;
  avatar?: string;
  role?: Role;
  faction?: Faction;
  isAlive: boolean;
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  votedFor?: string;
  votesReceived: number;
  hasActed: boolean;
  houseNumber?: number; // Para Town of Salem visual
}

export interface GameState {
  gameId: string;
  roomId: string;
  phase: GamePhase;
  timeLeft: number;
  currentDay: number;
  players: Player[];
  spectators: Player[];
  events: GameEvent[];
  yourRole?: Role;
  yourFaction?: Faction;
  winners?: {
    faction: Faction;
    players: string[];
  };
}

export interface GameEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  visible: boolean;
  phase: GamePhase;
  day: number;
}

// =============================================================================
// ROOM TYPES
// =============================================================================
export interface Room {
  id: string;
  name: string;
  code?: string;
  isPrivate: boolean;
  maxPlayers: number;
  maxSpectators: number;
  currentPlayers: number;
  currentSpectators: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  hostId: string;
  hostUsername: string;
  canJoin: boolean;
  createdAt: string;
}

export interface CreateRoomRequest {
  name: string;
  isPrivate?: boolean;
  maxPlayers?: number;
  maxSpectators?: number;
}

// =============================================================================
// WEBSOCKET TYPES
// =============================================================================
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  messageId?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  channel: 'public' | 'werewolf' | 'spectator' | 'system';
  timestamp: string;
  filtered?: boolean;
}

export enum SocketEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Room events
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  PLAYER_READY = 'player-ready',
  START_GAME = 'start-game',

  // Game events
  GAME_STATE = 'game-state',
  PHASE_CHANGE = 'phase-change',
  GAME_ACTION = 'game-action',
  VOTE = 'vote',

  // Chat events
  CHAT_MESSAGE = 'chat-message',

  // System events
  PLAYER_JOINED = 'player-joined',
  PLAYER_LEFT = 'player-left',
  GAME_STARTED = 'game-started',
  GAME_ENDED = 'game-ended',
}

// =============================================================================
// VOTING TYPES
// =============================================================================
export interface Vote {
  voterId: string;
  targetId: string;
  timestamp: string;
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
  voters: string[];
}

// =============================================================================
// UI TYPES
// =============================================================================
export interface ThemeConfig {
  isDark: boolean;
  currentPhase: GamePhase;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// LEADERBOARD TYPES
// =============================================================================
export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatar?: string;
    level: number;
  };
  points: number;
  totalGames: number;
  winRate: number;
  favoriteRole?: Role;
}

// =============================================================================
// STATISTICS TYPES
// =============================================================================
export interface UserStatistics {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  level: number;
  favoriteRole?: Role;
  longestWinStreak: number;
  roleStats: RoleStatistics[];
  recentGames: GameSummary[];
}

export interface RoleStatistics {
  role: Role;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface GameSummary {
  gameId: string;
  role: Role;
  faction: Faction;
  won: boolean;
  survived: boolean;
  playedAt: string;
  duration: number;
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'medieval';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
}

// =============================================================================
// FORM TYPES
// =============================================================================
export interface FormError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormError[];
}

// =============================================================================
// AUDIO TYPES
// =============================================================================
export interface AudioConfig {
  musicVolume: number;
  sfxVolume: number;
  enabled: boolean;
}

export interface SoundEffect {
  id: string;
  url: string;
  volume?: number;
  loop?: boolean;
}