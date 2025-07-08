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

// Create axios instance with STANDARDIZED NAME
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['X-Request-Time'] = new Date().toISOString();
    config.headers['X-Request-ID'] = Math.random().toString(36).substr(2, 9);

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
// RESPONSE INTERCEPTOR
// =============================================================================
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
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

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          if (!originalRequest._retry) {
            originalRequest._retry = true;

            try {
              const refreshToken = Cookies.get('refresh_token');
              if (refreshToken) {
                console.log('🔄 Attempting token refresh...');

                const refreshResponse = await apiClient.post('/auth/refresh', {
                  refreshToken,
                }, {
                  headers: {
                    'Authorization': `Bearer ${refreshToken}`,
                  },
                  _retry: true
                } as any);

                if (refreshResponse.data.success) {
                  const { accessToken } = refreshResponse.data.data;

                  Cookies.set('access_token', accessToken, {
                    expires: 7,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                  });

                  originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                  console.log('✅ Token refreshed successfully, retrying request...');
                  return apiClient(originalRequest);
                }
              }
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
            }

            console.log('🔒 Authentication failed, redirecting to login...');
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');

            if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/')) {
              toast.error('Sessão expirada. Faça login novamente.');

              const { default: Router } = await import('next/router');
              setTimeout(() => {
                Router.push('/auth/login');
              }, 1500);
            }
          }
          break;

        case 403:
          toast.error('Você não tem permissão para esta ação');
          break;

        case 404:
          if (!originalRequest.url?.includes('/api/')) {
            toast.error('Recurso não encontrado');
          }
          break;

        case 409:
          const conflictMessage = data?.error || data?.message || 'Conflito de dados';
          toast.error(conflictMessage);
          break;

        case 422:
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
          const errorMessage = data?.error || data?.message || `Erro ${status}`;
          if (status >= 400 && status < 500) {
            toast.error(errorMessage);
          } else {
            toast.error('Erro inesperado. Tente novamente.');
          }
      }
    } else if (error.request) {
      console.error('❌ Network error:', error.request);

      if (error.code === 'ECONNABORTED') {
        toast.error('Tempo limite da requisição. Verifique sua conexão.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Erro de rede. Verifique sua conexão com a internet.');
      } else {
        toast.error('Erro de conexão. Verifique sua internet.');
      }
    } else {
      console.error('❌ API error:', error.message);
      toast.error('Erro inesperado');
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// API METHODS CLASS
// =============================================================================
class ApiService {
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await apiClient.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
        timeout: 60000,
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }

  async getServerInfo() {
    return this.get('/');
  }

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
// UTILITY FUNCTIONS
// =============================================================================

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

export function createUrl(path: string, params?: Record<string, any>): string {
  if (!params) return path;

  const queryString = buildQueryString(params);
  return queryString ? `${path}?${queryString}` : path;
}

export function isNetworkError(error: any): boolean {
  return !error.response && error.request;
}

export function isServerError(error: any): boolean {
  return error.response && error.response.status >= 500;
}

export function isClientError(error: any): boolean {
  return error.response && error.response.status >= 400 && error.response.status < 500;
}

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

      if (isClientError(error) && ![408, 429].includes(error.response?.status)) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
      console.log(`⏱️ Retrying request in ${delay}ms (attempt ${attempt}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function downloadFile(
  url: string,
  filename?: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    const response = await apiClient.get(url, {
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

export function createCancelToken() {
  const source = axios.CancelToken.source();
  return {
    token: source.token,
    cancel: source.cancel,
  };
}

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

// =============================================================================
// EXPORTS - PADRONIZADOS
// =============================================================================
export default apiClient;
export { apiClient };