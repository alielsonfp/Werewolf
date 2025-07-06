// 🐺 LOBISOMEM ONLINE - Authentication Service
// Handle all authentication-related API calls

import { apiService } from './api';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ApiResponse,
  AuthTokens
} from '@/types';

// =============================================================================
// AUTHENTICATION SERVICE
// =============================================================================
class AuthService {

  // =============================================================================
  // ✅ AUTHENTICATION METHODS - CORRIGIDO COM TRATAMENTO DE ERRO ADEQUADO
  // =============================================================================

  /**
   * ✅ CORRIGIDO: Login user with email and password
   * Agora usa axios direto para evitar interceptors que redirecionam em erros 401
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // ✅ MUDANÇA: Usar axios direto em vez de apiService para evitar interceptors
      const axios = (await import('axios')).default;
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await axios.post<ApiResponse<AuthResponse>>(
        `${API_BASE_URL}/api/auth/login`,
        credentials,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );
      return response.data; // Retorna os dados em caso de sucesso (status 2xx)
    } catch (error: any) {
      // Se o status for 4xx ou 5xx, o axios joga um erro. Nós o capturamos.
      if (error.response?.data) {
        // Se o erro tem uma resposta do backend, retornamos os dados dessa resposta
        // Ex: { success: false, message: 'Email ou senha incorretos', ... }
        return error.response.data;
      }
      // Se não houver resposta, é um erro de rede real (servidor offline, etc.)
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Erro de conexão. Tente novamente.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * ✅ CORRIGIDO: Register new user
   * Agora usa axios direto para evitar interceptors que redirecionam em erros 409
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // ✅ MUDANÇA: Usar axios direto em vez de apiService para evitar interceptors
      const axios = (await import('axios')).default;
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await axios.post<ApiResponse<AuthResponse>>(
        `${API_BASE_URL}/api/auth/register`,
        userData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );
      return response.data; // Retorna os dados em caso de sucesso (status 2xx)
    } catch (error: any) {
      // Se o status for 4xx ou 5xx, o axios joga um erro. Nós o capturamos.
      if (error.response?.data) {
        // Se o erro tem uma resposta do backend, retornamos os dados dessa resposta
        // Ex: { success: false, message: 'Email já está em uso', ... }
        return error.response.data;
      }
      // Se não houver resposta, é um erro de rede real (servidor offline, etc.)
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Erro de conexão. Tente novamente.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Logout user (server-side cleanup)
   */
  async logout(): Promise<ApiResponse> {
    return apiService.post('/api/auth/logout');
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    return apiService.post<{ tokens: AuthTokens }>('/api/auth/refresh', {
      refreshToken,
    });
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/api/auth/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.patch<User>('/api/auth/profile', updates);
  }

  // =============================================================================
  // PASSWORD MANAGEMENT
  // =============================================================================

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiService.post('/api/auth/forgot-password', { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    return apiService.post('/api/auth/reset-password', {
      token,
      password,
    });
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return apiService.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // =============================================================================
  // EMAIL VERIFICATION
  // =============================================================================

  /**
   * Send email verification
   */
  async sendVerificationEmail(): Promise<ApiResponse> {
    return apiService.post('/api/auth/send-verification');
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    return apiService.post('/api/auth/verify-email', { token });
  }

  // =============================================================================
  // ACCOUNT MANAGEMENT
  // =============================================================================

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<ApiResponse> {
    return apiService.delete('/api/auth/account', {
      data: { password },
    });
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiService.get<{ available: boolean }>(`/api/auth/check-username/${encodeURIComponent(username)}`);
  }

  /**
   * Check if email is available
   */
  async checkEmailAvailability(email: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiService.get<{ available: boolean }>(`/api/auth/check-email/${encodeURIComponent(email)}`);
  }

  // =============================================================================
  // AVATAR MANAGEMENT
  // =============================================================================

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ avatarUrl: string }>> {
    return apiService.uploadFile<{ avatarUrl: string }>('/api/auth/avatar', file, onProgress);
  }

  /**
   * Remove user avatar
   */
  async removeAvatar(): Promise<ApiResponse> {
    return apiService.delete('/api/auth/avatar');
  }

  // =============================================================================
  // USER STATISTICS
  // =============================================================================

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<ApiResponse<any>> {
    return apiService.get('/api/auth/statistics');
  }

  /**
   * Get user game history
   */
  async getGameHistory(page = 1, limit = 20): Promise<ApiResponse<any>> {
    return apiService.get(`/api/auth/history?page=${page}&limit=${limit}`);
  }

  /**
   * Get user achievements
   */
  async getAchievements(): Promise<ApiResponse<any>> {
    return apiService.get('/api/auth/achievements');
  }

  // =============================================================================
  // SOCIAL FEATURES
  // =============================================================================

  /**
   * Get friends list
   */
  async getFriends(): Promise<ApiResponse<any[]>> {
    return apiService.get('/api/auth/friends');
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string): Promise<ApiResponse> {
    return apiService.post('/api/auth/friends/request', { userId });
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId: string): Promise<ApiResponse> {
    return apiService.post(`/api/auth/friends/accept/${requestId}`);
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(requestId: string): Promise<ApiResponse> {
    return apiService.post(`/api/auth/friends/reject/${requestId}`);
  }

  /**
   * Remove friend
   */
  async removeFriend(userId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/auth/friends/${userId}`);
  }

  // =============================================================================
  // PRIVACY SETTINGS
  // =============================================================================

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: Record<string, boolean>): Promise<ApiResponse> {
    return apiService.patch('/api/auth/privacy', settings);
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<ApiResponse<Record<string, boolean>>> {
    return apiService.get('/api/auth/privacy');
  }

  // =============================================================================
  // NOTIFICATION SETTINGS
  // =============================================================================

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: Record<string, boolean>): Promise<ApiResponse> {
    return apiService.patch('/api/auth/notifications', settings);
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<ApiResponse<Record<string, boolean>>> {
    return apiService.get('/api/auth/notifications');
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<ApiResponse<any[]>> {
    return apiService.get('/api/auth/sessions');
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/auth/sessions/${sessionId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(): Promise<ApiResponse> {
    return apiService.post('/api/auth/sessions/revoke-all');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Check if user is authenticated (client-side)
   */
  isAuthenticated(): boolean {
    // This will be handled by AuthContext
    return false;
  }

  /**
   * Get current user from context (client-side)
   */
  getCurrentUser(): User | null {
    // This will be handled by AuthContext
    return null;
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Senha deve ter pelo menos 6 caracteres');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate username format
   */
  validateUsername(username: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (username.length < 3) {
      errors.push('Username deve ter pelo menos 3 caracteres');
    }

    if (username.length > 20) {
      errors.push('Username deve ter no máximo 20 caracteres');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username só pode conter letras, números, _ e -');
    }

    // Check for reserved usernames
    const reservedUsernames = [
      'admin', 'moderator', 'system', 'bot', 'werewolf', 'lobisomem',
      'api', 'www', 'mail', 'ftp', 'localhost', 'root'
    ];

    if (reservedUsernames.includes(username.toLowerCase())) {
      errors.push('Este username não está disponível');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================
export const authService = new AuthService();
export default authService;