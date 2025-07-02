// 🐺 LOBISOMEM ONLINE - API Types
// Common API response types and request interfaces

// =============================================================================
// STANDARD API RESPONSES
// =============================================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// =============================================================================
// PAGINATION
// =============================================================================
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// REQUEST CONTEXT
// =============================================================================
export interface AuthenticatedRequest {
  userId: string;
  username: string;
  email: string;
}

export interface RequestContext extends AuthenticatedRequest {
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// SERVICE INTERFACES (CRITICAL FOR PHASE 2)
// =============================================================================

// Base service interface
export interface IService {
  readonly serviceName: string;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }>;
}

// Event bus for inter-service communication
export interface IEventBus {
  publish<T>(channel: string, event: T): Promise<void>;
  subscribe<T>(channel: string, handler: (event: T) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
}

// Service registry for discovery (Phase 2)
export interface IServiceRegistry {
  registerService(serviceId: string, metadata: ServiceMetadata): Promise<void>;
  getAvailableServices(serviceType: string): Promise<string[]>;
  unregisterService(serviceId: string): Promise<void>;
  getServiceMetadata(serviceId: string): Promise<ServiceMetadata | null>;
}

export interface ServiceMetadata {
  id: string;
  type: 'lobby' | 'game' | 'chat';
  host: string;
  port: number;
  capabilities: string[];
  maxRooms?: number;
  currentRooms?: number;
  status: 'healthy' | 'unhealthy';
  lastHeartbeat: Date;
}

// =============================================================================
// HTTP STATUS HELPERS
// =============================================================================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// =============================================================================
// API ENDPOINT TYPES
// =============================================================================
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  requiresAuth: boolean;
  rateLimited: boolean;
  description: string;
}

// =============================================================================
// RATE LIMITING
// =============================================================================
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: {
    id: string;
    type: string;
    mode: string;
  };
  database: {
    status: 'healthy' | 'unhealthy';
    message: string;
    timestamp: string;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    message: string;
    timestamp: string;
  };
  uptime: number;
  memory: NodeJS.MemoryUsage;
}