// 🐺 LOBISOMEM ONLINE - JWT Configuration
// Authentication and token management

import jwt from 'jsonwebtoken';
import { config } from './environment';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

// =============================================================================
// TOKEN GENERATION
// =============================================================================
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
    issuer: 'werewolf-online',
    audience: 'werewolf-players',
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    config.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: 'werewolf-online',
      audience: 'werewolf-players',
    }
  );
}

export function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload.userId),
  };
}

// =============================================================================
// TOKEN VERIFICATION
// =============================================================================
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'werewolf-online',
      audience: 'werewolf-players',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

export function verifyRefreshToken(token: string): { userId: string; type: string } {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'werewolf-online',
      audience: 'werewolf-players',
    }) as { userId: string; type: string };

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Refresh token verification failed');
  }
}

// =============================================================================
// TOKEN EXTRACTION
// =============================================================================
export function extractTokenFromHeader(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export function extractTokenFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  const tokenCookie = cookies.find(cookie => cookie.startsWith('access_token='));

  if (!tokenCookie) {
    return null;
  }

  return tokenCookie.split('=')[1];
}

// =============================================================================
// TOKEN UTILITIES
// =============================================================================
export function decodeTokenWithoutVerification(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeTokenWithoutVerification(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  return decoded.exp * 1000 < Date.now();
}

export function getTokenExpirationTime(token: string): Date | null {
  const decoded = decodeTokenWithoutVerification(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
}

// =============================================================================
// WEBSOCKET TOKEN VALIDATION
// =============================================================================
export function extractTokenFromWebSocketRequest(request: {
  headers: { [key: string]: string | string[] | undefined };
  url?: string;
}): string | null {
  // Try Authorization header first
  const authHeader = request.headers.authorization;
  if (typeof authHeader === 'string') {
    const token = extractTokenFromHeader(authHeader);
    if (token) return token;
  }

  // Try Cookie header
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const token = extractTokenFromCookie(cookieHeader);
    if (token) return token;
  }

  // Try query parameter (less secure, use as fallback)
  if (request.url) {
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (token) return token;
  }

  return null;
}

// =============================================================================
// PASSWORD RESET TOKENS
// =============================================================================
export function generatePasswordResetToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'password_reset' },
    config.JWT_SECRET,
    {
      expiresIn: '1h',
      issuer: 'werewolf-online',
      audience: 'werewolf-players',
    }
  );
}

export function verifyPasswordResetToken(token: string): { userId: string; email: string } {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'werewolf-online',
      audience: 'werewolf-players',
    }) as { userId: string; email: string; type: string };

    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid password reset token type');
    }

    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Password reset token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid password reset token');
    }
    throw new Error('Password reset token verification failed');
  }
}