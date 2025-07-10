// 🐺 LOBISOMEM ONLINE - Logger Utility
// Structured logging for the application

import { config } from '@/config/environment';

// =============================================================================
// LOG LEVELS
// =============================================================================
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

// =============================================================================
// ✅ LOG ENTRY INTERFACE - CORRIGIDA COM PROPRIEDADES OPCIONAIS
// =============================================================================
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string; // ✅ OPCIONAL - resolve exactOptionalPropertyTypes
  module?: string;
  userId?: string;
  roomId?: string;
  gameId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// =============================================================================
// ✅ LOGGER CLASS - CORRIGIDO COM TIPAGEM CORRETA
// =============================================================================
class Logger {
  private serviceName: string;
  private moduleContext: string | undefined; // ✅ TIPO CORRIGIDO

  constructor(serviceName?: string, moduleContext?: string) {
    // ✅ SEMPRE garante que serviceName seja string
    this.serviceName = serviceName || config.SERVICE_ID || 'werewolf-service';
    this.moduleContext = moduleContext; // ✅ AGORA COMPATÍVEL
  }

  /**
   * Create a child logger for a specific module
   */
  child(moduleContext: string): Logger {
    return new Logger(this.serviceName, moduleContext);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, {
      ...(error && { error }),
      ...(metadata && { metadata })
    });
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, {
      ...(metadata && { metadata })
    });
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, {
      ...(metadata && { metadata })
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (config.IS_DEVELOPMENT) {
      this.log(LogLevel.DEBUG, message, {
        ...(metadata && { metadata })
      });
    }
  }

  /**
   * Log game-specific events
   */
  game(
    level: LogLevel,
    message: string,
    gameContext: {
      userId?: string;
      roomId?: string;
      gameId?: string;
      phase?: string;
      action?: string;
    },
    metadata?: Record<string, any>
  ): void {
    this.log(level, message, {
      metadata: {
        ...gameContext,
        ...metadata,
      },
    });
  }

  /**
   * Log WebSocket events
   */
  websocket(
    level: LogLevel,
    message: string,
    wsContext: {
      userId?: string;
      roomId?: string;
      connectionId?: string;
      event?: string;
    },
    metadata?: Record<string, any>
  ): void {
    this.log(level, message, {
      metadata: {
        ...wsContext,
        ...metadata,
        type: 'websocket',
      },
    });
  }

  /**
   * Log authentication events
   */
  auth(
    level: LogLevel,
    message: string,
    authContext: {
      userId?: string;
      email?: string;
      action?: string;
      ip?: string;
    },
    metadata?: Record<string, any>
  ): void {
    this.log(level, message, {
      metadata: {
        ...authContext,
        ...metadata,
        type: 'auth',
      },
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: {
      error?: Error;
      metadata?: Record<string, any>;
    }
  ): void {
    // ✅ CORRIGIDO: service sempre será string com fallback
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      ...(this.moduleContext && { module: this.moduleContext }),
      ...context?.metadata,
    };

    // Add error details if present
    if (context?.error) {
      logEntry.error = {
        name: context.error.name,
        message: context.error.message,
        ...(context.error.stack && { stack: context.error.stack }),
      };
    }

    // Output based on environment
    if (config.IS_PRODUCTION) {
      // Structured JSON logging for production
      console.log(JSON.stringify(logEntry));
    } else {
      // Pretty formatted logging for development
      this.prettyLog(logEntry);
    }
  }

  /**
   * Pretty print logs for development
   */
  private prettyLog(entry: LogEntry): void {
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.INFO]: '\x1b[36m',  // Cyan
      [LogLevel.DEBUG]: '\x1b[37m', // White
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level];

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const service = entry.service || 'werewolf-service';
    const module = entry.module ? `[${entry.module}]` : '';

    let logLine = `${color}${entry.level}${reset} ${timestamp} ${service}${module}: ${entry.message}`;

    console.log(logLine);

    // Log metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log('  Metadata:', entry.metadata);
    }

    // Log error details if present
    if (entry.error) {
      console.log('  Error:', entry.error.message);
      if (entry.error.stack && config.IS_DEVELOPMENT) {
        console.log('  Stack:', entry.error.stack);
      }
    }
  }
}

// =============================================================================
// CREATE DEFAULT LOGGER INSTANCE
// =============================================================================
export const logger = new Logger();

// =============================================================================
// SPECIALIZED LOGGERS
// =============================================================================
export const gameLogger = logger.child('game');
export const wsLogger = logger.child('websocket');
export const authLogger = logger.child('auth');
export const dbLogger = logger.child('database');
export const redisLogger = logger.child('redis');

// =============================================================================
// PERFORMANCE LOGGING
// =============================================================================
export class PerformanceLogger {
  private timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  start(operationId: string): void {
    this.timers.set(operationId, Date.now());
  }

  /**
   * End timing and log the duration
   */
  end(operationId: string, description?: string): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      logger.warn(`Performance timer not found: ${operationId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);

    logger.debug(`Performance: ${description || operationId}`, {
      operationId,
      duration: `${duration}ms`,
    });

    return duration;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operationId: string,
    operation: () => Promise<T>,
    description?: string
  ): Promise<T> {
    this.start(operationId);
    try {
      const result = await operation();
      this.end(operationId, description);
      return result;
    } catch (error) {
      this.end(operationId, `${description || operationId} (failed)`);
      throw error;
    }
  }
}

export const performanceLogger = new PerformanceLogger();

// =============================================================================
// REQUEST LOGGING MIDDLEWARE HELPER
// =============================================================================
export interface RequestLogContext {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  statusCode?: number;
  duration?: number;
}

export function logRequest(context: RequestLogContext): void {
  const level = context.statusCode && context.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

  logger.info(`${context.method} ${context.url}`, {
    type: 'http_request',
    ...context,
  });
}

// =============================================================================
// EXPORT DEFAULT LOGGER
// =============================================================================
export default logger;