// 🐺 LOBISOMEM ONLINE - WebSocket Configuration (ABORDAGEM DIRETA)
import { config } from './environment';
import type { IncomingMessage } from 'http';
import type { URLParseResult, ConnectionMetadata, MessageValidationResult, WebSocketMessage } from '@/types';

export const wsConfig = {
  path: config.WS_BASE_PATH,
  server: {
    maxPayload: 1024 * 1024, // 1MB
  },
  heartbeat: {
    interval: 30000,
    timeout: 5000,
  },
} as const;

export function parseWebSocketURL(url: string | undefined): URLParseResult {
  if (!url) {
    return { isValid: false, path: '' };
  }

  try {
    const urlObj = new URL(url, 'ws://localhost');
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    const result: URLParseResult = {
      isValid: true,
      path: urlObj.pathname
    };

    // Só adicionar roomId se realmente existir
    if (pathParts.length > 1 && pathParts[0] === 'ws' && pathParts[1]) {
      result.roomId = pathParts[1];
    }

    return result;
  } catch {
    return { isValid: false, path: url };
  }
}

export function extractConnectionMetadata(request: IncomingMessage): ConnectionMetadata {
  const forwarded = request.headers['x-forwarded-for'];
  const realIp = request.headers['x-real-ip'];
  const remoteAddr = request.socket.remoteAddress;

  // Lógica para IP
  let ip: string | undefined;
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0];
    ip = firstIp ? firstIp.trim() : undefined;
  } else if (typeof realIp === 'string') {
    ip = realIp;
  } else if (remoteAddr) {
    ip = remoteAddr;
  }

  // FORÇA BRUTA: Construir como any e depois fazer cast
  const metadata: any = {
    connectedAt: new Date()
  };

  // Adicionar propriedades sem verificação de tipos
  const userAgent = request.headers['user-agent'];
  if (userAgent) {
    metadata.userAgent = Array.isArray(userAgent) ? userAgent[0] : userAgent;
  }

  if (ip) {
    metadata.ip = ip;
  }

  const origin = request.headers.origin;
  if (typeof origin === 'string') {
    metadata.origin = origin;
  }

  // Cast final para o tipo correto
  return metadata as ConnectionMetadata;
}

export function validateWebSocketMessage(data: any): MessageValidationResult {
  try {
    const parsed = (typeof data === 'string') ? JSON.parse(data) : data;

    if (!parsed || typeof parsed !== 'object' || !parsed.type || typeof parsed.type !== 'string') {
      return { isValid: false, error: 'Mensagem inválida ou sem tipo' };
    }

    // FORÇA BRUTA: Construir como any
    const message: any = {
      type: parsed.type,
      timestamp: parsed.timestamp || new Date().toISOString(),
    };

    // Adicionar propriedades condicionalmente
    if (parsed.data !== undefined) {
      message.data = parsed.data;
    }

    if (parsed.messageId && typeof parsed.messageId === 'string') {
      message.messageId = parsed.messageId;
    }

    return { isValid: true, message: message as WebSocketMessage };
  } catch (error) {
    return { isValid: false, error: 'Formato JSON inválido' };
  }
}