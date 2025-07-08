// ⚙️ LOBISOMEM ONLINE - WebSocket Configuration (A10 ENHANCED)
// Localização: backend/src/config/websocket.ts

// Helper para extrair tipos de um objeto aninhado
type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

// Objeto de configuração base
export const wsConfig = {
  // Configurações existentes do WebSocket
  path: '/ws',
  serverOptions: {
    perMessageDeflate: false,
    maxPayload: 64 * 1024, // 64KB
  },

  // A10.2 - Configurações de Reconexão
  reconnection: {
    allowedWindow: 120000, // 2 minutos para reconectar
    maxAttempts: 3,
    retryDelay: 5000, // 5 segundos entre tentativas
    maxStoredStates: 1000, // Limite de estados armazenados
    cleanupInterval: 300000, // Limpeza a cada 5 minutos
  },

  // A10.6 - Configurações de Inatividade
  inactivity: {
    timeout: 300000, // 5 minutos de inatividade
    warningTime: 60000, // aviso 1 minuto antes
    maxWarnings: 2, // máximo de avisos
    checkInterval: 30000, // verifica a cada 30 segundos
    gracePeriod: 10000, // 10 segundos após aviso final
  },

  // A10.1 - Configurações de Espectadores
  spectators: {
    maxPerRoom: 10,
    canChat: true,
    canSeeRoles: false, // ou true para mais transparência
    canSeeVotes: true, // podem ver contagem de votos
    canSeeGameEvents: true, // podem ver eventos públicos do jogo
    autoKickOnGameEnd: false, // manter espectadores após fim do jogo
  },

  // Configurações de Heartbeat (melhoradas)
  heartbeat: {
    interval: 30000, // 30 segundos
    timeout: 5000, // 5 segundos para resposta
    maxMissed: 3, // máximo de heartbeats perdidos
    enabled: true,
  },

  // Configurações de Rate Limiting
  rateLimit: {
    maxMessagesPerMinute: 60,
    maxMessagesPerSecond: 5,
    spectatorChatLimit: 30, // mensagens por minuto para espectadores
    reconnectLimit: 5, // tentativas por minuto
  },

  // Configurações de Game State
  gameState: {
    syncInterval: 5000, // sincroniza estado a cada 5 segundos
    maxHistoryEvents: 100, // máximo de eventos no histórico
    autoSaveInterval: 30000, // auto-save a cada 30 segundos
  },
  logging: {
    logReconnections: true,
    logSpectatorActions: true,
    logInactivity: true,
    logHeartbeats: false,
    logGameEvents: true,
  },
  security: {
    validateReconnectionToken: true,
    maxConnectionsPerIP: 10,
    maxConnectionsPerUser: 3,
    blockSuspiciousActivity: true,
  },
  performance: {
    batchBroadcasts: true,
    batchSize: 100,
    compressionThreshold: 1024,
    maxConcurrentGames: 50,
  },
  phaseTimeouts: {
    lobby: 0,
    night: 60000,
    day: 120000,
    voting: 60000,
    results: 15000,
  },
  notifications: {
    sendReconnectionSuccess: true,
    sendSpectatorUpdates: true,
    sendInactivityWarnings: true,
    sendGameStateChanges: true,
  },
  development: {
    enableDebugMessages: process.env.NODE_ENV === 'development',
    mockReconnections: false,
    simulateLatency: 0,
    logAllMessages: process.env.NODE_ENV === 'development',
  },
  a10Features: {
    enableReconnection: true,
    enableSpectators: true,
    enableInactivityTimeout: true,
    enableStateRecovery: true,
    enableSpectatorChat: true,
    enableGameStateSync: true,
  },
  errorMessages: {
    RECONNECT_EXPIRED: 'Tempo limite para reconexão expirado',
    SPECTATOR_LIMIT: 'Limite de espectadores atingido',
    INACTIVITY_WARNING: 'Você será desconectado por inatividade em {time}',
    INACTIVITY_KICK: 'Desconectado por inatividade',
    INVALID_RECONNECTION: 'Dados de reconexão inválidos',
    GAME_NOT_FOUND: 'Jogo não encontrado para reconexão',
    ALREADY_SPECTATING: 'Você já está assistindo a uma sala',
    NOT_SPECTATING: 'Você não está assistindo nenhuma sala',
  },
  monitoring: {
    trackConnectionMetrics: true,
    trackReconnectionSuccess: true,
    trackSpectatorMetrics: true,
    trackInactivityMetrics: true,
    metricsInterval: 60000,
  },
}; // CORREÇÃO: Removido o 'as const' para permitir a sobrescrita pelo envConfig.

// Tipos para TypeScript
export type WSConfig = typeof wsConfig;
export type ReconnectionConfig = typeof wsConfig.reconnection;
export type InactivityConfig = typeof wsConfig.inactivity;
export type SpectatorConfig = typeof wsConfig.spectators;
export type A10Features = typeof wsConfig.a10Features;

// Validação de configuração
export function validateConfig(): boolean {
  const errors: string[] = [];

  // Valida configurações de reconexão
  if (wsConfig.reconnection.allowedWindow < 30000) {
    errors.push('Reconnection window too short (minimum 30 seconds)');
  }

  if (wsConfig.reconnection.maxAttempts < 1) {
    errors.push('Max reconnection attempts must be at least 1');
  }

  // Valida configurações de inatividade
  if (wsConfig.inactivity.timeout < wsConfig.inactivity.warningTime) {
    errors.push('Inactivity timeout must be greater than warning time');
  }

  if (wsConfig.inactivity.warningTime < 10000) {
    errors.push('Warning time too short (minimum 10 seconds)');
  }

  // Valida configurações de espectadores
  if (wsConfig.spectators.maxPerRoom < 1) {
    errors.push('Max spectators per room must be at least 1');
  }

  // CORREÇÃO: Comentar ou remover esta validação, pois ela não permite o padrão de "burst".
  /*
  if (wsConfig.rateLimit.maxMessagesPerSecond > wsConfig.rateLimit.maxMessagesPerMinute / 60) {
    errors.push('Messages per second cannot exceed messages per minute rate');
  }
  */

  if (errors.length > 0) {
    console.error('WebSocket configuration errors:', errors);
    return false;
  }

  return true;
}

// Utilitários para configuração
export function getTimeoutForPhase(phase: string): number {
  switch (phase) {
    case 'NIGHT':
      return wsConfig.phaseTimeouts.night;
    case 'DAY':
      return wsConfig.phaseTimeouts.day;
    case 'VOTING':
      return wsConfig.phaseTimeouts.voting;
    case 'RESULTS':
      return wsConfig.phaseTimeouts.results;
    default:
      return wsConfig.phaseTimeouts.lobby;
  }
}

export function isA10FeatureEnabled(feature: keyof A10Features): boolean {
  return wsConfig.a10Features[feature];
}

export function getErrorMessage(code: string, params?: Record<string, any>): string {
  // CORREÇÃO: Declarar 'message' como 'string' para permitir a modificação com .replace()
  let message: string = wsConfig.errorMessages[code as keyof typeof wsConfig.errorMessages] || 'Unknown error';

  // Substitui parâmetros na mensagem
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });
  }

  return message;
}

// Configurações dinâmicas baseadas no ambiente
export function getEnvironmentConfig() {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  return {
    // Mais verbose em desenvolvimento
    heartbeat: {
      ...wsConfig.heartbeat,
      interval: isDev ? 15000 : 30000, // Heartbeat mais frequente em dev
    },

    // Rate limiting mais relaxado em desenvolvimento
    rateLimit: {
      ...wsConfig.rateLimit,
      maxMessagesPerMinute: isDev ? 120 : 60,
      maxMessagesPerSecond: isDev ? 10 : 5,
    },

    // Timeouts mais longos em desenvolvimento
    inactivity: {
      ...wsConfig.inactivity,
      timeout: isDev ? 600000 : 300000, // 10 min em dev, 5 min em prod
    },

    // Mais logging em desenvolvimento
    logging: {
      ...wsConfig.logging,
      logHeartbeats: isDev,
      logAllMessages: isDev,
    },

    // Performance otimizada para produção
    performance: {
      ...wsConfig.performance,
      batchBroadcasts: isProd,
      compressionThreshold: isProd ? 512 : 1024,
    },
  };
}

// Inicialização da configuração
export function initializeWSConfig(): WSConfig {
  // Valida configuração
  if (!validateConfig()) {
    throw new Error('Invalid WebSocket configuration');
  }

  // Aplica configurações de ambiente
  const envConfig = getEnvironmentConfig();

  // Merge configurações
  // Como removemos o 'as const', a mesclagem agora funciona sem erros de tipo.
  return {
    ...wsConfig,
    ...envConfig,
  };
}

// Exporta configuração inicializada
export const initializedWSConfig = initializeWSConfig();