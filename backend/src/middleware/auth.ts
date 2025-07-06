import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, extractTokenFromCookie } from '@/config/jwt';
import { pool } from '@/config/database';
import { authLogger } from '@/utils/logger';
import { ERROR_MESSAGES } from '@/utils/constants';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      username: string;
      email: string;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      token = extractTokenFromCookie(req.headers.cookie);
    }

    if (!token) {
      authLogger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const payload = verifyAccessToken(token);

    const userQuery = `SELECT id, username, email, "updatedAt" FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [payload.userId]);

    if (userResult.rows.length === 0) {
      authLogger.warn('Token valid but user not found', {
        userId: payload.userId,
        ip: req.ip,
        path: req.path,
      });

      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = userResult.rows[0];

    await pool.query(`UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1`, [user.id]);

    req.userId = user.id;
    req.username = user.username;
    req.email = user.email;

    authLogger.info('User authenticated successfully', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
      path: req.path,
    });

    next();
  } catch (error) {
    authLogger.error('Authentication error', error instanceof Error ? error : new Error('Unknown auth error'), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      timestamp: new Date().toISOString(),
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      token = extractTokenFromCookie(req.headers.cookie);
    }

    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);
    const userQuery = `SELECT id, username, email FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [payload.userId]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      req.userId = user.id;
      req.username = user.username;
      req.email = user.email;
    }

    next();
  } catch (error) {
    next();
  }
};