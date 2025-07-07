// 🐺 LOBISOMEM ONLINE - Tipos Centralizados (REFATORADO + NOVOS TIPOS)
import type WebSocket from 'ws';

// =============================================================================
// IMPORT ENUMS FROM CONSTANTS (ÚNICA FONTE)
// =============================================================================
export { Role, Faction, GamePhase } from '@/utils/constants';
import { Role, Faction, GamePhase } from '@/utils/constants';

// =============================================================================
// API & HTTP
// =============================================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// =============================================================================
// JWT & AUTENTICAÇÃO
// =============================================================================
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  avatar?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

// =============================================================================
// WEBSOCKET & CONEXÃO
// =============================================================================
export interface ConnectionContext {
  userId: string;
  username: string;
  serverId: string;
  isSpectator: boolean;
  roomId?: string;
}

export interface ConnectionMetadata {
  connectedAt: Date;
  userAgent?: string;
  ip?: string;
  origin?: string;
}

export interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  context: ConnectionContext;
  metadata: ConnectionMetadata;
  isAlive: boolean;
  lastPing: number;
  reconnectAttempts: number;
}

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  data?: any;
  messageId?: string;
}

export interface URLParseResult {
  isValid: boolean;
  path: string;
  roomId?: string;
  serverId?: string;
}

export interface MessageValidationResult {
  isValid: boolean;
  message?: WebSocketMessage;
  error?: string;
}

// ✅ ATUALIZADO: Adicionados novos códigos de erro
export type WebSocketErrorCode =
  | 'INVALID_TOKEN' | 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'NOT_IN_ROOM'
  | 'NOT_HOST' | 'GAME_ALREADY_STARTED' | 'INVALID_ACTION'
  | 'PLAYER_NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_MESSAGE'
  | 'UNKNOWN_MESSAGE_TYPE' | 'HANDLER_ERROR' | 'MISSING_ROOM_ID'
  | 'JOIN_ROOM_FAILED' | 'LEAVE_ROOM_FAILED' | 'READY_UPDATE_FAILED'
  | 'START_GAME_FAILED' | 'KICK_PLAYER_FAILED' | 'NOT_IMPLEMENTED'
  | 'DELETE_ROOM_FAILED' | 'CHAT_FAILED'; // ✅ NOVOS

// =============================================================================
// GAME TYPES (COMPATÍVEIS COM CLASSES REAIS)
// =============================================================================
export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';
export type GameStatus = 'WAITING' | 'STARTING' | 'PLAYING' | 'FINISHED' | 'CANCELLED';

export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
  maxSpectators: number;
  status: RoomStatus;
  hostId: string;
  hostUsername: string;
  currentPlayers: number;
  currentSpectators: number;
  createdAt: Date;
  updatedAt: Date;
  code?: string;
  serverId?: string;
}

export interface GameConfig {
  roomId: string;
  maxPlayers: number;
  maxSpectators: number;
  nightDuration: number; // milliseconds
  dayDuration: number; // milliseconds
  votingDuration: number; // milliseconds
  allowReconnection: boolean;
  reconnectionTimeout: number; // milliseconds
}

// =============================================================================
// PLAYER INTERFACE (COMPATÍVEL COM CLASSE Player)
// =============================================================================
export interface Player {
  id: string;
  userId: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  joinedAt: Date;
  lastSeen: Date;
  avatar?: string;

  // Game-specific properties
  role?: Role;
  faction?: Faction;
  isAlive?: boolean;
  isProtected?: boolean;
  hasActed?: boolean;
  hasVoted?: boolean;
  votedFor?: string;
  actionsUsed?: number;
  maxActions?: number;
  lastAction?: string;
  eliminationReason?: 'NIGHT_KILL' | 'EXECUTION' | 'VIGILANTE' | 'SERIAL_KILLER';
  killedBy?: string;
}

// =============================================================================
// GAME STATE INTERFACE (COMPATÍVEL COM CLASSE GameState)
// ✅ MUDANÇA CHAVE: Usar estruturas que a classe realmente usa
// =============================================================================
export interface GameState {
  gameId: string;
  roomId: string;
  status: GameStatus;
  phase: GamePhase;
  day: number;
  phaseStartTime: Date;
  phaseEndTime: Date;
  timeLeft: number;

  // ✅ IMPORTANTE: Compatível com a classe real que usa Map
  players: Player[]; // Para serialização JSON
  spectators: string[]; // IDs dos espectadores  
  eliminatedPlayers: Player[];

  hostId: string;
  events: GameEvent[];
  votes: Record<string, string>; // Para serialização JSON - voterId -> targetId
  nightActions: NightAction[];
  config: GameConfig;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  winningFaction?: Faction;
  winningPlayers?: string[];
}

export interface GameEvent {
  id: string;
  type: string;
  phase: GamePhase;
  day: number;
  timestamp: Date;
  data: any;
  visibleTo?: string[]; // If undefined, visible to all
}

export interface NightAction {
  playerId: string;
  type: string;
  targetId?: string;
  data?: any;
  priority: number;
}

// =============================================================================
// ✅ CHAT TYPES (MELHORADOS)
// =============================================================================
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  channel: 'public' | 'werewolf' | 'spectator' | 'system' | 'dead';
  timestamp: string;
  filtered?: boolean;

  // ✅ ADICIONADO: Metadata para chat
  isWhisper?: boolean;
  targetUserId?: string;
  edited?: boolean;
  editedAt?: string;
}

// =============================================================================
// GAME ENGINE INTERFACES
// =============================================================================
export interface IGameEngine {
  // Game lifecycle
  createGame(hostId: string, config: GameConfig): Promise<GameState>;
  startGame(gameId: string): Promise<boolean>;
  endGame(gameId: string, reason?: string): Promise<void>;

  // Player management
  addPlayer(gameId: string, player: Player): Promise<boolean>;
  removePlayer(gameId: string, playerId: string): Promise<boolean>;

  // Game state
  getGameState(gameId: string): Promise<GameState | null>;
  updateGameState(gameId: string, updates: Partial<GameState>): Promise<void>;

  // Actions
  performPlayerAction(gameId: string, playerId: string, action: any): Promise<boolean>;

  // Phase management
  nextPhase(gameId: string): Promise<void>;

  // Events
  onGameEvent(gameId: string, event: string, handler: (data: any) => void): void;

  // Voting
  castVote?(gameId: string, voterId: string, targetId: string): Promise<boolean>;
  removeVote?(gameId: string, voterId: string): Promise<boolean>;

  // Administrative
  getActiveGamesCount?(): number;
  getAllGames?(): GameState[];
  getGamesByRoom?(roomId: string): Promise<GameState[]>;
  forceEndGame?(gameId: string, reason: string): Promise<boolean>;
  getGameStats?(gameId: string): any;
  cleanup?(): Promise<void>;
}

// =============================================================================
// ROLE SYSTEM TYPES (IMPORTADOS DE RoleSystem.ts)
// =============================================================================
export interface RoleConfiguration {
  role: Role;
  faction: Faction;
  name: string;
  description: string;
  abilities: string[];
  goalDescription: string;
  canAct: boolean;
  actsDuring: string[];
  hasNightChat: boolean;
  immuneToInvestigation: boolean;
  maxActions?: number;
  priority: number;
}

export type RoleDistribution = Record<Role, number>;

// =============================================================================
// ACTION SYSTEM TYPES
// =============================================================================
export interface GameAction {
  id: string;
  playerId: string;
  type: string;
  targetId?: string;
  data?: any;
  timestamp: Date;
  phase: string;
  day: number;
  priority: number;
  isValid: boolean;
  processed: boolean;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  message?: string;
  data?: any;
  errors?: string[];
}

// =============================================================================
// TIMER SYSTEM TYPES
// =============================================================================
export interface GameTimer {
  id: string;
  type: 'PHASE' | 'WARNING' | 'CUSTOM';
  startTime: number;
  duration: number;
  remaining: number;
  isActive: boolean;
  callback?: () => void;
  timeout?: NodeJS.Timeout; // ✅ Nome correto
}

// =============================================================================
// SERVICE INTERFACES (CORRIGIDOS)
// =============================================================================
export interface ServiceMetadata {
  id: string;
  type: 'lobby' | 'game' | 'chat' | 'monolith';
  host: string;
  port: number;
  capabilities: string[];
  status: 'healthy' | 'unhealthy';
  lastHeartbeat: Date;
  maxRooms?: number;
  currentRooms?: number;
}

export interface IEventBus {
  publish<T>(channel: string, event: T): Promise<void>;
  subscribe<T>(channel: string, handler: (event: T) => void): Promise<void>;
  unsubscribe(channel: string, handler?: Function): Promise<void>;
  healthCheck?(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }>;
}

export interface IServiceRegistry {
  registerService(serviceId: string, metadata: ServiceMetadata): Promise<void>;
  getAvailableServices(serviceType: string): Promise<string[]>;
  unregisterService(serviceId: string): Promise<void>;
  getServiceMetadata(serviceId: string): Promise<ServiceMetadata | null>;
  healthCheck?(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }>;
}

// ✅ INTERFACE CORRIGIDA - Agora retorna GameState em vez de Game inexistente
export interface IGameStateService {
  createGame(hostId: string, config: GameConfig): Promise<GameState>;
  getGame(gameId: string): Promise<GameState | null>;
  updateGameState(gameId: string, updates: Partial<GameState>): Promise<void>;
  deleteGame(gameId: string): Promise<void>;
  addPlayer(gameId: string, player: Player): Promise<void>;
  removePlayer(gameId: string, playerId: string): Promise<void>;
  updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void>;
  getGameState(gameId: string): Promise<GameState | null>;
  getPlayer(gameId: string, playerId: string): Promise<Player | null>;
  getAllPlayers(gameId: string): Promise<Player[]>;
  getGamesByRoom(roomId: string): Promise<GameState[]>;
  getActiveGamesCount(): Promise<number>;
  cleanup?(): number;
  healthCheck?(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }>;
}

// =============================================================================
// WIN CONDITION TYPES
// =============================================================================
export interface WinCondition {
  hasWinner: boolean;
  winningFaction?: Faction;
  winningPlayers?: string[];
  reason?: string;
}

// =============================================================================
// GAME STATISTICS TYPES
// =============================================================================
export interface GameStats {
  gameId: string;
  status: GameStatus;
  phase: GamePhase;
  day: number;
  playerCount: number;
  aliveCount: number;
  spectatorCount: number;
  timeLeft: number;
  events: number;
}

export interface GameResults {
  gameId: string;
  roomId: string;
  duration: number;
  totalDays: number;
  winningFaction?: Faction;
  winningPlayers: string[];
  players: PlayerResult[];
  events: GameEvent[];
}

export interface PlayerResult {
  id: string;
  userId: string;
  username: string;
  role?: Role;
  faction?: Faction;
  survived: boolean;
  won: boolean;
  eliminationReason?: string;
  killedBy?: string;
}

// =============================================================================
// PHASE MANAGER TYPES
// =============================================================================
export interface PhaseTransition {
  from: GamePhase;
  to: GamePhase;
  duration: number;
  reason?: string;
}

export interface NightResults {
  protections: string[];
  investigations: Array<{
    investigatorId: string;
    targetId: string;
    result: 'SUSPICIOUS' | 'NOT_SUSPICIOUS';
  }>;
  attacks: Array<{
    attackerId: string;
    targetId: string;
    successful: boolean;
  }>;
  deaths: Array<{
    playerId: string;
    cause: string;
    killedBy?: string;
  }>;
}

// =============================================================================
// ✅ WEBSOCKET EVENT TYPES (ATUALIZADOS)
// =============================================================================
export interface GameWebSocketEvents {
  // Game lifecycle events
  'game:created': { gameId: string; hostId: string; config: GameConfig };
  'game:started': { gameId: string; players: Player[]; distribution: RoleDistribution };
  'game:ended': { gameId: string; results: GameResults };

  // Phase events
  'phase:changed': { gameId: string; phase: GamePhase; duration: number; timeLeft: number };
  'phase:warning': { gameId: string; phase: GamePhase; timeLeft: number };

  // Player events
  'player:joined': { gameId: string; player: Player };
  'player:left': { gameId: string; playerId: string; username: string };
  'player:died': { gameId: string; playerId: string; role: Role; cause: string };
  'player:executed': { gameId: string; playerId: string; role: Role; votes: number };

  // Action events
  'action:submitted': { gameId: string; playerId: string; actionType: string };
  'action:result': { gameId: string; playerId: string; result: ActionResult };

  // Voting events
  'vote:cast': { gameId: string; voterId: string; targetId: string; voteCounts: Record<string, number> };
  'vote:removed': { gameId: string; voterId: string; voteCounts: Record<string, number> };

  // ✅ NOVOS: Room events
  'room:deleted': { roomId: string; reason: string; timestamp: string };
  'room:player-joined': { roomId: string; userId: string; username: string; asSpectator: boolean; timestamp: string };
  'room:player-left': { roomId: string; userId: string; username: string; timestamp: string };
  'room:player-ready': { roomId: string; userId: string; username: string; ready: boolean; timestamp: string };
  'room:game-started': { roomId: string; hostId: string; timestamp: string };
}

// =============================================================================
// ✅ WEBSOCKET MESSAGE TYPES (ATUALIZADOS)
// =============================================================================
export interface ClientToServerEvents {
  // Room events
  'join-room': { roomId: string; asSpectator?: boolean };
  'leave-room': { roomId?: string };
  'delete-room': { roomId?: string }; // ✅ NOVO
  'player-ready': { ready: boolean };
  'start-game': {};

  // Game actions
  'game-action': { type: string; targetId?: string; data?: any };
  'vote': { targetId: string };
  'unvote': {};

  // Chat events
  'chat-message': { message: string; channel?: string };

  // Werewolf coordination
  'werewolf-kill-vote': { targetId: string };

  // Admin events
  'kick-player': { playerId: string };
  'force-phase': {};
  'extend-time': { additionalTime: number };
}

export interface ServerToClientEvents {
  // Connection events
  'connected': { userId: string };
  'error': { code: WebSocketErrorCode; message: string };

  // Room events
  'room-joined': { room: Room; player: Player; yourRole: string };
  'room-left': { roomId: string };
  'room-deleted': { roomId: string; reason: string; timestamp: string }; // ✅ NOVO
  'player-joined': { player: Player };
  'player-left': { userId: string; username: string };
  'player-ready': { userId: string; username: string; ready: boolean };

  // Game events
  'game-starting': { countdown: number };
  'game-started': { gameId: string; players: Player[]; spectators: Player[] };
  'game-state': GameState;
  'game-ended': { results: GameResults };

  // Phase events
  'phase-changed': { phase: GamePhase; timeLeft: number; day: number };
  'phase-warning': { timeLeft: number };

  // Action events
  'action-confirmed': { actionType: string; message: string };
  'action-failed': { actionType: string; error: string };

  // Voting events
  'voting-update': { votes: Record<string, string>; counts: Record<string, number> };
  'execution-result': { executedId?: string; executedName?: string; executedRole?: Role };

  // Night events
  'night-results': { deaths: any[]; messages: string[] };
  'investigation-result': { targetName: string; result: 'SUSPICIOUS' | 'NOT_SUSPICIOUS' };

  // Chat events
  'chat-message': { userId: string; username: string; message: string; channel: string; timestamp: string };

  // Role-specific events
  'role-assigned': { role: Role; faction: Faction; abilities: string[] };
  'werewolf-chat': { senderId: string; senderName: string; message: string };
}

// =============================================================================
// ✅ UI TYPES - EXPANDIDOS
// =============================================================================
export interface ThemeConfig {
  isDark: boolean;
  currentPhase: GamePhase;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;

  // ✅ ADICIONADO: Configurações visuais
  animationsEnabled: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  colorBlindMode: boolean;
}

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };

  // ✅ ADICIONADO: Notificação avançada
  sound?: boolean;
  icon?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// =============================================================================
// ✅ API RESPONSE TYPES - MELHORADOS
// =============================================================================
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

  // ✅ ADICIONADO: Filtros aplicados
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
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
    country?: string;
  };
  points: number;
  totalGames: number;
  winRate: number;
  favoriteRole?: Role;

  // ✅ ADICIONADO: Estatísticas extras
  currentStreak: number;
  longestStreak: number;
  lastGameAt?: string;
}

// =============================================================================
// ✅ STATISTICS TYPES - EXPANDIDOS
// =============================================================================
export interface UserStatistics {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  level: number;
  favoriteRole?: Role;
  longestWinStreak: number;
  currentStreak: number;
  roleStats: RoleStatistics[];
  recentGames: GameSummary[];

  // ✅ ADICIONADO: Estatísticas avançadas
  averageGameDuration: number;
  survivalRate: number;
  eliminationRate: number;
  mvpCount: number;
  perfectGames: number;
  comebackWins: number;
}

export interface RoleStatistics {
  role: Role;
  gamesPlayed: number;
  wins: number;
  winRate: number;

  // ✅ ADICIONADO: Stats específicos por role
  averageSurvivalTime: number;
  successfulActions: number;
  totalActions: number;
  mvpCount: number;
}

export interface GameSummary {
  gameId: string;
  role: Role;
  faction: Faction;
  won: boolean;
  survived: boolean;
  playedAt: string;
  duration: number;

  // ✅ ADICIONADO: Detalhes do jogo
  totalPlayers: number;
  daysSurvived: number;
  actionsPerformed: number;
  mvp: boolean;
  eliminatedBy?: string;
  finalPosition: number;
}

// =============================================================================
// ✅ COMPONENT PROP TYPES - MELHORADOS
// =============================================================================
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'medieval' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';

  // ✅ ADICIONADO: Props extras
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  tooltip?: string;
  ariaLabel?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;

  // ✅ ADICIONADO: Props extras
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'medieval' | 'dark' | 'error' | 'warning'; // ✅ ATUALIZADO
  showCloseButton?: boolean;
  preventScroll?: boolean;
  zIndex?: number;
}

// =============================================================================
// ✅ FORM TYPES - EXPANDIDOS
// =============================================================================
export interface FormError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormError[];
  warnings?: FormError[];
}

// ✅ ADICIONADO: Tipos para formulários complexos
export interface FormField<T = any> {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea';
  value: T;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: (value: T) => ValidationResult;
}

export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// =============================================================================
// ✅ ROOM SETTINGS TYPES
// =============================================================================
export interface RoomSettings {
  gameMode: 'CLASSIC' | 'RANKED' | 'CUSTOM';
  timeDay: number; // segundos
  timeNight: number; // segundos
  timeVoting: number; // segundos
  allowSpectators: boolean;
  autoStart: boolean;
  customRoles?: Role[];
  bannedPlayers?: string[];
}

// =============================================================================
// ✅ UTILITY TYPES
// =============================================================================
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// =============================================================================
// ✅ BRAND TYPES FOR TYPE SAFETY
// =============================================================================
export type UserId = string & { readonly __brand: unique symbol };
export type RoomId = string & { readonly __brand: unique symbol };
export type GameId = string & { readonly __brand: unique symbol };
export type SessionId = string & { readonly __brand: unique symbol };
export type TokenId = string & { readonly __brand: unique symbol };

// =============================================================================
// ✅ ENVIRONMENT TYPES
// =============================================================================
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_URL: string;
  WS_URL: string;
  VERSION: string;
  BUILD_TIME: string;
  SENTRY_DSN?: string;
  ANALYTICS_ID?: string;
}

// =============================================================================
// ✅ FEATURE FLAGS
// =============================================================================
export interface FeatureFlags {
  enableNewLobby: boolean;
  enableVoiceChat: boolean;
  enableRankedMode: boolean;
  enableCustomRoles: boolean;
  enableSpectatorMode: boolean;
  enableReplaySystem: boolean;
  enableAchievements: boolean;
  enableDarkMode: boolean;
  enableBetaFeatures: boolean;
}

// =============================================================================
// ✅ EXPORT HELPERS
// =============================================================================

// Type guards
export function isUser(obj: any): obj is Player {
  return obj && typeof obj.id === 'string' && typeof obj.username === 'string';
}

export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return obj && typeof obj.success === 'boolean' && typeof obj.timestamp === 'string';
}

export function isWebSocketMessage(obj: any): obj is WebSocketMessage {
  return obj && typeof obj.type === 'string';
}

// Utility functions for types
export function createUserId(id: string): UserId {
  return id as UserId;
}

export function createRoomId(id: string): RoomId {
  return id as RoomId;
}

export function createGameId(id: string): GameId {
  return id as GameId;
}

// ✅ DEFAULT VALUES (ATUALIZADOS)
export const DEFAULT_USER_STATS: UserStatistics = {
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  level: 1,
  longestWinStreak: 0,
  currentStreak: 0,
  roleStats: [],
  recentGames: [],
  averageGameDuration: 0,
  survivalRate: 0,
  eliminationRate: 0,
  mvpCount: 0,
  perfectGames: 0,
  comebackWins: 0,
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  isDark: true,
  currentPhase: GamePhase.LOBBY,
  soundEnabled: true,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  animationsEnabled: true,
  highContrast: false,
  fontSize: 'medium',
  colorBlindMode: false,
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  gameMode: 'CLASSIC',
  timeDay: 300, // 5 minutos
  timeNight: 120, // 2 minutos
  timeVoting: 60, // 1 minuto
  allowSpectators: true,
  autoStart: false,
  customRoles: [],
  bannedPlayers: [],
};