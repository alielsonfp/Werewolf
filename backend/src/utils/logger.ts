// 🐺 LOBISOMEM ONLINE - Logger Utility (CORRIGIDO FINALMENTE)
import { config } from '@/config/environment';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  module?: string | undefined;
  metadata?: Record<string, any> | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
}

class Logger {
  private readonly serviceName: string;
  private readonly moduleContext?: string;

  // ✅ CORREÇÃO FINAL E DEFINITIVA
  constructor(serviceName: string = config.SERVICE_ID, moduleContext?: string) {
    this.serviceName = serviceName;
    // Esta verificação explícita satisfaz o compilador estrito.
    if (moduleContext !== undefined) {
      this.moduleContext = moduleContext;
    }
  }

  public child(moduleContext: string): Logger {
    return new Logger(this.serviceName, moduleContext);
  }

  public error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const context: { error?: Error; metadata?: Record<string, any> } = {};
    if (error) context.error = error;
    if (metadata) context.metadata = metadata;
    this.log(LogLevel.ERROR, message, context);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    const context: { metadata?: Record<string, any> } = {};
    if (metadata) context.metadata = metadata;
    this.log(LogLevel.WARN, message, context);
  }

  public info(message: string, metadata?: Record<string, any>): void {
    const context: { metadata?: Record<string, any> } = {};
    if (metadata) context.metadata = metadata;
    this.log(LogLevel.INFO, message, context);
  }

  public debug(message: string, metadata?: Record<string, any>): void {
    if (config.IS_DEVELOPMENT) {
      const context: { metadata?: Record<string, any> } = {};
      if (metadata) context.metadata = metadata;
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: {
      error?: Error;
      metadata?: Record<string, any>;
    }
  ): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      ...(this.moduleContext && { module: this.moduleContext }),
      ...(context?.metadata && { metadata: context.metadata }),
      ...(context?.error && {
        error: {
          name: context.error.name,
          message: context.error.message,
          ...(context.error.stack && { stack: context.error.stack }),
        },
      }),
    };

    if (config.IS_PRODUCTION) {
      console.log(JSON.stringify(logEntry));
    } else {
      this.prettyLog(logEntry);
    }
  }

  private prettyLog(entry: LogEntry): void {
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m',
      [LogLevel.WARN]: '\x1b[33m',
      [LogLevel.INFO]: '\x1b[36m',
      [LogLevel.DEBUG]: '\x1b[37m',
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level] || reset;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const service = `[${entry.service}]`;
    const module = entry.module ? `[${entry.module}]` : '';

    const logLine = `${color}${entry.level.padEnd(5)}${reset} ${timestamp} ${service}${module} ${entry.message}`;
    console.log(logLine);

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log(`  ${color}└─ Metadata:${reset}`, entry.metadata);
    }
    if (entry.error) {
      console.log(`  ${color}└─ Error: ${entry.error.name}: ${entry.error.message}${reset}`);
      if (entry.error.stack && config.IS_DEVELOPMENT) {
        console.log(entry.error.stack.split('\n').slice(1).map(s => `    ${s.trim()}`).join('\n'));
      }
    }
  }
}

export const logger = new Logger();
export const gameLogger = logger.child('game');
export const wsLogger = logger.child('websocket');
export const authLogger = logger.child('auth');
export const dbLogger = logger.child('database');
export const redisLogger = logger.child('redis');

export class PerformanceLogger {
  private timers: Map<string, number> = new Map();
  public start(operationId: string): void { this.timers.set(operationId, Date.now()); }
  public end(operationId: string, description?: string): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      logger.warn(`Performance timer not found: ${operationId}`);
      return 0;
    }
    const duration = Date.now() - startTime;
    this.timers.delete(operationId);
    logger.debug(`Performance: ${description || operationId}`, { operationId, duration: `${duration}ms` });
    return duration;
  }
  public async measure<T>(operationId: string, operation: () => Promise<T>, description?: string): Promise<T> {
    this.start(operationId);
    try { return await operation(); } finally { this.end(operationId, description); }
  }
}
export const performanceLogger = new PerformanceLogger();
export interface RequestLogContext {
  method: string;
  url: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
  userId?: string | undefined;
  statusCode?: number | undefined;
  duration?: number | undefined;
}
export function logRequest(context: RequestLogContext): void {
  const message = `${context.method} ${context.url}`;
  const metadata = { type: 'http_request', ...context };
  if (context.statusCode && context.statusCode >= 400) {
    logger.warn(message, metadata);
  } else {
    logger.info(message, metadata);
  }
}
export default logger;