import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '@/config/database';
import {
  generateTokenPair,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '@/config/jwt';
import { authLogger } from '@/utils/logger';
import { ERROR_MESSAGES } from '@/utils/constants';
import {
  validateRegisterRequest,
  validateLoginRequest,
  validateEmail,
} from '@/utils/simpleValidators';
import { OAuth2Client, LoginTicket } from 'google-auth-library';
import type { ApiResponse } from '@/types';
import { config } from '@/config/environment';

/* -------------------------------------------------------------------------- */
/*                                   REGISTER                                 */
/* -------------------------------------------------------------------------- */
export const register = async (req: Request, res: Response) => {
  try {
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

    const existingUserQuery = `
      SELECT id, email, username FROM users 
      WHERE email = $1 OR username = $2
    `;
    const existingUserResult = await pool.query(existingUserQuery, [
      email.toLowerCase(),
      username.toLowerCase(),
    ]);

    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0];
      authLogger.warn('Registration attempt with existing credentials', {
        email,
        username,
        existingField:
          existingUser.email === email.toLowerCase() ? 'email' : 'username',
        ip: req.ip,
      });

      res.status(409).json({
        success: false,
        error: 'USER_ALREADY_EXISTS',
        message:
          existingUser.email === email.toLowerCase()
            ? 'Email já está em uso'
            : 'Username já está em uso',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createUserQuery = `
      INSERT INTO users(email, username, "passwordHash", level, "totalGames",
        "totalWins", "totalLosses", "winRate", "createdAt", "updatedAt")
      VALUES($1, $2, $3, 1, 0, 0, 0, 0.0, NOW(), NOW())
      RETURNING id, email, username, level, "totalGames", "totalWins",
        "totalLosses", "winRate", "createdAt", "updatedAt", "lastLoginAt"
    `;
    const userResult = await pool.query(createUserQuery, [
      email.toLowerCase(),
      username,
      passwordHash,
    ]);
    const user = userResult.rows[0];

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
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
      message: 'Usuário criado com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    authLogger.error(
      'Registration error',
      error instanceof Error ? error : new Error('Unknown registration error'),
      {
        email: req.body?.email,
        username: req.body?.username,
        ip: req.ip,
      },
    );

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/* -------------------------------------------------------------------------- */
/*                                    LOGIN                                   */
/* -------------------------------------------------------------------------- */
export const login = async (req: Request, res: Response) => {
  try {
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
    let user; // ✅ Variável declarada no escopo principal

    // ✅ Bloco para determinar o usuário (Magic Login ou Login Normal)
    if (config.IS_DEVELOPMENT && email.endsWith('@dev.test')) {
      // 🔧 MAGIC LOGIN - Apenas para desenvolvimento
      const username = email.split('@')[0];

      let userResult = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        // Cria usuário de teste automaticamente
        authLogger.info(`DEV_LOGIN: Creating user on-the-fly: ${username}`);
        const fakePasswordHash = await bcrypt.hash('password123', 12);

        const createUserQuery = `
          INSERT INTO users(email, username, "passwordHash", level, "totalGames",
            "totalWins", "totalLosses", "winRate", "createdAt", "updatedAt")
          VALUES($1, $2, $3, 1, 0, 0, 0, 0.0, NOW(), NOW())
          RETURNING id, email, username, level, "totalGames", "totalWins",
            "totalLosses", "winRate", "createdAt", "updatedAt", "lastLoginAt"
        `;

        const newUserResult = await pool.query(createUserQuery, [
          email.toLowerCase(),
          username,
          fakePasswordHash,
        ]);
        user = newUserResult.rows[0];
      } else {
        user = userResult.rows[0];
      }

      authLogger.warn(`DEV_LOGIN: Bypassing password check for ${email}`);
    } else {
      // 🔐 LOGIN NORMAL - Validação completa
      const userResult = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
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

      const foundUser = userResult.rows[0];
      const isPasswordValid = await bcrypt.compare(password, foundUser.passwordHash);

      if (!isPasswordValid) {
        authLogger.warn('Login attempt with invalid password', {
          userId: foundUser.id,
          email: foundUser.email,
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

      user = foundUser; // ✅ Atribui o usuário validado
    }

    // ✅✅✅ LÓGICA DE SUCESSO UNIFICADA ✅✅✅
    // Este bloco executa para ambos os casos (Magic Login e Login Normal)

    // Atualiza o último login
    await pool.query(
      `UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1`,
      [user.id]
    );

    // Gera os tokens
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    // Remove o hash da senha da resposta
    const { passwordHash, ...userWithoutPassword } = user;

    authLogger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
      email: user.email,
      ip: req.ip,
    });

    // Envia a resposta de sucesso
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
      message: config.IS_DEVELOPMENT && email.endsWith('@dev.test')
        ? 'Login de desenvolvedor realizado com sucesso'
        : 'Login realizado com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    authLogger.error(
      'Login error',
      error instanceof Error ? error : new Error('Unknown login error'),
      {
        email: req.body?.email,
        ip: req.ip,
      },
    );

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/* -------------------------------------------------------------------------- */
/*                               FORGOT PASSWORD                              */
/* -------------------------------------------------------------------------- */
export const forgotPassword = async (req: Request, res: Response) => {
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

    const userQuery = `SELECT id, email FROM users WHERE email = $1`;
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
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

    const user = userResult.rows[0];
    const resetToken = generatePasswordResetToken(user.id, user.email);

    authLogger.info('Password reset token generated', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    /* Em produção, envie por email. Aqui apenas logamos. */
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(
      `Reset URL: http://localhost:3000/auth/reset-password?token=${resetToken}`,
    );

    res.json({
      success: true,
      data: {
        resetToken,
        resetUrl: `http://localhost:3000/auth/reset-password?token=${resetToken}`,
      },
      message: 'Link de recuperação enviado para o email',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    authLogger.error(
      'Forgot password error',
      error instanceof Error ? error : new Error('Unknown forgot password error'),
      {
        email: req.body?.email,
        ip: req.ip,
      },
    );

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/* -------------------------------------------------------------------------- */
/*                               RESET PASSWORD                               */
/* -------------------------------------------------------------------------- */
export const resetPassword = async (req: Request, res: Response) => {
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

    let tokenPayload;
    try {
      tokenPayload = verifyPasswordResetToken(token);
    } catch (error) {
      authLogger.warn('Invalid password reset token used', {
        token: token.slice(0, 20) + '...',
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

    const userQuery = `SELECT id, email FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [tokenPayload.userId]);

    if (
      userResult.rows.length === 0 ||
      userResult.rows[0].email !== tokenPayload.email
    ) {
      authLogger.warn('Password reset token user mismatch', {
        tokenUserId: tokenPayload.userId,
        tokenEmail: tokenPayload.email,
        userExists: userResult.rows.length > 0,
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

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      `UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [passwordHash, tokenPayload.userId],
    );

    authLogger.info('Password reset successfully', {
      userId: tokenPayload.userId,
      email: tokenPayload.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Senha alterada com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    authLogger.error(
      'Reset password error',
      error instanceof Error ? error : new Error('Unknown reset password error'),
      {
        ip: req.ip,
      },
    );

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/* -------------------------------------------------------------------------- */
/*                                  PROFILE                                   */
/* -------------------------------------------------------------------------- */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userQuery = `
      SELECT id, email, username, avatar, level, "totalGames", "totalWins",
             "totalLosses", "winRate", "createdAt", "updatedAt", "lastLoginAt"
      FROM users WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [req.userId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: ERROR_MESSAGES.NOT_FOUND,
        message: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: userResult.rows[0],
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    authLogger.error(
      'Get profile error',
      error instanceof Error ? error : new Error('Unknown profile error'),
      {
        userId: req.userId,
      },
    );

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/* -------------------------------------------------------------------------- */
/*                              CHECK USERNAME                                */
/* -------------------------------------------------------------------------- */
export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    if (!username || typeof username !== 'string') {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_FAILED,
        message: 'Username é obrigatório',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const userQuery = `SELECT id FROM users WHERE username = $1`;
    const userResult = await pool.query(userQuery, [username.toLowerCase()]);

    res.json({
      success: true,
      data: { available: userResult.rows.length === 0 },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    authLogger.error(
      'Check username error',
      error instanceof Error ? error : new Error('Unknown check username error'),
      {
        username: req.params?.username,
        ip: req.ip,
      },
    );

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/* -------------------------------------------------------------------------- */
/*                                CHECK EMAIL                                 */
/* -------------------------------------------------------------------------- */
export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email || typeof email !== 'string' || !validateEmail(email)) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_FAILED,
        message: 'Email válido é obrigatório',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const userQuery = `SELECT id FROM users WHERE email = $1`;
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    res.json({
      success: true,
      data: { available: userResult.rows.length === 0 },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    authLogger.error(
      'Check email error',
      error instanceof Error ? error : new Error('Unknown check email error'),
      {
        email: req.params?.email,
        ip: req.ip,
      },
    );

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/* -------------------------------------------------------------------------- */
/*                                GOOGLE LOGIN                                */
/* -------------------------------------------------------------------------- */
export const googleLogin = async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    // Adicione 'return' aqui
    return res.status(400).json({ success: false, error: 'Authorization code is required', timestamp: new Date().toISOString() });
  }

  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials are not configured in environment variables.");
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'postmessage'
    );

    const { tokens } = await oauth2Client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error("ID token not found in Google's response");
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
      // Adicione 'return' aqui
      return res.status(400).json({ success: false, error: 'Failed to retrieve user profile from Google', timestamp: new Date().toISOString() });
    }

    const { email, name, picture } = payload;

    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userResult.rows[0];

    if (!user) {
      authLogger.info('Creating new user from Google login', { email, name });

      let username = name.replace(/\s+/g, '_').toLowerCase();
      const existingUsername = await pool.query('SELECT id FROM users WHERE username ILIKE $1', [username]);
      if (existingUsername.rows.length > 0 || username.length < 3) {
        username = `${username}${Date.now().toString().slice(-4)}`;
      }

      const randomPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(randomPassword, 12);

      const createUserQuery = `
        INSERT INTO users(email, username, "passwordHash", avatar, "createdAt", "updatedAt")
        VALUES($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      const newUserResult = await pool.query(createUserQuery, [email, username, passwordHash, picture]);
      user = newUserResult.rows[0];
    }

    await pool.query('UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1', [user.id]);

    const appTokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    const { passwordHash, ...userWithoutPassword } = user;

    authLogger.info('User logged in successfully via Google', { userId: user.id, email });

    // Adicione 'return' aqui
    return res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: appTokens,
      },
      message: 'Login com Google realizado com sucesso',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    authLogger.error('Google login error', error instanceof Error ? error : new Error('Unknown Google login error'));
    // Adicione 'return' aqui
    return res.status(500).json({ success: false, error: 'Internal Server Error', timestamp: new Date().toISOString() });
  }
};