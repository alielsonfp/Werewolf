// 🐺 LOBISOMEM ONLINE - Service Factory
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → microservices
import { config } from '@/config/environment';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import type { IGameStateService, IEventBus, IServiceRegistry, Game, GameConfig, GameState, Player, ServiceMetadata } from '@/types';


//====================================================================
// MEMORY IMPLEMENTATIONS (PHASE 1)
//====================================================================

class MemoryGameStateService implements IGameStateService {
    private games = new Map<string, Game>();
    private gameStates = new Map<string, GameState>();
    private players = new Map<string, Map<string, Player>>();

    async createGame(hostId: string, config: GameConfig): Promise<Game> {
        const gameId = `game-${Date.now()}`;
        const game: Game = {
            id: gameId,
            roomId: config.roomId || `room-${gameId}`,
            status: 'WAITING',
            phase: 'LOBBY',
            players: [],
            spectators: [],
            gameConfig: config,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.games.set(gameId, game);
        this.players.set(gameId, new Map());
        return game;
    }

    async addPlayer(gameId: string, player: Player): Promise<void> {
        const game = this.games.get(gameId);
        if (!game) throw new Error(`Game ${gameId} not found`);
        const gamePlayers = this.players.get(gameId)!;
        gamePlayers.set(player.id, player);

        // CORREÇÃO: Adicionando tipo explícito para 'p'
        game.players = Array.from(gamePlayers.values()).filter((p: Player) => !p.isSpectator);
        game.spectators = Array.from(gamePlayers.values()).filter((p: Player) => p.isSpectator);
    }
    // ... (restante dos métodos de MemoryGameStateService)

    async getGame(gameId: string): Promise<Game | null> {
        return this.games.get(gameId) || null;
    }

    async updateGameState(gameId: string, updates: Partial<GameState>): Promise<void> {
        const currentState = this.gameStates.get(gameId);
        if (currentState) {
            Object.assign(currentState, updates, { updatedAt: new Date() });
        }
    }

    async deleteGame(gameId: string): Promise<void> {
        this.games.delete(gameId);
        this.gameStates.delete(gameId);
        this.players.delete(gameId);
        logger.info('Game deleted from memory', { gameId });
    }

    async removePlayer(gameId: string, playerId: string): Promise<void> {
        const gamePlayers = this.players.get(gameId);
        if (!gamePlayers) return;

        gamePlayers.delete(playerId);

        const game = this.games.get(gameId);
        if (game) {
            game.players = Array.from(gamePlayers.values()).filter((p: Player) => !p.isSpectator);
            game.spectators = Array.from(gamePlayers.values()).filter((p: Player) => p.isSpectator);
            game.updatedAt = new Date();
        }
    }

    async updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void> {
        const gamePlayers = this.players.get(gameId);
        if (!gamePlayers) return;

        const player = gamePlayers.get(playerId);
        if (player) {
            Object.assign(player, updates);
        }
    }

    async getGameState(gameId: string): Promise<GameState | null> {
        const game = this.games.get(gameId);
        if (!game) return null;

        return {
            gameId,
            roomId: game.roomId,
            status: game.status,
            phase: game.phase,
            players: game.players,
            spectators: game.spectators,
            hostId: game.players.find((p: Player) => p.isHost)?.userId || '',
            currentDay: 1,
            timeLeft: 0,
            events: [],
            eliminatedPlayers: [],
            config: game.gameConfig,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
        };
    }

    async getPlayer(gameId: string, playerId: string): Promise<Player | null> {
        const gamePlayers = this.players.get(gameId);
        return gamePlayers?.get(playerId) || null;
    }

    async getAllPlayers(gameId: string): Promise<Player[]> {
        const gamePlayers = this.players.get(gameId);
        return gamePlayers ? Array.from(gamePlayers.values()) : [];
    }

    async getGamesByRoom(roomId: string): Promise<Game[]> {
        const games: Game[] = [];
        for (const game of this.games.values()) {
            if (game.roomId === roomId) {
                games.push(game);
            }
        }
        return games;
    }

    async getActiveGamesCount(): Promise<number> {
        let count = 0;
        for (const game of this.games.values()) {
            if (game.status === 'PLAYING' || game.status === 'STARTING') {
                count++;
            }
        }
        return count;
    }

    cleanup(): number { return 0; }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        return { status: 'healthy', message: 'Memory OK' };
    }
}
class LocalEventBus implements IEventBus {
    private listeners = new Map<string, Array<(event: any) => void>>();

    async publish<T>(channel: string, event: T): Promise<void> {
        const channelListeners = this.listeners.get(channel) || [];
        for (const listener of channelListeners) {
            listener(event);
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
        return { status: 'healthy', message: 'Local Bus OK' };
    }
}
class MockServiceRegistry implements IServiceRegistry {
    private services = new Map<string, ServiceMetadata>();
    async registerService(serviceId: string, metadata: ServiceMetadata): Promise<void> { this.services.set(serviceId, metadata); }
    async getAvailableServices(serviceType: string): Promise<string[]> { return []; }
    async unregisterService(serviceId: string): Promise<void> { this.services.delete(serviceId); }
    async getServiceMetadata(serviceId: string): Promise<ServiceMetadata | null> { return this.services.get(serviceId) || null; }
    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> { return { status: 'healthy', message: 'Mock Registry OK' }; }
}

// ... Implementações Redis ...
class RedisGameStateService implements IGameStateService {
    constructor(private redisUrl: string) { }
    async createGame(hostId: string, config: GameConfig): Promise<Game> { throw new Error('Not implemented'); }
    async getGame(gameId: string): Promise<Game | null> { throw new Error('Not implemented'); }
    async updateGameState(gameId: string, updates: Partial<GameState>): Promise<void> { throw new Error('Not implemented'); }
    async deleteGame(gameId: string): Promise<void> { throw new Error('Not implemented'); }
    async addPlayer(gameId: string, player: Player): Promise<void> { throw new Error('Not implemented'); }
    async removePlayer(gameId: string, playerId: string): Promise<void> { throw new Error('Not implemented'); }
    async updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void> { throw new Error('Not implemented'); }
    async getGameState(gameId: string): Promise<GameState | null> { throw new Error('Not implemented'); }
    async getPlayer(gameId: string, playerId: string): Promise<Player | null> { throw new Error('Not implemented'); }
    async getAllPlayers(gameId: string): Promise<Player[]> { throw new Error('Not implemented'); }
    async getGamesByRoom(roomId: string): Promise<Game[]> { throw new Error('Not implemented'); }
    async getActiveGamesCount(): Promise<number> { throw new Error('Not implemented'); }
    cleanup(): number { return 0; }
    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> { return { status: 'unhealthy', message: 'Not implemented' }; }
}
class RedisEventBus implements IEventBus {
    constructor(private redisUrl: string) { }
    async publish<T>(channel: string, event: T): Promise<void> { throw new Error('Not implemented'); }
    async subscribe<T>(channel: string, handler: (event: T) => void): Promise<void> { throw new Error('Not implemented'); }
    async unsubscribe(channel: string): Promise<void> { throw new Error('Not implemented'); }
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

export class ServiceFactory {
    private static instances = new Map<string, any>();

    static getGameStateService(): IGameStateService {
        if (!this.instances.has('gameState')) {
            const service = config.STORAGE_TYPE === 'redis'
                ? new RedisGameStateService(config.REDIS_URL)
                : new MemoryGameStateService();
            this.instances.set('gameState', service);
        }
        return this.instances.get('gameState');
    }

    static getEventBus(): IEventBus {
        if (!this.instances.has('eventBus')) {
            const bus = config.DISTRIBUTED_MODE
                ? new RedisEventBus(config.REDIS_URL)
                : new LocalEventBus();
            this.instances.set('eventBus', bus);
        }
        return this.instances.get('eventBus');
    }

    static getServiceRegistry(): IServiceRegistry {
        if (!this.instances.has('serviceRegistry')) {
            const registry = config.DISTRIBUTED_MODE
                ? new RedisServiceRegistry(config.REDIS_URL)
                : new MockServiceRegistry();
            this.instances.set('serviceRegistry', registry);
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
            if (service.healthCheck) {
                health[name] = await service.healthCheck();
            }
        }
        return health;
    }

    static getServicesStats(): Record<string, any> {
        // Implementar lógica para obter estatísticas, se necessário.
        return {
            gameState: { type: config.STORAGE_TYPE },
            eventBus: { type: config.DISTRIBUTED_MODE ? 'redis' : 'local' }
        };
    }

    static async cleanup(): Promise<void> {
        const gameStateService = this.getGameStateService();
        if (gameStateService.cleanup) {
            const cleanedCount = gameStateService.cleanup();
            logger.info('GameStateService cleanup ran', { cleanedCount });
        }
    }

    static clearInstances(): void {
        this.instances.clear();
        logger.info('ServiceFactory instances cleared');
    }
}