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
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp
    config.headers['X-Request-Time'] = new Date().toISOString();

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
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
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle specific error codes
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
                const refreshResponse = await api.post('/auth/refresh', {
                  refreshToken,
                });

                if (refreshResponse.data.success) {
                  const { accessToken } = refreshResponse.data.data;
                  Cookies.set('access_token', accessToken, { expires: 7 });

                  // Retry original request
                  originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                  return api(originalRequest);
                }
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }

            // If refresh fails, redirect to login
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');

            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
          }
          break;

        case 403:
          toast.error('Você não tem permissão para esta ação');
          break;

        case 404:
          toast.error('Recurso não encontrado');
          break;

        case 429:
          toast.error('Muitas tentativas. Tente novamente mais tarde.');
          break;

        case 500:
          toast.error('Erro interno do servidor');
          break;

        default:
          // Show error message from API if available
          const errorMessage = data?.error || data?.message || 'Erro inesperado';
          toast.error(errorMessage);
      }
    } else if (error.request) {
      // Network error
      toast.error('Erro de conexão. Verifique sua internet.');
      console.error('❌ Network error:', error.request);
    } else {
      // Something else happened
      toast.error('Erro inesperado');
      console.error('❌ API error:', error.message);
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// API METHODS
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

  // File upload
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

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
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler
  private handleError(error: any): ApiResponse {
    if (error.response?.data) {
      return error.response.data;
    }

    return {
      success: false,
      error: error.message || 'Erro desconhecido',
      timestamp: new Date().toISOString(),
    };
  }

  // Health check
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
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================
export const apiService = new ApiService();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Build query string from object
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
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

// Retry mechanism for failed requests
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry client errors (4xx)
      if (isClientError(error)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

// Download file from URL
export async function downloadFile(url: string, filename?: string): Promise<void> {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
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

export default api;