// 🐺 LOBISOMEM ONLINE - Service Factory (REESTRUTURADO E CORRIGIDO)
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → microservices
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { GameEngine } from '@/game/GameEngine'; // Importar o GameEngine real
import type { Player, GameState, IGameStateService, IEventBus, IServiceRegistry, GameConfig, ServiceMetadata } from '@/types';

//====================================================================
// IMPLEMENTAÇÕES EM MEMÓRIA (PARA MODO MONOLÍTICO)
//====================================================================

class LocalEventBus implements IEventBus {
    private listeners = new Map<string, Array<(event: any) => void>>();

    async publish<T>(channel: string, event: T): Promise<void> {
        const channelListeners = this.listeners.get(channel) || [];
        for (const listener of channelListeners) {
            try {
                listener(event);
            } catch (error) {
                logger.error('Error in event listener', error instanceof Error ? error : new Error('Unknown listener error'), {
                    channel,
                    event: typeof event === 'object' ? JSON.stringify(event) : String(event)
                });
            }
        }
    }

    async subscribe<T>(channel: string, handler: (event: T) => void): Promise<void> {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, []);
        }
        this.listeners.get(channel)!.push(handler);
    }

    async unsubscribe(channel: string): Promise<void> {
        this.listeners.delete(channel);
    }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        return {
            status: 'healthy',
            message: `Local EventBus OK - ${this.listeners.size} channels`
        };
    }
}

class MockServiceRegistry implements IServiceRegistry {
    private services = new Map<string, ServiceMetadata>();

    async registerService(serviceId: string, metadata: ServiceMetadata): Promise<void> {
        this.services.set(serviceId, metadata);
        logger.debug('Service registered', { serviceId, type: metadata.type });
    }

    async getAvailableServices(serviceType: string): Promise<string[]> {
        return Array.from(this.services.entries())
            .filter(([, meta]) => meta.type === serviceType)
            .map(([serviceId]) => serviceId);
    }

    async unregisterService(serviceId: string): Promise<void> {
        this.services.delete(serviceId);
        logger.debug('Service unregistered', { serviceId });
    }

    async getServiceMetadata(serviceId: string): Promise<ServiceMetadata | null> {
        return this.services.get(serviceId) || null;
    }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        return {
            status: 'healthy',
            message: `Mock Registry OK - ${this.services.size} services`
        };
    }
}

//====================================================================
// IMPLEMENTAÇÕES REDIS (PLACEHOLDERS PARA FASE 2)
//====================================================================

// ✅ CORREÇÃO: Alinhando os tipos de retorno com a interface IGameStateService atualizada
class RedisGameStateService implements IGameStateService {
    constructor(private redisUrl: string) { }

    // Métodos placeholder que cumprem a interface
    async createGame(hostId: string, config: GameConfig): Promise<GameState> { throw new Error('Not implemented'); }
    async startGame(gameId: string): Promise<boolean> { throw new Error('Not implemented'); }
    async endGame(gameId: string, reason?: string): Promise<void> { throw new Error('Not implemented'); }
    async forceEndGame(gameId: string, reason: string): Promise<boolean> { throw new Error('Not implemented'); }
    async addPlayer(gameId: string, player: Player): Promise<boolean> { throw new Error('Not implemented'); }
    async removePlayer(gameId: string, playerId: string): Promise<boolean> { throw new Error('Not implemented'); }
    async updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void> { throw new Error('Not implemented'); }
    async getGameState(gameId: string): Promise<GameState | null> { throw new Error('Not implemented'); }
    async getGame(gameId: string): Promise<GameState | null> { throw new Error('Not implemented'); }
    async getPlayer(gameId: string, playerId: string): Promise<Player | null> { throw new Error('Not implemented'); }
    async getAllPlayers(gameId: string): Promise<Player[]> { throw new Error('Not implemented'); }
    async updateGameState(gameId: string, updates: Partial<GameState>): Promise<void> { throw new Error('Not implemented'); }
    async nextPhase(gameId: string): Promise<void> { throw new Error('Not implemented'); }
    async performPlayerAction(gameId: string, playerId: string, action: any): Promise<boolean> { throw new Error('Not implemented'); }
    async getGamesByRoom(roomId: string): Promise<GameState[]> { throw new Error('Not implemented'); }
    async getActiveGamesCount(): Promise<number> { throw new Error('Not implemented'); }
    async onGameEvent(gameId: string, event: string, handler: (data: any) => void): Promise<void> { throw new Error('Not implemented'); }
    async cleanup(): Promise<void> { throw new Error('Not implemented'); }
    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> { return { status: 'unhealthy', message: 'Not implemented' }; }

    // ✅ CORREÇÃO: Adicionando os métodos que faltavam
    async emitGameEvent(gameId: string, event: string, data: any): Promise<void> { throw new Error('Not implemented'); }
    async forcePhase(gameId: string): Promise<void> { throw new Error('Not implemented'); }
}


class RedisEventBus implements IEventBus {
    constructor(private redisUrl: string) { }
    async publish<T>(channel: string, event: T): Promise<void> { throw new Error('Not implemented'); }
    async subscribe<T>(channel: string, handler: (event: T) => void): Promise<void> { throw new Error('Not implemented'); }
    async unsubscribe(channel: string, handler?: Function): Promise<void> { throw new Error('Not implemented'); }
    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> { return { status: 'unhealthy', message: 'Not implemented' }; }
}

class RedisServiceRegistry implements IServiceRegistry {
    constructor(private redisUrl: string) { }
    async registerService(serviceId: string, metadata: ServiceMetadata): Promise<void> { throw new Error('Not implemented'); }
    async getAvailableServices(serviceType: string): Promise<string[]> { throw new Error('Not implemented'); }
    async unregisterService(serviceId: string): Promise<void> { throw new Error('Not implemented'); }
    async getServiceMetadata(serviceId: string): Promise<ServiceMetadata | null> { throw new Error('Not implemented'); }
    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> { return { status: 'unhealthy', message: 'Not implemented' }; }
}

//====================================================================
// SERVICE FACTORY - ESTRUTURA CORRETA
//====================================================================

export class ServiceFactory {
    private static instances = new Map<string, any>();

    static getGameStateService(): IGameStateService {
        if (!this.instances.has('gameState')) {
            // Usa GameEngine para o modo 'memory', ou RedisGameStateService para 'redis'
            const service = config.STORAGE_TYPE === 'redis'
                ? new RedisGameStateService(config.REDIS_URL)
                : new GameEngine(); // ✅ AQUI ESTÁ A CORREÇÃO PRINCIPAL
            this.instances.set('gameState', service);
            logger.info('GameStateService initialized', { type: config.STORAGE_TYPE });
        }
        return this.instances.get('gameState');
    }

    static getEventBus(): IEventBus {
        if (!this.instances.has('eventBus')) {
            const bus = config.DISTRIBUTED_MODE
                ? new RedisEventBus(config.REDIS_URL)
                : new LocalEventBus();
            this.instances.set('eventBus', bus);
            logger.info('EventBus initialized', { type: config.DISTRIBUTED_MODE ? 'redis' : 'local' });
        }
        return this.instances.get('eventBus');
    }

    static getServiceRegistry(): IServiceRegistry {
        if (!this.instances.has('serviceRegistry')) {
            const registry = config.DISTRIBUTED_MODE
                ? new RedisServiceRegistry(config.REDIS_URL)
                : new MockServiceRegistry();
            this.instances.set('serviceRegistry', registry);
            logger.info('ServiceRegistry initialized', { type: config.DISTRIBUTED_MODE ? 'redis' : 'mock' });
        }
        return this.instances.get('serviceRegistry');
    }

    static clearInstances(): void {
        this.instances.clear();
        logger.info('ServiceFactory instances cleared');
    }
}