// 🐺 LOBISOMEM ONLINE - Room Types
// Type definitions for room/lobby functionality

//======================================================================

// ROOM ENUMS
//======================================================================

export enum RoomStatus {
  WAITING = 'WAITING', // Waiting for players
  PLAYING = 'PLAYING', // Game in progress
  FINISHED = 'FINISHED', // Game completed
}

//======================================================================

// ROOM INTERFACES
//======================================================================

export interface Room {
  id: string;
  name: string;
  code?: string; // For private rooms (6-digit code)
  isPrivate: boolean;
  maxPlayers: number;
  maxSpectators: number;
  status: RoomStatus;
  
  // Host information
  hostId: string;
  hostUsername: string;
  
  // Current counts
  currentPlayers: number;
  currentSpectators: number;
  
  // Server assignment (Phase 2)
  serverId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomMetadata {
  id: string;
  name: string;
  isPrivate: boolean;
  currentPlayers: number;
  maxPlayers: number;
  currentSpectators: number;
  maxSpectators: number;
  status: RoomStatus;
  hostUsername: string;
  createdAt: Date;
  canJoin: boolean; // Calculated field
  isFull: boolean; // Calculated field
}

export interface RoomPlayer {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

//======================================================================

// ROOM MANAGEMENT
//======================================================================

export interface CreateRoomRequest {
  name: string;
  isPrivate?: boolean;
  maxPlayers?: number;
  maxSpectators?: number;
}

export interface CreateRoomResponse {
  room: Room;
  joinUrl: string; // WebSocket URL for Phase 2
  code?: string; // Private room code if applicable
}

export interface JoinRoomRequest {
  roomId?: string;
  code?: string; // For joining by code
  asSpectator?: boolean;
}

export interface JoinRoomResponse {
  room: Room;
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  joinUrl: string; // WebSocket URL
  yourRole: 'PLAYER' | 'SPECTATOR' | 'HOST';
}

export interface LeaveRoomRequest {
  roomId: string;
}

export interface UpdateRoomRequest {
  name?: string;
  maxPlayers?: number;
  maxSpectators?: number;
}

export interface KickPlayerRequest {
  playerId: string;
}

//======================================================================

// ROOM QUERIES
//======================================================================

export interface ListRoomsQuery {
  status?: RoomStatus;
  includePrivate?: boolean;
  hostId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'name' | 'playerCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ListRoomsResponse {
  rooms: RoomMetadata[];
  total: number;
  hasMore: boolean;
}

//======================================================================

// ROOM EVENTS (for real-time updates)
//======================================================================

export interface RoomEvent {
  type: RoomEventType;
  roomId: string;
  data: any;
  timestamp: Date;
}

export enum RoomEventType {
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_UPDATED = 'ROOM_UPDATED',
  ROOM_DELETED = 'ROOM_DELETED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_READY = 'PLAYER_READY',
  PLAYER_KICKED = 'PLAYER_KICKED',
  HOST_CHANGED = 'HOST_CHANGED',
  GAME_STARTING = 'GAME_STARTING',
  GAME_STARTED = 'GAME_STARTED',
}

//======================================================================

// ROOM CONFIGURATION
//======================================================================

export interface RoomConfig {
  maxPlayers: number;
  maxSpectators: number;
  allowSpectators: boolean;
  autoStartWhenFull: boolean;
  kickAfkPlayers: boolean;
  afkTimeoutMinutes: number;
  requireReadyToStart: boolean;
}