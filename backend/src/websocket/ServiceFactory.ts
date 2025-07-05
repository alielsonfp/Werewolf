// 🐺 LOBISOMEM ONLINE - Service Factory (REFATORADO)
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → microservices
import { config } from '@/config/environment';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { GameState, Player } from '@/game/Game'; // ✅ Usar classe real
import type {
    IGameStateService,
    IEventBus,
    IServiceRegistry,
    GameConfig,
    ServiceMetadata
} from '@/types';

//====================================================================
// MEMORY IMPLEMENTATIONS (PHASE 1) - CORRIGIDAS
//====================================================================

class MemoryGameStateService implements IGameStateService {
    private games = new Map<string, GameState>(); // ✅ Usar GameState não Game
    private players = new Map<string, Map<string, Player>>();

    async createGame(hostId: string, config: GameConfig): Promise<GameState> {
        const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // ✅ Criar GameState real
        const gameState = new GameState(gameId, config, hostId);

        this.games.set(gameId, gameState);
        this.players.set(gameId, new Map());

        logger.info('Game created in memory', { gameId, hostId });
        return gameState;
    }

    async getGame(gameId: string): Promise<GameState | null> {
        return this.games.get(gameId) || null;
    }

    async updateGameState(gameId: string, updates: Partial<GameState>): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) throw new Error(`Game ${gameId} not found`);

        // ✅ Aplicar updates na classe real
        Object.assign(gameState, updates);
        gameState.updatedAt = new Date();
    }

    async deleteGame(gameId: string): Promise<void> {
        this.games.delete(gameId);
        this.players.delete(gameId);
        logger.info('Game deleted from memory', { gameId });
    }

    async addPlayer(gameId: string, player: Player): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) throw new Error(`Game ${gameId} not found`);

        // ✅ Usar método da classe GameState
        const success = gameState.addPlayer(player);
        if (!success) {
            throw new Error('Failed to add player to game');
        }

        // Manter cache de players para queries rápidas
        const gamePlayers = this.players.get(gameId)!;
        gamePlayers.set(player.id, player);
    }

    async removePlayer(gameId: string, playerId: string): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) return;

        gameState.removePlayer(playerId);

        const gamePlayers = this.players.get(gameId);
        if (gamePlayers) {
            gamePlayers.delete(playerId);
        }
    }

    async updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) return;

        const player = gameState.getPlayer(playerId);
        if (player) {
            Object.assign(player, updates);
        }

        // Atualizar cache também
        const gamePlayers = this.players.get(gameId);
        if (gamePlayers) {
            const cachedPlayer = gamePlayers.get(playerId);
            if (cachedPlayer) {
                Object.assign(cachedPlayer, updates);
            }
        }
    }

    async getGameState(gameId: string): Promise<GameState | null> {
        // ✅ Retornar o estado real da classe
        return this.games.get(gameId) || null;
    }

    async getPlayer(gameId: string, playerId: string): Promise<Player | null> {
        const gameState = this.games.get(gameId);
        return gameState?.getPlayer(playerId) || null;
    }

    async getAllPlayers(gameId: string): Promise<Player[]> {
        const gameState = this.games.get(gameId);
        return gameState ? gameState.players : [];
    }

    async getGamesByRoom(roomId: string): Promise<GameState[]> {
        const games: GameState[] = [];
        for (const gameState of this.games.values()) {
            if (gameState.roomId === roomId) {
                games.push(gameState);
            }
        }
        return games;
    }

    async getActiveGamesCount(): Promise<number> {
        let count = 0;
        for (const gameState of this.games.values()) {
            if (gameState.status === 'PLAYING' || gameState.status === 'STARTING') {
                count++;
            }
        }
        return count;
    }

    cleanup(): number {
        const count = this.games.size;
        this.games.clear();
        this.players.clear();
        return count;
    }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        return {
            status: 'healthy',
            message: `Memory storage OK - ${this.games.size} games active`
        };
    }
}

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
        const services: string[] = [];
        for (const [serviceId, metadata] of this.services.entries()) {
            if (metadata.type === serviceType) {
                services.push(serviceId);
            }
        }
        return services;
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
// REDIS IMPLEMENTATIONS (PHASE 2) - PLACEHOLDERS CORRIGIDOS
//====================================================================

class RedisGameStateService implements IGameStateService {
    constructor(private redisUrl: string) { }

    async createGame(hostId: string, config: GameConfig): Promise<GameState> {
        // TODO: Implementar Redis
        throw new Error('Redis GameStateService not implemented yet');
    }

    async getGame(gameId: string): Promise<GameState | null> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async updateGameState(gameId: string, updates: Partial<GameState>): Promise<void> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async deleteGame(gameId: string): Promise<void> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async addPlayer(gameId: string, player: Player): Promise<void> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async removePlayer(gameId: string, playerId: string): Promise<void> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async getGameState(gameId: string): Promise<GameState | null> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async getPlayer(gameId: string, playerId: string): Promise<Player | null> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async getAllPlayers(gameId: string): Promise<Player[]> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async getGamesByRoom(roomId: string): Promise<GameState[]> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    async getActiveGamesCount(): Promise<number> {
        throw new Error('Redis GameStateService not implemented yet');
    }

    cleanup(): number {
        return 0;
    }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        return { status: 'unhealthy', message: 'Redis GameStateService not implemented' };
    }
}

class RedisEventBus implements IEventBus {
    constructor(private redisUrl: string) { }

    async publish<T>(channel: string, event: T): Promise<void> {
        // TODO: Implementar Redis Pub/Sub
        throw new Error('Redis EventBus not implemented yet');
    }

    async subscribe<T>(channel: string, handler: (event: T) => void): Promise<void> {
        throw new Error('Redis EventBus not implemented yet');
    }

    async unsubscribe(channel: string): Promise<void> {
        throw new Error('Redis EventBus not implemented yet');
    }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        return { status: 'unhealthy', message: 'Redis EventBus not implemented' };
    }
}

class RedisServiceRegistry implements IServiceRegistry {
    constructor(private redisUrl: string) { }

    async registerService(serviceId: string, metadata: ServiceMetadata): Promise<void> {
        throw new Error('Redis ServiceRegistry not implemented yet');
    }

    async getAvailableServices(serviceType: string): Promise<string[]> {
        throw new Error('Redis ServiceRegistry not implemented yet');
    }

    async unregisterService(serviceId: string): Promise<void> {
        throw new Error('Redis ServiceRegistry not implemented yet');
    }

    async getServiceMetadata(serviceId: string): Promise<ServiceMetadata | null> {
        throw new Error('Redis ServiceRegistry not implemented yet');
    }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        return { status: 'unhealthy', message: 'Redis ServiceRegistry not implemented' };
    }
}

//====================================================================
// SERVICE FACTORY - CORRIGIDA
//====================================================================

export class ServiceFactory {
    private static instances = new Map<string, any>();

    static getGameStateService(): IGameStateService {
        if (!this.instances.has('gameState')) {
            const service = config.STORAGE_TYPE === 'redis'
                ? new RedisGameStateService(config.REDIS_URL)
                : new MemoryGameStateService();
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

    static async getServicesHealth(): Promise<Record<string, any>> {
        const health: Record<string, any> = {};
        const services = [
            { name: 'gameState', service: this.getGameStateService() },
            { name: 'eventBus', service: this.getEventBus() },
            { name: 'serviceRegistry', service: this.getServiceRegistry() },
        ];

        for (const { name, service } of services) {
            try {
                if (service.healthCheck) {
                    health[name] = await service.healthCheck();
                } else {
                    health[name] = { status: 'healthy', message: 'No health check available' };
                }
            } catch (error) {
                health[name] = {
                    status: 'unhealthy',
                    message: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
        return health;
    }

    static getServicesStats(): Record<string, any> {
        return {
            gameState: {
                type: config.STORAGE_TYPE,
                distributed: config.DISTRIBUTED_MODE
            },
            eventBus: {
                type: config.DISTRIBUTED_MODE ? 'redis' : 'local'
            },
            serviceRegistry: {
                type: config.DISTRIBUTED_MODE ? 'redis' : 'mock'
            }
        };
    }

    static async cleanup(): Promise<void> {
        const gameStateService = this.getGameStateService();
        if (gameStateService.cleanup) {
            const cleanedCount = gameStateService.cleanup();
            logger.info('GameStateService cleanup completed', { cleanedCount });
        }

        this.instances.clear();
        logger.info('ServiceFactory instances cleared');
    }

    static clearInstances(): void {
        this.instances.clear();
        logger.info('ServiceFactory instances cleared');
    }
}