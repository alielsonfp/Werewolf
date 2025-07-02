// 🐺 LOBISOMEM ONLINE - WebSocket Configuration
// ⚠️ CRÍTICO: Estruturado para roteamento NGINX na Fase 2

import { config } from './environment';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';

// =============================================================================
// WEBSOCKET CONFIGURATION
// =============================================================================
export const wsConfig = {
  // Base path for WebSocket connections
  path: config.WS_BASE_PATH,

  // Fase 1: '/ws'
  // Fase 2: '/ws/game/server-X/' (para roteamento NGINX)
  getConnectionPath: (roomId?: string): string => {
    if (config.DISTRIBUTED_MODE && roomId) {
      // Fase 2: Path específico do servidor
      return `${config.WS_BASE_PATH}/game/${config.SERVICE_ID}/${roomId}`;
    }

    // Fase 1: Path simples
    return config.WS_BASE_PATH;
  },

  // WebSocket Server options
  server: {
    port: config.WS_PORT,
    path: config.WS_BASE_PATH,

    // Connection limits
    maxPayload: 1024 * 1024, // 1MB
    backlog: 511,

    // Timeouts
    handshakeTimeout: 5000,

    // Compression
    perMessageDeflate: {
      zlibDeflateOptions: {
        level: 3,
        chunkSize: 1024,
      },
      threshold: 1024,
      concurrencyLimit: 10,
      serverMaxNoContextTakeover: false,
      clientMaxNoContextTakeover: false,
      serverMaxWindowBits: 15,
      clientMaxWindowBits: 15,
    },
  },

  // Heartbeat configuration
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds to respond
  },

  // Reconnection settings
  reconnection: {
    timeout: 120000, // 2 minutes before removing player
    maxAttempts: 5,
  },
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
export interface WebSocketConnection {
  ws: WebSocket;
  userId: string;
  username: string;
  roomId?: string;
  isAlive: boolean;
  lastPing: number;
  reconnectAttempts: number;
  metadata: {
    userAgent?: string;
    ip?: string;
    connectedAt: Date;
  };
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  messageId?: string;
}

// Prepared for NGINX routing (Phase 2)
export interface ConnectionContext {
  roomId?: string;
  serverId?: string;
  userId: string;
  username: string;
  isSpectator?: boolean;
}

// =============================================================================
// URL PARSING FOR ROUTING
// =============================================================================
export function parseWebSocketURL(url: string): {
  roomId?: string;
  serverId?: string;
  isValid: boolean;
  path: string;
} {
  try {
    const urlObj = new URL(url, 'ws://localhost');
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Remove 'ws' from path parts
    if (pathParts[0] === 'ws') {
      pathParts.shift();
    }

    // Fase 2 pattern: /ws/game/server-X/room-123
    if (config.DISTRIBUTED_MODE && pathParts.length >= 3) {
      if (pathParts[0] === 'game') {
        return {
          serverId: pathParts[1],
          roomId: pathParts[2],
          isValid: true,
          path: urlObj.pathname,
        };
      }
    }

    // Fase 1 pattern: /ws or /ws/room-123
    if (pathParts.length === 0) {
      // Just /ws
      return {
        isValid: true,
        path: urlObj.pathname,
      };
    }

    if (pathParts.length === 1) {
      // /ws/room-123
      return {
        roomId: pathParts[0],
        isValid: true,
        path: urlObj.pathname,
      };
    }

    return {
      isValid: false,
      path: urlObj.pathname,
    };
  } catch {
    return {
      isValid: false,
      path: url,
    };
  }
}

// =============================================================================
// CONNECTION METADATA EXTRACTION
// =============================================================================
export function extractConnectionMetadata(request: IncomingMessage): {
  userAgent?: string;
  ip?: string;
  origin?: string;
} {
  const forwarded = request.headers['x-forwarded-for'];
  const realIp = request.headers['x-real-ip'];

  let ip = request.socket.remoteAddress;

  // Handle forwarded IPs (behind proxy)
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (typeof realIp === 'string') {
    ip = realIp;
  }

  return {
    userAgent: request.headers['user-agent'],
    ip,
    origin: request.headers.origin,
  };
}

// =============================================================================
// MESSAGE VALIDATION
// =============================================================================
export function validateWebSocketMessage(data: any): {
  isValid: boolean;
  message?: WebSocketMessage;
  error?: string;
} {
  try {
    let parsed: any;

    if (typeof data === 'string') {
      parsed = JSON.parse(data);
    } else {
      parsed = data;
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        error: 'Message must be a valid JSON object',
      };
    }

    if (!parsed.type || typeof parsed.type !== 'string') {
      return {
        isValid: false,
        error: 'Message must have a valid type field',
      };
    }

    return {
      isValid: true,
      message: {
        type: parsed.type,
        data: parsed.data,
        timestamp: parsed.timestamp || new Date().toISOString(),
        messageId: parsed.messageId,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid JSON format',
    };
  }
}

// =============================================================================
// WEBSOCKET RESPONSE HELPERS
// =============================================================================
export function createWebSocketResponse(
  type: string,
  data?: any,
  messageId?: string
): string {
  return JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
    messageId,
  });
}

export function createErrorResponse(message: string, code?: string): string {
  return createWebSocketResponse('error', {
    message,
    code,
  });
}

export function createSuccessResponse(data?: any, messageId?: string): string {
  return createWebSocketResponse('success', data, messageId);
}

// =============================================================================
// HEARTBEAT HELPERS
// =============================================================================
export function createPingMessage(): string {
  return createWebSocketResponse('ping', {
    timestamp: Date.now(),
  });
}

export function createPongMessage(): string {
  return createWebSocketResponse('pong', {
    timestamp: Date.now(),
  });
}