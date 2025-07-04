// 🐺 LOBISOMEM ONLINE - Tipos Centralizados e Definitivos
import type WebSocket from 'ws';

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
// MODELOS DE DOMÍNIO (SALA, JOGO, JOGADOR)
// =============================================================================
export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

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

export type GameStatus = 'WAITING' | 'STARTING' | 'PLAYING' | 'FINISHED' | 'CANCELLED';
export type GamePhase = 'LOBBY' | 'NIGHT' | 'DAY' | 'VOTING' | 'ENDED';

export interface Game {
    id: string;
    roomId: string;
    status: GameStatus;
    phase: GamePhase;
    players: Player[];
    spectators: Player[];
    gameConfig: GameConfig;
    createdAt: Date;
    updatedAt: Date;
}

export interface GameConfig {
    maxPlayers: number;
    maxSpectators: number;
    roomId?: string;
}

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
}

export interface GameState {
    gameId: string;
    roomId: string;
    status: GameStatus;
    phase: GamePhase;
    players: Player[];
    spectators: Player[];
    hostId: string;
    currentDay: number;
    timeLeft: number;
    events: any[];
    eliminatedPlayers: any[];
    config: GameConfig;
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// INTERFACES DE SERVIÇO (Para Fase 2)
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

export interface IGameStateService {
    createGame(hostId: string, config: GameConfig): Promise<Game>;
    getGame(gameId: string): Promise<Game | null>;
    updateGameState(gameId: string, updates: Partial<GameState>): Promise<void>;
    deleteGame(gameId: string): Promise<void>;
    addPlayer(gameId: string, player: Player): Promise<void>;
    removePlayer(gameId: string, playerId: string): Promise<void>;
    updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void>;
    getGameState(gameId: string): Promise<GameState | null>;
    getPlayer(gameId: string, playerId: string): Promise<Player | null>;
    getAllPlayers(gameId: string): Promise<Player[]>;
    getGamesByRoom(roomId: string): Promise<Game[]>;
    getActiveGamesCount(): Promise<number>;
    cleanup?(): number;
    healthCheck?(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }>;
}