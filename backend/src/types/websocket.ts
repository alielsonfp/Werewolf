// 🐺 LOBISOMEM ONLINE - WebSocket Types
// ⚠️ CRÍTICO: Estruturado para roteamento NGINX na Fase 2

// =============================================================================
// WEBSOCKET MESSAGE STRUCTURE
// =============================================================================
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
  messageId?: string;
}

export interface WebSocketResponse extends WebSocketMessage {
  success?: boolean;
  error?: string;
}

// =============================================================================
// CLIENT → SERVER EVENTS
// =============================================================================
export interface ClientEvents {
  // Connection management
  'ping': {};
  'pong': {};
  'heartbeat': { timestamp: number };

  // Room events
  'join-room': { roomId: string; asSpectator?: boolean };
  'leave-room': { roomId: string };
  'player-ready': { ready: boolean };
  'kick-player': { playerId: string };
  'start-game': {};

  // Game events
  'game-action': {
    type: 'INVESTIGATE' | 'PROTECT' | 'KILL' | 'VOTE';
    targetId?: string;
    data?: any;
  };
  'vote': { targetId: string };
  'unvote': {};

  // Chat events
  'chat-message': {
    message: string;
    channel?: 'public' | 'werewolf' | 'spectator';
  };

  // Spectator events
  'spectate-room': { roomId: string };
  'stop-spectating': {};
}

// =============================================================================
// SERVER → CLIENT EVENTS
// =============================================================================
export interface ServerEvents {
  // Connection events
  'connected': { userId: string; username: string };
  'disconnected': { reason?: string };
  'error': { message: string; code?: string };
  'ping': { timestamp: number };
  'pong': { timestamp: number };

  // Room events
  'room-joined': {
    room: {
      id: string;
      name: string;
      hostId: string;
      status: string;
    };
    players: Array<{
      id: string;
      username: string;
      isHost: boolean;
      isReady: boolean;
      isSpectator: boolean;
    }>;
    yourRole: 'PLAYER' | 'SPECTATOR' | 'HOST';
  };

  'room-left': { roomId: string };

  'player-joined': {
    player: {
      id: string;
      username: string;
      isSpectator: boolean;
    };
  };

  'player-left': {
    playerId: string;
    username: string;
  };

  'player-ready': {
    playerId: string;
    ready: boolean;
  };

  'player-kicked': {
    playerId: string;
    kickedBy: string;
  };

  'host-changed': {
    newHostId: string;
    newHostUsername: string;
  };

  // Game events
  'game-starting': {
    countdown: number;
  };

  'game-started': {
    gameId: string;
    yourRole: string;
    yourFaction: string;
    players: Array<{
      id: string;
      username: string;
      nickname?: string;
      isAlive: boolean;
    }>;
  };

  'game-state': {
    gameId: string;
    status: string;
    phase: string;
    timeLeft: number;
    currentDay: number;
    players: any[];
    events: any[];
  };

  'phase-changed': {
    phase: 'NIGHT' | 'DAY' | 'VOTING';
    timeLeft: number;
    day: number;
  };

  'player-died': {
    playerId: string;
    username: string;
    role: string;
    cause: 'VOTE' | 'WEREWOLF' | 'VIGILANTE' | 'SERIAL_KILLER';
  };

  'action-result': {
    success: boolean;
    message?: string;
    result?: any;
  };

  'voting-started': {
    timeLeft: number;
  };

  'vote-cast': {
    voterId: string;
    targetId: string;
  };

  'voting-result': {
    eliminated?: {
      playerId: string;
      username: string;
      role: string;
      voteCount: number;
    };
    votes: Array<{
      playerId: string;
      username: string;
      votes: number;
    }>;
    isTie: boolean;
  };

  'game-ended': {
    winners: {
      faction: string;
      players: string[];
    };
    results: Array<{
      playerId: string;
      username: string;
      role: string;
      won: boolean;
      survived: boolean;
    }>;
  };

  // Chat events
  'chat-message': {
    id: string;
    userId: string;
    username: string;
    message: string;
    channel: string;
    timestamp: string;
    filtered?: boolean;
  };

  // Investigation results (private to Sheriff)
  'investigation-result': {
    targetId: string;
    targetUsername: string;
    result: 'SUSPICIOUS' | 'NOT_SUSPICIOUS';
  };

  // Spectator events
  'spectator-joined': {
    spectatorId: string;
    username: string;
  };

  'spectator-left': {
    spectatorId: string;
    username: string;
  };
}

// =============================================================================
// WEBSOCKET CHANNELS
// =============================================================================
export type WebSocketChannel =
  | 'lobby'          // Global lobby chat
  | 'room'           // Room waiting area
  | 'game-public'    // Day phase public chat
  | 'game-werewolf'  // Night phase werewolf chat
  | 'game-spectator' // Spectator chat
  | 'game-system';   // System messages

// =============================================================================
// CONNECTION STATE
// =============================================================================
export interface ConnectionState {
  userId: string;
  username: string;
  roomId?: string;
  gameId?: string;
  isSpectator: boolean;
  isAlive: boolean;
  role?: string;

  // Connection health
  isConnected: boolean;
  lastPing: number;
  reconnectAttempts: number;

  // Metadata
  connectedAt: Date;
  userAgent?: string;
  ip?: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================
export interface WebSocketError {
  code: WebSocketErrorCode;
  message: string;
  data?: any;
}

export enum WebSocketErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  NOT_IN_ROOM = 'NOT_IN_ROOM',
  NOT_HOST = 'NOT_HOST',
  GAME_ALREADY_STARTED = 'GAME_ALREADY_STARTED',
  INVALID_ACTION = 'INVALID_ACTION',
  ACTION_NOT_ALLOWED = 'ACTION_NOT_ALLOWED',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  ALREADY_VOTED = 'ALREADY_VOTED',
  VOTING_NOT_ACTIVE = 'VOTING_NOT_ACTIVE',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
}

// =============================================================================
// HEARTBEAT & RECONNECTION
// =============================================================================
export interface HeartbeatMessage {
  type: 'ping' | 'pong';
  timestamp: number;
  serverId?: string;
}

export interface ReconnectionContext {
  userId: string;
  roomId?: string;
  gameId?: string;
  lastActivity: Date;
  attempts: number;
  maxAttempts: number;
  timeout: number;
}