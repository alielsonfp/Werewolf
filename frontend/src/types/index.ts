// 🐺 LOBISOMEM ONLINE - Frontend Types
// Baseado no Town of Salem

// =============================================================================
// ✅ USER & AUTHENTICATION - TIPOS COMPLETOS
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
  updatedAt?: string;
  lastLoginAt?: string;

  // ✅ ADICIONADO: Campos extras para o perfil
  bio?: string;
  country?: string;
  preferredLanguage?: string;
  timezone?: string;
  isVerified?: boolean;
  isBanned?: boolean;
  banReason?: string;
  banExpiresAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  acceptTerms?: boolean;
  newsletter?: boolean;
}

// ✅ CORRIGIDO: AuthResponse com estrutura consistente
export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    tokens: AuthTokens;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

// ✅ ADICIONADO: Tipos para verificação de disponibilidade
export interface AvailabilityCheckResponse {
  success: boolean;
  data?: {
    available: boolean;
    suggestions?: string[];
  };
  error?: string;
}

// ✅ ADICIONADO: Tipos para reset de senha
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
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

  // ✅ ADICIONADO: Campos extras para gameplay
  isProtected?: boolean;
  isJailed?: boolean;
  lastWill?: string;
  deathNote?: string;
  killedBy?: string;
  diedAt?: string;
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

  // ✅ ADICIONADO: Estado adicional do jogo
  phaseHistory: GamePhase[];
  eliminatedPlayers: Player[];
  nightActions: NightAction[];
  votingResults: VotingResult[];
}

export interface GameEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  visible: boolean;
  phase: GamePhase;
  day: number;

  // ✅ ADICIONADO: Contexto adicional
  playerId?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

// ✅ ADICIONADO: Tipos para ações noturnas
export interface NightAction {
  id: string;
  playerId: string;
  targetId?: string;
  action: string;
  timestamp: string;
  successful: boolean;
  blocked?: boolean;
  reason?: string;
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
  updatedAt?: string;

  // ✅ ADICIONADO: Configurações da sala
  settings: RoomSettings;
}

// ✅ ADICIONADO: Configurações detalhadas da sala
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

export interface CreateRoomRequest {
  name: string;
  isPrivate?: boolean;
  maxPlayers?: number;
  maxSpectators?: number;
  settings?: Partial<RoomSettings>;
}

// =============================================================================
// ✅ WEBSOCKET TYPES - MELHORADOS
// =============================================================================
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  messageId?: string;
  roomId?: string;
  userId?: string;
}

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

export enum SocketEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  AUTH = 'auth',

  // Room events
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  PLAYER_READY = 'player-ready',
  START_GAME = 'start-game',
  ROOM_UPDATED = 'room-updated',

  // Game events
  GAME_STATE = 'game-state',
  PHASE_CHANGE = 'phase-change',
  GAME_ACTION = 'game-action',
  VOTE = 'vote',
  NIGHT_ACTION = 'night-action',

  // Chat events
  CHAT_MESSAGE = 'chat-message',
  WHISPER = 'whisper',

  // System events
  PLAYER_JOINED = 'player-joined',
  PLAYER_LEFT = 'player-left',
  PLAYER_DISCONNECTED = 'player-disconnected',
  PLAYER_RECONNECTED = 'player-reconnected',
  GAME_STARTED = 'game-started',
  GAME_ENDED = 'game-ended',
  PLAYER_ELIMINATED = 'player-eliminated',
  SYSTEM_MESSAGE = 'system-message',
}

// =============================================================================
// VOTING TYPES
// =============================================================================
export interface Vote {
  voterId: string;
  targetId: string;
  timestamp: string;
  weight?: number; // Para roles especiais
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
  abstentions: number;
  totalVoters: number;
}

export interface VoteCount {
  playerId: string;
  username: string;
  votes: number;
  voters: string[];
  percentage: number;
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
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  statusCode?: number;

  // ✅ ADICIONADO: Metadata da resposta
  requestId?: string;
  version?: string;
  cached?: boolean;
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
  variant?: 'default' | 'medieval' | 'dark';
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
// ✅ AUDIO TYPES - EXPANDIDOS
// =============================================================================
export interface AudioConfig {
  musicVolume: number;
  sfxVolume: number;
  enabled: boolean;

  // ✅ ADICIONADO: Configurações avançadas
  muteOnBackground: boolean;
  spatialAudio: boolean;
  audioQuality: 'low' | 'medium' | 'high';
}

export interface SoundEffect {
  id: string;
  url: string;
  volume?: number;
  loop?: boolean;

  // ✅ ADICIONADO: Propriedades extras
  preload?: boolean;
  category: 'ui' | 'game' | 'ambient' | 'voice';
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  loop: boolean;
  volume: number;

  // ✅ ADICIONADO: Metadata da música
  artist?: string;
  duration?: number;
  genre?: string;
  mood?: 'calm' | 'tense' | 'action' | 'victory' | 'defeat';
}

// =============================================================================
// ✅ ACCESSIBILITY TYPES
// =============================================================================
export interface AccessibilityConfig {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  colorBlindFriendly: boolean;
}

// =============================================================================
// ✅ PERFORMANCE TYPES
// =============================================================================
export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  networkLatency: number;
  renderTime: number;
  jsHeapSize: number;
}

// =============================================================================
// ✅ ERROR HANDLING TYPES
// =============================================================================
export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
  timestamp: string;
  userId?: string;
  context?: Record<string, any>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// =============================================================================
// ✅ LOCALIZATION TYPES
// =============================================================================
export interface LocaleConfig {
  language: string;
  region: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currency: string;
}

export interface TranslationKey {
  key: string;
  defaultValue: string;
  interpolation?: Record<string, any>;
}

// =============================================================================
// ✅ ANALYTICS TYPES
// =============================================================================
export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  customData?: Record<string, any>;
  timestamp: string;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  pageViews: number;
  events: AnalyticsEvent[];
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
}

// =============================================================================
// ✅ SECURITY TYPES
// =============================================================================
export interface SecurityConfig {
  rateLimit: {
    requests: number;
    window: number; // milliseconds
  };
  csrf: {
    enabled: boolean;
    tokenName: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  isAdmin: boolean;
}

// =============================================================================
// ✅ FILE HANDLING TYPES
// =============================================================================
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export interface FileConfig {
  maxSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  compressionEnabled: boolean;
  compressionQuality: number;
}

// =============================================================================
// ✅ CACHE TYPES
// =============================================================================
export interface CacheConfig {
  ttl: number; // time to live in milliseconds
  maxSize: number; // maximum items in cache
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

// =============================================================================
// ✅ WEBHOOK TYPES
// =============================================================================
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  signature?: string;
  retryCount: number;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  retryAttempts: number;
  retryDelay: number;
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
export function isUser(obj: any): obj is User {
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

// Default values
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

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  enabled: true,
  muteOnBackground: true,
  spatialAudio: false,
  audioQuality: 'medium',
};

export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  screenReader: false,
  keyboardNavigation: true,
  colorBlindFriendly: false,
};

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

// Atualizar interface Room existente para incluir settings:
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
  updatedAt?: string;
  settings: RoomSettings; // ✅ NOVO CAMPO
}