// ⏰ LOBISOMEM ONLINE - Inactivity Manager
// Localização: backend/src/websocket/InactivityManager.ts

import { wsLogger } from '@/utils/logger';

interface ActivityTracker {
    connectionId: string;
    userId: string;
    lastActivity: Date;
    warningTimer?: NodeJS.Timeout;
    kickTimer?: NodeJS.Timeout;
    warningsSent: number;
}

type InactivityCallback = (connectionId: string, reason: 'warning' | 'kick') => void;

export class InactivityManager {
    private activityTrackers = new Map<string, ActivityTracker>();
    private readonly INACTIVITY_TIMEOUT = 300000; // 5 minutos
    private readonly WARNING_TIME = 60000; // 1 minuto antes do kick
    private readonly MAX_WARNINGS = 2;

    private onInactivityCallback?: InactivityCallback;

    constructor(onInactivity?: InactivityCallback) {
        // CORREÇÃO 1: Apenas atribuir o callback se ele for fornecido.
        // Isso evita a atribuição explícita de 'undefined', que a regra 'exactOptionalPropertyTypes' proíbe.
        if (onInactivity) {
            this.onInactivityCallback = onInactivity;
        }
    }

    /**
     * Adiciona conexão para rastreamento de atividade
     */
    addConnection(connectionId: string, userId: string): void {
        // As propriedades opcionais 'warningTimer' e 'kickTimer' são omitidas na criação,
        // o que está correto para a regra 'exactOptionalPropertyTypes'.
        const tracker: ActivityTracker = {
            connectionId,
            userId,
            lastActivity: new Date(),
            warningsSent: 0
        };

        this.activityTrackers.set(connectionId, tracker);
        this.scheduleInactivityCheck(connectionId);

        wsLogger.debug('Connection added to inactivity tracking', {
            connectionId,
            userId
        });
    }

    /**
     * Remove conexão do rastreamento
     */
    removeConnection(connectionId: string): void {
        const tracker = this.activityTrackers.get(connectionId);
        if (tracker) {
            this.clearTimers(tracker);
            this.activityTrackers.delete(connectionId);

            wsLogger.debug('Connection removed from inactivity tracking', {
                connectionId,
                userId: tracker.userId
            });
        }
    }

    /**
     * Registra atividade e reseta timers
     */
    trackActivity(connectionId: string): void {
        const tracker = this.activityTrackers.get(connectionId);
        if (!tracker) {
            wsLogger.warn('Attempted to track activity for unknown connection', {
                connectionId
            });
            return;
        }

        // Atualiza timestamp de atividade
        tracker.lastActivity = new Date();
        tracker.warningsSent = 0;

        // Limpa timers existentes
        this.clearTimers(tracker);

        // Reagenda verificação
        this.scheduleInactivityCheck(connectionId);

        wsLogger.debug('Activity tracked, timers reset', {
            connectionId,
            userId: tracker.userId
        });
    }

    /**
     * Agenda verificação de inatividade
     */
    private scheduleInactivityCheck(connectionId: string): void {
        const tracker = this.activityTrackers.get(connectionId);
        if (!tracker) return;

        // Timer para aviso
        tracker.warningTimer = setTimeout(() => {
            this.handleInactivityWarning(connectionId);
        }, this.INACTIVITY_TIMEOUT - this.WARNING_TIME);

        // Timer para kick
        tracker.kickTimer = setTimeout(() => {
            this.handleInactivityKick(connectionId);
        }, this.INACTIVITY_TIMEOUT);
    }

    /**
     * Manipula aviso de inatividade
     */
    private handleInactivityWarning(connectionId: string): void {
        const tracker = this.activityTrackers.get(connectionId);
        if (!tracker) return;

        tracker.warningsSent++;

        wsLogger.info('Inactivity warning sent', {
            connectionId,
            userId: tracker.userId,
            warningNumber: tracker.warningsSent,
            timeUntilKick: this.WARNING_TIME
        });

        // Chama callback se definido
        if (this.onInactivityCallback) {
            this.onInactivityCallback(connectionId, 'warning');
        }

        // Se atingiu o máximo de avisos, não agenda mais
        if (tracker.warningsSent >= this.MAX_WARNINGS) {
            return;
        }

        // Reagenda próximo aviso em 30 segundos
        tracker.warningTimer = setTimeout(() => {
            this.handleInactivityWarning(connectionId);
        }, 30000);
    }

    /**
     * Manipula kick por inatividade
     */
    private handleInactivityKick(connectionId: string): void {
        const tracker = this.activityTrackers.get(connectionId);
        if (!tracker) return;

        const inactiveTime = Date.now() - tracker.lastActivity.getTime();

        wsLogger.warn('Connection kicked for inactivity', {
            connectionId,
            userId: tracker.userId,
            inactiveTimeMs: inactiveTime,
            warningsSent: tracker.warningsSent
        });

        // Chama callback se definido
        if (this.onInactivityCallback) {
            this.onInactivityCallback(connectionId, 'kick');
        }

        // Remove do rastreamento
        this.removeConnection(connectionId);
    }

    /**
     * Limpa todos os timers de um tracker
     */
    private clearTimers(tracker: ActivityTracker): void {
        if (tracker.warningTimer) {
            clearTimeout(tracker.warningTimer);
            // CORREÇÃO 2: Usar 'delete' para remover a propriedade opcional em vez de atribuir 'undefined'.
            delete tracker.warningTimer;
        }

        if (tracker.kickTimer) {
            clearTimeout(tracker.kickTimer);
            // CORREÇÃO 3: Usar 'delete' aqui também.
            delete tracker.kickTimer;
        }
    }

    /**
     * Verifica se conexão está inativa
     */
    isInactive(connectionId: string): boolean {
        const tracker = this.activityTrackers.get(connectionId);
        if (!tracker) return true;

        const inactiveTime = Date.now() - tracker.lastActivity.getTime();
        return inactiveTime >= this.INACTIVITY_TIMEOUT;
    }

    /**
     * Obtém tempo de inatividade de uma conexão
     */
    getInactiveTime(connectionId: string): number {
        const tracker = this.activityTrackers.get(connectionId);
        if (!tracker) return 0;

        return Date.now() - tracker.lastActivity.getTime();
    }

    /**
     * Obtém estatísticas do manager
     */
    getStats(): {
        trackedConnections: number;
        activeWarnings: number;
        inactiveConnections: number;
        averageInactiveTime: number;
    } {
        const now = Date.now();
        let totalInactiveTime = 0;
        let inactiveCount = 0;
        let warningsCount = 0;

        for (const tracker of this.activityTrackers.values()) {
            const inactiveTime = now - tracker.lastActivity.getTime();
            totalInactiveTime += inactiveTime;

            if (inactiveTime >= this.INACTIVITY_TIMEOUT - this.WARNING_TIME) {
                inactiveCount++;
            }

            if (tracker.warningsSent > 0) {
                warningsCount++;
            }
        }

        return {
            trackedConnections: this.activityTrackers.size,
            activeWarnings: warningsCount,
            inactiveConnections: inactiveCount,
            averageInactiveTime: this.activityTrackers.size > 0
                ? totalInactiveTime / this.activityTrackers.size
                : 0
        };
    }

    /**
     * Força verificação de inatividade para todas as conexões
     */
    forceInactivityCheck(): void {
        const now = Date.now();

        for (const [connectionId, tracker] of this.activityTrackers.entries()) {
            const inactiveTime = now - tracker.lastActivity.getTime();

            if (inactiveTime >= this.INACTIVITY_TIMEOUT) {
                this.handleInactivityKick(connectionId);
            } else if (inactiveTime >= this.INACTIVITY_TIMEOUT - this.WARNING_TIME
                && tracker.warningsSent === 0) {
                this.handleInactivityWarning(connectionId);
            }
        }
    }

    /**
     * Atualiza configurações de timeout
     */
    updateTimeouts(inactivityTimeout: number, warningTime: number): void {
        if (inactivityTimeout <= warningTime) {
            throw new Error('Inactivity timeout must be greater than warning time');
        }

        // Não atualiza as constantes diretamente, mas você pode implementar
        // lógica para usar valores dinâmicos se necessário
        wsLogger.info('Timeout configuration update requested', {
            currentInactivityTimeout: this.INACTIVITY_TIMEOUT,
            currentWarningTime: this.WARNING_TIME,
            requestedInactivityTimeout: inactivityTimeout,
            requestedWarningTime: warningTime
        });
    }

    /**
     * Lista conexões por status de atividade
     */
    getConnectionsByActivity(): {
        active: string[];
        warned: string[];
        inactive: string[];
    } {
        const now = Date.now();
        const result = {
            active: [] as string[],
            warned: [] as string[],
            inactive: [] as string[]
        };

        for (const [connectionId, tracker] of this.activityTrackers.entries()) {
            const inactiveTime = now - tracker.lastActivity.getTime();

            if (inactiveTime >= this.INACTIVITY_TIMEOUT) {
                result.inactive.push(connectionId);
            } else if (tracker.warningsSent > 0 ||
                inactiveTime >= this.INACTIVITY_TIMEOUT - this.WARNING_TIME) {
                result.warned.push(connectionId);
            } else {
                result.active.push(connectionId);
            }
        }

        return result;
    }

    /**
     * Limpa todos os dados (para shutdown)
     */
    cleanup(): void {
        for (const tracker of this.activityTrackers.values()) {
            this.clearTimers(tracker);
        }

        this.activityTrackers.clear();

        wsLogger.info('InactivityManager cleanup completed');
    }

    /**
     * Define callback para eventos de inatividade
     */
    setInactivityCallback(callback: InactivityCallback): void {
        this.onInactivityCallback = callback;
    }

    /**
     * Obtém informações detalhadas de uma conexão
     */
    getConnectionInfo(connectionId: string): {
        userId: string;
        lastActivity: Date;
        inactiveTime: number;
        warningsSent: number;
        status: 'active' | 'warned' | 'inactive';
    } | null {
        const tracker = this.activityTrackers.get(connectionId);
        if (!tracker) return null;

        const now = Date.now();
        const inactiveTime = now - tracker.lastActivity.getTime();

        let status: 'active' | 'warned' | 'inactive';
        if (inactiveTime >= this.INACTIVITY_TIMEOUT) {
            status = 'inactive';
        } else if (tracker.warningsSent > 0 ||
            inactiveTime >= this.INACTIVITY_TIMEOUT - this.WARNING_TIME) {
            status = 'warned';
        } else {
            status = 'active';
        }

        return {
            userId: tracker.userId,
            lastActivity: tracker.lastActivity,
            inactiveTime,
            warningsSent: tracker.warningsSent,
            status
        };
    }
}