// 🐺 LOBISOMEM ONLINE - Authentication Middleware
// JWT validation and user context injection

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, extractTokenFromCookie } from '@/config/jwt';
import { prisma } from '@/config/database';
import { authLogger } from '@/utils/logger';
import { ERROR_MESSAGES } from '@/utils/constants';

//======================================================================

// EXTEND REQUEST TYPE
//======================================================================

declare global {
    namespace Express {
        interface Request {
            userId: string;
            username: string;
            email: string;
        }
    }
}

//======================================================================

// AUTH MIDDLEWARE
//======================================================================

export const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extract token from multiple sources
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

        // Verify JWT token
        const payload = verifyAccessToken(token);

        // Check if user still exists in database
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                username: true,
                email: true,
                updatedAt: true,
            },
        });

        if (!user) {
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

        // Update last login timestamp
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Inject user data into request
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

//======================================================================

// OPTIONAL AUTH MIDDLEWARE
//======================================================================

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
            // No token provided, continue without authentication
            return next();
        }

        const payload = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });

        if (user) {
            req.userId = user.id;
            req.username = user.username;
            req.email = user.email;
        }

        next();
    } catch (error) {
        // Token invalid, continue without authentication
        next();
    }
};