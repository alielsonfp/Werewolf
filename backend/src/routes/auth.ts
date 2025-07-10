// 🐺 LOBISOMEM ONLINE - Authentication Routes
// Route definitions for authentication endpoints

import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, getProfile, checkUsername, checkEmail, googleLogin } from '@/controllers/authController';
import { requireAuth } from '@/middleware/auth';

const router = Router();

//======================================================================
// SIMPLE RATE LIMITING (INLINE)
//======================================================================

const authRateLimit = (req: any, res: any, next: any) => {
  // TODO: Implement proper rate limiting later
  // For now, just pass through
  next();
};

//======================================================================
// PUBLIC ROUTES
//======================================================================

/**
 * @route POST /api/auth/register
 * @desc Register new user
 * @access Public
 * @body { email, username, password, confirmPassword }
 */
router.post('/register', authRateLimit, register);

/**
 * @route POST /api/auth/google
 * @desc Handle Google OAuth login
 * @access Public
 * @body { code }
 */
router.post('/google', authRateLimit, googleLogin); // Nova rota aqui

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 * @body { email, password }
 */
router.post('/login', authRateLimit, login);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 * @body { email }
 */
router.post('/forgot-password', authRateLimit, forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 * @body { token, password, confirmPassword }
 */
router.post('/reset-password', authRateLimit, resetPassword);

/**
 * @route GET /api/auth/check-username/:username
 * @desc Check if username is available
 * @access Public
 */
router.get('/check-username/:username', authRateLimit, checkUsername);

/**
 * @route GET /api/auth/check-email/:email
 * @desc Check if email is available
 * @access Public
 */
router.get('/check-email/:email', authRateLimit, checkEmail);

//======================================================================
// PROTECTED ROUTES
//======================================================================

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', requireAuth, getProfile);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Private (refresh token)
 */
router.post('/refresh', (req, res) => {
  // TODO: Implement refresh token logic
  res.json({
    success: true,
    message: 'Refresh token endpoint - TODO',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (invalidate token)
 * @access Private
 */
router.post('/logout', requireAuth, (req, res) => {
  // TODO: Add token to blacklist in Redis
  res.json({
    success: true,
    message: 'Logout realizado com sucesso',
    timestamp: new Date().toISOString(),
  });
});

export default router;