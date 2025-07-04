// 🐺 LOBISOMEM ONLINE - JWT Configuration (ABORDAGEM DIRETA)
import jwt from 'jsonwebtoken';
import { config } from './environment';
import type { IncomingMessage } from 'http';
import type { JWTPayload, TokenPair } from '@/types';

export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  if (!config.JWT_SECRET) throw new Error('JWT_SECRET is not configured');

  // FORÇA BRUTA: Usar any para quebrar o TypeScript
  const jwtSign = (jwt.sign as any);
  return jwtSign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

export function generateRefreshToken(userId: string): string {
  if (!config.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  const jwtSign = (jwt.sign as any);
  return jwtSign({ userId, type: 'refresh' }, config.JWT_SECRET, { expiresIn: '30d' });
}

export function generatePasswordResetToken(userId: string, email: string): string {
  if (!config.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  const jwtSign = (jwt.sign as any);
  return jwtSign({ userId, email, type: 'password_reset' }, config.JWT_SECRET, { expiresIn: '1h' });
}

export function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload.userId),
  };
}

export function verifyAccessToken(token: string): JWTPayload {
  if (!config.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  try {
    return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new Error('Token expired');
    if (error instanceof jwt.JsonWebTokenError) throw new Error('Invalid token');
    throw new Error('Token verification failed');
  }
}

export function verifyPasswordResetToken(token: string): { userId: string; email: string; type: string } {
  if (!config.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    if (decoded.type !== 'password_reset') throw new Error('Invalid token type');
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new Error('Reset token expired');
    if (error instanceof jwt.JsonWebTokenError) throw new Error('Invalid reset token');
    throw new Error('Reset token verification failed');
  }
}

export function extractTokenFromHeader(authorization?: string): string | null {
  if (!authorization) return null;
  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1] || null;
}

export function extractTokenFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  const tokenCookie = cookies.find(cookie => cookie.startsWith('access_token='));
  if (!tokenCookie) return null;
  const tokenValue = tokenCookie.split('=')[1];
  return tokenValue || null;
}

export function extractTokenFromWebSocketRequest(request: IncomingMessage): string | null {
  const authHeader = request.headers.authorization;
  if (typeof authHeader === 'string') {
    const token = extractTokenFromHeader(authHeader);
    if (token) return token;
  }

  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const token = extractTokenFromCookie(cookieHeader);
    if (token) return token;
  }

  if (request.url) {
    try {
      const url = new URL(request.url, 'http://localhost');
      return url.searchParams.get('token');
    } catch (e) {
      // Ignorar URL inválida
    }
  }

  return null;
}