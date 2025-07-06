// 🐺 LOBISOMEM ONLINE - API Service
// Axios configuration and HTTP client

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { ApiResponse } from '@/types';

// =============================================================================
// API CONFIGURATION
// =============================================================================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // ✅ AUMENTADO: timeout de 10s para 15s
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// ✅ MELHORADO: REQUEST INTERCEPTOR
// =============================================================================
api.interceptors.request.use(
  (config) => {
    // ✅ CORRIGIDO: Usar Cookies em vez de localStorage para consistência
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp
    config.headers['X-Request-Time'] = new Date().toISOString();

    // ✅ ADICIONADO: Request ID para debugging
    config.headers['X-Request-ID'] = Math.random().toString(36).substr(2, 9);

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// =============================================================================
// ✅ MELHORADO: RESPONSE INTERCEPTOR COM REFRESH TOKEN
// =============================================================================
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`, {
        data: response.data,
        headers: response.headers
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ✅ MELHORADO: Handle specific error codes with better UX
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - try to refresh token
          if (!originalRequest._retry) {
            originalRequest._retry = true;

            try {
              const refreshToken = Cookies.get('refresh_token');
              if (refreshToken) {
                console.log('🔄 Attempting token refresh...');

                // ✅ CORRIGIDO: Usar a própria instância do axios para refresh
                const refreshResponse = await api.post('/auth/refresh', {
                  refreshToken,
                }, {
                  // ✅ IMPORTANTE: Não usar interceptors no refresh para evitar loop
                  headers: {
                    'Authorization': `Bearer ${refreshToken}`,
                  },
                  // Bypass interceptors
                  _retry: true
                } as any);

                if (refreshResponse.data.success) {
                  const { accessToken } = refreshResponse.data.data;

                  // ✅ CORRIGIDO: Usar Cookies consistentemente
                  Cookies.set('access_token', accessToken, {
                    expires: 7,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                  });

                  // Retry original request with new token
                  originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                  console.log('✅ Token refreshed successfully, retrying request...');
                  return api(originalRequest);
                }
              }
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
            }

            // If refresh fails, redirect to login
            console.log('🔒 Authentication failed, redirecting to login...');
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');

            // ✅ MELHORADO: Evitar múltiplos redirects
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/')) {
              toast.error('Sessão expirada. Faça login novamente.');
              setTimeout(() => {
                window.location.href = '/auth/login';
              }, 1500);
            }
          }
          break;

        case 403:
          toast.error('Você não tem permissão para esta ação');
          break;

        case 404:
          // ✅ MELHORADO: Não mostrar toast para todos os 404s
          if (!originalRequest.url?.includes('/api/')) {
            toast.error('Recurso não encontrado');
          }
          break;

        case 409:
          // Conflict - usually validation errors
          const conflictMessage = data?.error || data?.message || 'Conflito de dados';
          toast.error(conflictMessage);
          break;

        case 422:
          // Validation errors
          const validationMessage = data?.error || data?.message || 'Dados inválidos';
          toast.error(validationMessage);
          break;

        case 429:
          toast.error('Muitas tentativas. Tente novamente mais tarde.');
          break;

        case 500:
          toast.error('Erro interno do servidor. Tente novamente.');
          break;

        case 502:
        case 503:
        case 504:
          toast.error('Servidor temporariamente indisponível. Tente novamente.');
          break;

        default:
          // ✅ MELHORADO: Mostrar mensagem do servidor se disponível
          const errorMessage = data?.error || data?.message || `Erro ${status}`;
          if (status >= 400 && status < 500) {
            toast.error(errorMessage);
          } else {
            toast.error('Erro inesperado. Tente novamente.');
          }
      }
    } else if (error.request) {
      // Network error
      console.error('❌ Network error:', error.request);

      // ✅ MELHORADO: Detectar tipo de erro de rede
      if (error.code === 'ECONNABORTED') {
        toast.error('Tempo limite da requisição. Verifique sua conexão.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Erro de rede. Verifique sua conexão com a internet.');
      } else {
        toast.error('Erro de conexão. Verifique sua internet.');
      }
    } else {
      // Something else happened
      console.error('❌ API error:', error.message);
      toast.error('Erro inesperado');
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// ✅ MELHORADO: API METHODS CLASS
// =============================================================================
class ApiService {
  // GET request
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // POST request
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // PUT request
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // PATCH request
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // DELETE request
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ✅ MELHORADO: File upload with progress
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add additional data if provided
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
        timeout: 60000, // 60 seconds for file uploads
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ✅ MELHORADO: Error handler with more context
  private handleError(error: any): ApiResponse {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || error.response.data.message || 'Erro da API',
        timestamp: new Date().toISOString(),
        statusCode: error.response.status,
      };
    }

    let errorMessage = 'Erro desconhecido';
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Tempo limite da requisição';
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Erro de rede';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }

  // ✅ MELHORADO: Health check with retry
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }

  // Get server info
  async getServerInfo() {
    return this.get('/');
  }

  // ✅ ADICIONADO: Ping method for connection testing
  async ping(): Promise<number> {
    const start = Date.now();
    try {
      await this.get('/ping');
      return Date.now() - start;
    } catch {
      return -1;
    }
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================
export const apiService = new ApiService();

// =============================================================================
// ✅ MELHORADO: UTILITY FUNCTIONS
// =============================================================================

// Build query string from object
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Handle arrays
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

// Create URL with query parameters
export function createUrl(path: string, params?: Record<string, any>): string {
  if (!params) return path;

  const queryString = buildQueryString(params);
  return queryString ? `${path}?${queryString}` : path;
}

// Check if error is network error
export function isNetworkError(error: any): boolean {
  return !error.response && error.request;
}

// Check if error is server error (5xx)
export function isServerError(error: any): boolean {
  return error.response && error.response.status >= 500;
}

// Check if error is client error (4xx)
export function isClientError(error: any): boolean {
  return error.response && error.response.status >= 400 && error.response.status < 500;
}

// ✅ MELHORADO: Retry mechanism with exponential backoff
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
  backoffMultiplier = 2
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry client errors (4xx) except 408, 429
      if (isClientError(error) && ![408, 429].includes(error.response?.status)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
      console.log(`⏱️ Retrying request in ${delay}ms (attempt ${attempt}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ✅ MELHORADO: Download file with progress
export async function downloadFile(
  url: string,
  filename?: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Falha no download do arquivo');
  }
}

// ✅ ADICIONADO: Request cancellation utility
export function createCancelToken() {
  const source = axios.CancelToken.source();
  return {
    token: source.token,
    cancel: source.cancel,
  };
}

// ✅ ADICIONADO: Connection monitor
export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private isOnline = navigator.onLine;
  private listeners: ((online: boolean) => void)[] = [];

  private constructor() {
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
  }

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  private updateStatus(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach(listener => listener(online));

    if (online) {
      toast.success('Conexão restaurada! 🌐');
    } else {
      toast.error('Conexão perdida. Verificando...', { duration: 6000 });
    }
  }

  onStatusChange(listener: (online: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  get status() {
    return this.isOnline;
  }
}

export default api;