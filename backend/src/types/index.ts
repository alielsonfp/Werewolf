// 🐺 LOBISOMEM ONLINE - Tipos Centralizados (REFATORADO)
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

export type WebSocketErrorCode =
    | 'INVALID_TOKEN' | 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'NOT_IN_ROOM'
    | 'NOT_HOST' | 'GAME_ALREADY_STARTED' | 'INVALID_ACTION'
    | 'PLAYER_NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_MESSAGE'
    | 'UNKNOWN_MESSAGE_TYPE' | 'HANDLER_ERROR' | 'MISSING_ROOM_ID'
    | 'JOIN_ROOM_FAILED' | 'LEAVE_ROOM_FAILED' | 'READY_UPDATE_FAILED'
    | 'START_GAME_FAILED' | 'KICK_PLAYER_FAILED' | 'NOT_IMPLEMENTED';

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
// WEBSOCKET EVENT TYPES
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
}

// =============================================================================
// WEBSOCKET MESSAGE TYPES
// =============================================================================
export interface ClientToServerEvents {
    // Room events
    'join-room': { roomId: string; asSpectator?: boolean };
    'leave-room': { roomId?: string };
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