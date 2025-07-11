'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User, AuthTokens, LoginRequest, RegisterRequest } from '@/types';
import { authService } from '@/services/auth';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';

// =============================================================================
// CONTEXT TYPES
// =============================================================================
interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateUser: (updates: Partial<User>) => void;

  // Utils
  getToken: () => string | null;
  isTokenExpired: () => boolean;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // =============================================================================
  // ✅ COMPUTED VALUES - MELHORADO COM VERIFICAÇÃO COMPLETA E DEBUG
  // =============================================================================
  const getToken = (): string | null => {
    const token = Cookies.get('access_token') || null;
    console.log('🔐 DEBUG getToken:');
    console.log('🔐 Token exists:', !!token);
    console.log('🔐 Token length:', token?.length);
    console.log('🔐 Token (first 50 chars):', token?.substring(0, 50));
    return token;
  };

  // ✅ CORRIGIDO: isAuthenticated com verificação completa
  const isAuthenticated = useMemo(() => {
    const token = getToken();
    const result = !!user && !!token && !isLoading;
    console.log('🔐 DEBUG isAuthenticated:');
    console.log('🔐 User exists:', !!user);
    console.log('🔐 Token exists:', !!token);
    console.log('🔐 Is loading:', isLoading);
    console.log('🔐 Final result:', result);
    return result;
  }, [user, isLoading]);

  // =============================================================================
  // TOKEN MANAGEMENT COM DEBUG
  // =============================================================================
  const setTokens = (tokens: AuthTokens) => {
    console.log('🔐 DEBUG setTokens:');
    console.log('🔐 Setting access token length:', tokens.accessToken?.length);
    console.log('🔐 Setting refresh token length:', tokens.refreshToken?.length);

    // Set access token with 7-day expiry
    Cookies.set('access_token', tokens.accessToken, {
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // Set refresh token if provided
    if (tokens.refreshToken) {
      Cookies.set('refresh_token', tokens.refreshToken, {
        expires: 30,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }

    // Verificar se foram salvos
    const savedAccessToken = Cookies.get('access_token');
    const savedRefreshToken = Cookies.get('refresh_token');

    console.log('🔐 Tokens saved verification:');
    console.log('🔐 Access token saved:', !!savedAccessToken);
    console.log('🔐 Refresh token saved:', !!savedRefreshToken);
  };

  const clearTokens = () => {
    console.log('🔐 DEBUG clearTokens: Clearing all tokens');
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  };

  const isTokenExpired = (): boolean => {
    const token = getToken();
    if (!token) {
      console.log('🔐 DEBUG isTokenExpired: No token found');
      return true;
    }

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return true; // Token inválido
      if (!tokenParts[1]) return true; // Token inválido
      const payload = JSON.parse(atob(tokenParts[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      console.log('🔐 DEBUG isTokenExpired:');
      console.log('🔐 Token exp:', new Date(payload.exp * 1000));
      console.log('🔐 Current time:', new Date());
      console.log('🔐 Is expired:', isExpired);
      return isExpired;
    } catch (error) {
      console.log('🔐 DEBUG isTokenExpired: Error parsing token:', error);
      return true;
    }
  };

  // =============================================================================
  // ✅ AUTHENTICATION ACTIONS - CORRIGIDO CONFORME O GUIA COM DEBUG
  // =============================================================================
  const login = async (credentials: LoginRequest): Promise<boolean> => {
    console.log('🔐 DEBUG login: Starting login process');
    console.log('🔐 Credentials email:', credentials.email);
    setIsLoading(true);

    // ✅ CORRIGIDO: A chamada de serviço agora NUNCA vai dar "throw" por um erro 401
    const response = await authService.login(credentials);

    console.log('🔐 DEBUG login response:');
    console.log('🔐 Success:', response.success);
    console.log('🔐 Has data:', !!response.data);
    console.log('🔐 Error:', response.error);

    setIsLoading(false);

    if (response.success && response.data) {
      console.log('🔐 Login successful, processing tokens and user...');
      console.log('🔐 User received:', response.data.user?.username);
      console.log('🔐 Tokens received:', {
        accessToken: !!response.data.tokens?.accessToken,
        refreshToken: !!response.data.tokens?.refreshToken
      });

      // Lógica de sucesso...
      setUser(response.data.user);
      setTokens(response.data.tokens);
      toast.success(`Bem-vindo de volta, ${response.data.user.username}! 🐺`);
      return true;
    } else {
      // Lógica de falha...
      console.log('🔐 Login failed:', response.error || response.message);
      const errorMessage = response.message || response.error || 'Ocorreu uma falha.';
      //toast.error(errorMessage);
      return false;
    }
  };

  const register = async (data: RegisterRequest): Promise<boolean> => {
    console.log('🔐 DEBUG register: Starting registration process');
    console.log('🔐 Username:', data.username);
    console.log('🔐 Email:', data.email);
    setIsLoading(true);

    // ✅ CORRIGIDO: A chamada de serviço agora NUNCA vai dar "throw" por um erro 409
    const response = await authService.register(data);

    console.log('🔐 DEBUG register response:');
    console.log('🔐 Success:', response.success);
    console.log('🔐 Has data:', !!response.data);
    console.log('🔐 Error:', response.error);

    setIsLoading(false);

    if (response.success && response.data) {
      console.log('🔐 Registration successful, processing tokens and user...');
      // Lógica de sucesso...
      setUser(response.data.user);
      setTokens(response.data.tokens);
      toast.success(`Conta criada com sucesso! Bem-vindo, ${data.username}! 🎮`);
      return true;
    } else {
      // Lógica de falha...
      console.log('🔐 Registration failed:', response.error || response.message);
      const errorMessage = response.message || response.error || 'Erro ao criar conta';
      //toast.error(errorMessage);
      return false;
    }
  };

  const logout = () => {
    console.log('🔐 DEBUG logout: Logging out user');
    setUser(null);
    clearTokens();
    toast.success('Logout realizado com sucesso!');

    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    console.log('🔐 DEBUG refreshToken: Attempting to refresh token');
    try {
      const refreshTokenValue = Cookies.get('refresh_token');
      console.log('🔐 Refresh token exists:', !!refreshTokenValue);

      if (!refreshTokenValue) {
        console.log('🔐 No refresh token found');
        return false;
      }

      const response = await authService.refreshToken(refreshTokenValue);

      console.log('🔐 Refresh token response:');
      console.log('🔐 Success:', response.success);
      console.log('🔐 Has data:', !!response.data);

      if (response.success && response.data) {
        console.log('🔐 Token refreshed successfully');
        setTokens(response.data.tokens);
        return true;
      }

      console.log('🔐 Token refresh failed');
      return false;
    } catch (error) {
      console.error('🔐 Refresh token error:', error);
      return false;
    }
  };

  const updateUser = (updates: Partial<User>) => {
    console.log('🔐 DEBUG updateUser:', updates);
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  // =============================================================================
  // ✅ INITIALIZATION - MELHORADO COM MELHOR CONTROLE DE LOADING E DEBUG
  // =============================================================================
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔐 DEBUG initializeAuth: Starting auth initialization');
      try {
        setIsLoading(true);
        const token = getToken();

        if (!token || isTokenExpired()) {
          console.log('🔐 Token missing or expired, trying to refresh...');
          // Try to refresh token
          const refreshed = await refreshToken();
          if (!refreshed) {
            console.log('🔐 Could not refresh token, user not authenticated');
            setIsLoading(false);
            return;
          }
        }

        console.log('🔐 Getting user profile...');
        // Get user profile
        const profileResponse = await authService.getProfile();

        console.log('🔐 Profile response:');
        console.log('🔐 Success:', profileResponse.success);
        console.log('🔐 Has data:', !!profileResponse.data);

        if (profileResponse.success && profileResponse.data) {
          console.log('🔐 User profile loaded:', profileResponse.data.username);
          setUser(profileResponse.data);
        } else {
          // Token is invalid, clear it
          console.log('🔐 Profile fetch failed, clearing tokens');
          clearTokens();
        }
      } catch (error) {
        console.error('🔐 Auth initialization error:', error);
        clearTokens();
      } finally {
        console.log('🔐 Auth initialization completed');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // =============================================================================
  // TOKEN REFRESH SCHEDULER COM DEBUG
  // =============================================================================
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔐 DEBUG: User not authenticated, skipping token refresh scheduler');
      return;
    }

    console.log('🔐 DEBUG: Setting up token refresh scheduler');

    // Refresh token every 30 minutes if user is active
    const interval = setInterval(async () => {
      console.log('🔐 Scheduled token check...');
      if (!isTokenExpired()) {
        console.log('🔐 Token still valid, no refresh needed');
        return;
      }

      console.log('🔐 Token expired, attempting refresh...');
      const refreshed = await refreshToken();
      if (!refreshed) {
        console.log('🔐 Token refresh failed, logging out user');
        logout();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      console.log('🔐 Clearing token refresh scheduler');
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // =============================================================================
  // ✅ CONTEXT VALUE - MEMOIZADO PARA EVITAR RE-RENDERS DESNECESSÁRIOS
  // =============================================================================
  const contextValue = useMemo<AuthContextType>(() => {
    console.log('🔐 DEBUG: Context value memoization');
    console.log('🔐 Current state - User:', !!user, 'IsAuth:', isAuthenticated, 'Loading:', isLoading);

    return {
      // State
      user,
      isAuthenticated,
      isLoading,

      // Actions
      login,
      register,
      logout,
      refreshToken,
      updateUser,

      // Utils
      getToken,
      isTokenExpired,
    };
  }, [user, isAuthenticated, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// =============================================================================
// HOC FOR PROTECTED ROUTES
// =============================================================================
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    console.log('🔐 DEBUG withAuth HOC:');
    console.log('🔐 isAuthenticated:', isAuthenticated);
    console.log('🔐 isLoading:', isLoading);

    if (isLoading) {
      console.log('🔐 Showing loading screen');
      return (
        <div className="min-h-screen flex items-center justify-center bg-medieval-900">
          <div className="text-white text-xl font-medieval">
            🐺 Carregando...
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      console.log('🔐 User not authenticated, redirecting to login');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return null;
    }

    console.log('🔐 User authenticated, rendering component');
    return <Component {...props} />;
  };
}