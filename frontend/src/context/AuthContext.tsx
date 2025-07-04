'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  // COMPUTED VALUES
  // =============================================================================
  const isAuthenticated = !!user;

  // =============================================================================
  // TOKEN MANAGEMENT
  // =============================================================================
  const getToken = (): string | null => {
    return Cookies.get('access_token') || null;
  };

  const setTokens = (tokens: AuthTokens) => {
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
  };

  const clearTokens = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  };

  const isTokenExpired = (): boolean => {
    const token = getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  // =============================================================================
  // AUTHENTICATION ACTIONS
  // =============================================================================
  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);

      if (response.success && response.data) {
        setUser(response.data.user);
        setTokens(response.data.tokens);
        toast.success(`Bem-vindo de volta, ${response.data.user.username}! 🐺`);
        return true;
      }

      toast.error(response.error || 'Erro ao fazer login');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro de conexão. Tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.register(data);

      if (response.success && response.data) {
        setUser(response.data.user);
        setTokens(response.data.tokens);
        toast.success(`Conta criada com sucesso! Bem-vindo, ${data.username}! 🎮`);
        return true;
      }

      toast.error(response.error || 'Erro ao criar conta');
      return false;
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Erro de conexão. Tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    clearTokens();
    toast.success('Logout realizado com sucesso!');

    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = Cookies.get('refresh_token');
      if (!refreshToken) return false;

      const response = await authService.refreshToken(refreshToken);

      if (response.success && response.data) {
        setTokens(response.data.tokens);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getToken();

        if (!token || isTokenExpired()) {
          // Try to refresh token
          const refreshed = await refreshToken();
          if (!refreshed) {
            setIsLoading(false);
            return;
          }
        }

        // Get user profile
        const profileResponse = await authService.getProfile();
        if (profileResponse.success && profileResponse.data) {
          setUser(profileResponse.data);
        } else {
          // Token is invalid, clear it
          clearTokens();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // =============================================================================
  // TOKEN REFRESH SCHEDULER
  // =============================================================================
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh token every 30 minutes if user is active
    const interval = setInterval(async () => {
      if (!isTokenExpired()) return;

      const refreshed = await refreshToken();
      if (!refreshed) {
        logout();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  const contextValue: AuthContextType = {
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

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-medieval-900">
          <div className="text-white text-xl font-medieval">
            🐺 Carregando...
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return null;
    }

    return <Component {...props} />;
  };
}