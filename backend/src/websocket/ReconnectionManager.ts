// 🔄 LOBISOMEM ONLINE - Reconnection Manager
// Localização: backend/src/websocket/ReconnectionManager.ts

import { wsLogger } from '@/utils/logger';

interface StoredConnectionState {
    userId: string;
    roomId?: string;
    gameState?: any;
    isSpectator: boolean;
    storedAt: string;
    lastActivity: string;
}

export class ReconnectionManager {
    private reconnectionTimeouts = new Map<string, NodeJS.Timeout>();
    private storedStates = new Map<string, StoredConnectionState>();
    private readonly RECONNECT_WINDOW = 120000; // 2 minutos
    private readonly MAX_STORED_STATES = 1000; // Limite para evitar memory leak

    /**
     * Agenda limpeza dos dados de reconexão após timeout
     */
    scheduleCleanup(userId: string): void {
        // Cancela timeout anterior se existir
        this.cancelCleanup(userId);

        const timeout = setTimeout(() => {
            this.storedStates.delete(userId);
            this.reconnectionTimeouts.delete(userId);
            wsLogger.info('Reconnection data cleaned up', { userId });
        }, this.RECONNECT_WINDOW);

        this.reconnectionTimeouts.set(userId, timeout);
        wsLogger.info('Reconnection cleanup scheduled', {
            userId,
            windowMs: this.RECONNECT_WINDOW
        });
    }

    /**
     * Cancela limpeza agendada (usuário reconectou)
     */
    cancelCleanup(userId: string): void {
        const timeout = this.reconnectionTimeouts.get(userId);
        if (timeout) {
            clearTimeout(timeout);
            this.reconnectionTimeouts.delete(userId);
            wsLogger.info('Reconnection cleanup cancelled', { userId });
        }
    }

    /**
     * Armazena estado completo para recuperação futura
     */
    storeState(userId: string, connectionState: {
        roomId?: string;
        gameState?: any;
        isSpectator: boolean;
    }): void {
        // Limpa estados antigos se necessário
        if (this.storedStates.size >= this.MAX_STORED_STATES) {
            this.cleanOldestStates();
        }

        // CORREÇÃO 1: Usar spread condicional para lidar com 'exactOptionalPropertyTypes'.
        // Isso evita adicionar propriedades com valor 'undefined' ao objeto.
        const storedState: StoredConnectionState = {
            userId,
            isSpectator: connectionState.isSpectator,
            storedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            ...(connectionState.roomId && { roomId: connectionState.roomId }),
            ...(connectionState.gameState && { gameState: connectionState.gameState }),
        };

        this.storedStates.set(userId, storedState);

        wsLogger.info('State stored for reconnection', {
            userId,
            roomId: connectionState.roomId,
            isSpectator: connectionState.isSpectator,
            hasGameState: !!connectionState.gameState
        });

        // Agenda limpeza automática
        this.scheduleCleanup(userId);
    }

    /**
     * Recupera estado armazenado
     */
    retrieveState(userId: string): StoredConnectionState | null {
        const state = this.storedStates.get(userId);
        if (state) {
            // Remove timeout de limpeza mas mantém o estado até confirmação
            this.cancelCleanup(userId);

            wsLogger.info('State retrieved for reconnection', {
                userId,
                roomId: state.roomId,
                storedAt: state.storedAt
            });

            return state;
        }

        wsLogger.warn('No stored state found for reconnection', { userId });
        return null;
    }

    /**
     * Confirma reconexão bem-sucedida e limpa estado
     */
    confirmReconnection(userId: string): void {
        this.storedStates.delete(userId);
        this.cancelCleanup(userId);

        wsLogger.info('Reconnection confirmed, state cleaned', { userId });
    }

    /**
     * Verifica se reconexão ainda é permitida
     */
    isReconnectionAllowed(userId: string): boolean {
        const state = this.storedStates.get(userId);
        if (!state) return false;

        // Verifica se não expirou
        const storedTime = new Date(state.storedAt).getTime();
        const now = Date.now();
        const isWithinWindow = (now - storedTime) <= this.RECONNECT_WINDOW;

        if (!isWithinWindow) {
            this.storedStates.delete(userId);
            this.cancelCleanup(userId);
            wsLogger.info('Reconnection window expired', { userId });
            return false;
        }

        return true;
    }

    /**
     * Atualiza atividade do usuário armazenado
     */
    updateLastActivity(userId: string): void {
        const state = this.storedStates.get(userId);
        if (state) {
            state.lastActivity = new Date().toISOString();
        }
    }

    /**
     * Obtém estatísticas do manager
     */
    getStats(): {
        storedStatesCount: number;
        activeTimeouts: number;
        oldestStateAge: number | null;
    } {
        let oldestAge: number | null = null;

        if (this.storedStates.size > 0) {
            const now = Date.now();
            const ages = Array.from(this.storedStates.values())
                .map(state => now - new Date(state.storedAt).getTime());
            oldestAge = Math.max(...ages);
        }

        return {
            storedStatesCount: this.storedStates.size,
            activeTimeouts: this.reconnectionTimeouts.size,
            oldestStateAge: oldestAge
        };
    }

    /**
     * Remove estados mais antigos para evitar memory leak
     */
    private cleanOldestStates(): void {
        const states = Array.from(this.storedStates.entries());

        // Ordena por data de armazenamento (mais antigo primeiro)
        states.sort((a, b) =>
            new Date(a[1].storedAt).getTime() - new Date(b[1].storedAt).getTime()
        );

        // Remove os 10% mais antigos
        const toRemove = Math.ceil(states.length * 0.1);

        for (let i = 0; i < toRemove; i++) {
            // CORREÇÃO 2: Verificar se 'states[i]' não é undefined antes de desestruturar
            // para satisfazer a regra 'noUncheckedIndexedAccess'.
            const entry = states[i];
            if (entry) {
                const [userId] = entry;
                this.storedStates.delete(userId);
                this.cancelCleanup(userId);
            }
        }

        wsLogger.info('Cleaned old stored states', {
            removedCount: toRemove,
            remainingCount: this.storedStates.size
        });
    }

    /**
     * Limpa todos os dados (para shutdown ou reset)
     */
    cleanup(): void {
        // Cancela todos os timeouts
        for (const timeout of this.reconnectionTimeouts.values()) {
            clearTimeout(timeout);
        }

        this.reconnectionTimeouts.clear();
        this.storedStates.clear();

        wsLogger.info('ReconnectionManager cleanup completed');
    }

    /**
     * Lista usuários com estado armazenado
     */
    getStoredUserIds(): string[] {
        return Array.from(this.storedStates.keys());
    }

    /**
     * Força limpeza de um usuário específico
     */
    forceCleanup(userId: string): boolean {
        const hadState = this.storedStates.has(userId);

        this.storedStates.delete(userId);
        this.cancelCleanup(userId);

        if (hadState) {
            wsLogger.info('Forced cleanup for user', { userId });
        }

        return hadState;
    }
}