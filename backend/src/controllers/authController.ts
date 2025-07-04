// 🐺 LOBISOMEM ONLINE - Authentication Controller
// Handle user registration, login, and password recovery

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { generateTokenPair, generatePasswordResetToken, verifyPasswordResetToken } from '@/config/jwt';
import { authLogger } from '@/utils/logger';
import { ERROR_MESSAGES } from '@/utils/constants';
import {
    validateRegisterRequest,
    validateLoginRequest,
    validateEmail
} from '@/utils/simpleValidators';
import type { ApiResponse } from '@/types';

//======================================================================
// REGISTER USER
//======================================================================

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request body
        const validation = validateRegisterRequest(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: ERROR_MESSAGES.VALIDATION_FAILED,
                message: validation.error,
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        const { email, username, password } = validation.data!;

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email.toLowerCase() },
                    { username: username.toLowerCase() },
                ],
            },
        });

        if (existingUser) {
            authLogger.warn('Registration attempt with existing credentials', {
                email,
                username,
                existingField: existingUser.email === email.toLowerCase() ? 'email' : 'username',
                ip: req.ip,
            });

            res.status(409).json({
                success: false,
                error: 'USER_ALREADY_EXISTS',
                message: existingUser.email === email.toLowerCase()
                    ? 'Email já está em uso'
                    : 'Username já está em uso',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                username,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                username: true,
                level: true,
                totalGames: true,
                totalWins: true,
                totalLosses: true,
                winRate: true,
                createdAt: true,
            },
        });

        // Generate tokens
        const tokens = generateTokenPair({
            userId: user.id,
            username: user.username,
            email: user.email,
        });

        authLogger.info('User registered successfully', {
            userId: user.id,
            username: user.username,
            email: user.email,
            ip: req.ip,
        });

        res.status(201).json({
            success: true,
            data: {
                user,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
            message: 'Usuário criado com sucesso',
            timestamp: new Date().toISOString(),
        } as ApiResponse);

    } catch (error) {
        authLogger.error('Registration error', error instanceof Error ? error : new Error('Unknown registration error'), {
            email: req.body?.email,
            username: req.body?.username,
            ip: req.ip,
        });

        res.status(500).json({
            success: false,
            error: ERROR_MESSAGES.SERVER_ERROR,
            timestamp: new Date().toISOString(),
        } as ApiResponse);
    }
};

//======================================================================
// LOGIN USER
//======================================================================

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request body
        const validation = validateLoginRequest(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: ERROR_MESSAGES.VALIDATION_FAILED,
                message: validation.error,
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        const { email, password } = validation.data!;

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            authLogger.warn('Login attempt with non-existent email', {
                email,
                ip: req.ip,
            });

            res.status(401).json({
                success: false,
                error: 'INVALID_CREDENTIALS',
                message: 'Email ou senha incorretos',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            authLogger.warn('Login attempt with invalid password', {
                userId: user.id,
                email: user.email,
                ip: req.ip,
            });

            res.status(401).json({
                success: false,
                error: 'INVALID_CREDENTIALS',
                message: 'Email ou senha incorretos',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate tokens
        const tokens = generateTokenPair({
            userId: user.id,
            username: user.username,
            email: user.email,
        });

        // Exclude password hash from response
        const { passwordHash, ...userWithoutPassword } = user;

        authLogger.info('User logged in successfully', {
            userId: user.id,
            username: user.username,
            email: user.email,
            ip: req.ip,
        });

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
            message: 'Login realizado com sucesso',
            timestamp: new Date().toISOString(),
        } as ApiResponse);

    } catch (error) {
        authLogger.error('Login error', error instanceof Error ? error : new Error('Unknown login error'), {
            email: req.body?.email,
            ip: req.ip,
        });

        res.status(500).json({
            success: false,
            error: ERROR_MESSAGES.SERVER_ERROR,
            timestamp: new Date().toISOString(),
        } as ApiResponse);
    }
};

//======================================================================
// FORGOT PASSWORD
//======================================================================

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            res.status(400).json({
                success: false,
                error: ERROR_MESSAGES.VALIDATION_FAILED,
                message: 'Email inválido',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            authLogger.warn('Password reset attempt for non-existent email', {
                email,
                ip: req.ip,
            });

            res.json({
                success: true,
                message: 'Se o email existir, um link de recuperação será enviado',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Generate password reset token
        const resetToken = generatePasswordResetToken(user.id, user.email);

        authLogger.info('Password reset token generated', {
            userId: user.id,
            email: user.email,
            ip: req.ip,
        });

        // TODO: Send email with reset link
        // For now, log the token (remove in production)
        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`Reset URL: http://localhost:3000/auth/reset-password?token=${resetToken}`);

        res.json({
            success: true,
            data: {
                // TODO: Remove in production
                resetToken,
                resetUrl: `http://localhost:3000/auth/reset-password?token=${resetToken}`,
            },
            message: 'Link de recuperação enviado para o email',
            timestamp: new Date().toISOString(),
        } as ApiResponse);

    } catch (error) {
        authLogger.error('Forgot password error', error instanceof Error ? error : new Error('Unknown forgot password error'), {
            email: req.body?.email,
            ip: req.ip,
        });

        res.status(500).json({
            success: false,
            error: ERROR_MESSAGES.SERVER_ERROR,
            timestamp: new Date().toISOString(),
        } as ApiResponse);
    }
};

//======================================================================
// RESET PASSWORD
//======================================================================

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, password } = req.body;

        if (!token || typeof token !== 'string') {
            res.status(400).json({
                success: false,
                error: ERROR_MESSAGES.VALIDATION_FAILED,
                message: 'Token é obrigatório',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            res.status(400).json({
                success: false,
                error: ERROR_MESSAGES.VALIDATION_FAILED,
                message: 'Senha deve ter pelo menos 6 caracteres',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Verify reset token
        let tokenPayload;
        try {
            tokenPayload = verifyPasswordResetToken(token);
        } catch (error) {
            authLogger.warn('Invalid password reset token used', {
                token: token.slice(0, 20) + '...', // Log partial token for debugging
                ip: req.ip,
            });

            res.status(400).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Token inválido ou expirado',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Find user by id from token
        const user = await prisma.user.findUnique({
            where: { id: tokenPayload.userId },
        });

        if (!user || user.email !== tokenPayload.email) {
            authLogger.warn('Password reset token user mismatch', {
                tokenUserId: tokenPayload.userId,
                tokenEmail: tokenPayload.email,
                userExists: !!user,
                ip: req.ip,
            });

            res.status(400).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Token inválido',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                updatedAt: new Date(),
            },
        });

        authLogger.info('Password reset successfully', {
            userId: user.id,
            email: user.email,
            ip: req.ip,
        });

        res.json({
            success: true,
            message: 'Senha alterada com sucesso',
            timestamp: new Date().toISOString(),
        } as ApiResponse);

    } catch (error) {
        authLogger.error('Reset password error', error instanceof Error ? error : new Error('Unknown reset password error'), {
            ip: req.ip,
        });

        res.status(500).json({
            success: false,
            error: ERROR_MESSAGES.SERVER_ERROR,
            timestamp: new Date().toISOString(),
        } as ApiResponse);
    }
};

//======================================================================
// GET CURRENT USER PROFILE
//======================================================================

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                level: true,
                totalGames: true,
                totalWins: true,
                totalLosses: true,
                winRate: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
            },
        });

        if (!user) {
            res.status(404).json({
                success: false,
                error: ERROR_MESSAGES.NOT_FOUND,
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        res.json({
            success: true,
            data: user,
            timestamp: new Date().toISOString(),
        } as ApiResponse);

    } catch (error) {
        authLogger.error('Get profile error', error instanceof Error ? error : new Error('Unknown profile error'), {
            userId: req.userId,
        });

        res.status(500).json({
            success: false,
            error: ERROR_MESSAGES.SERVER_ERROR,
            timestamp: new Date().toISOString(),
        } as ApiResponse);
    }
};