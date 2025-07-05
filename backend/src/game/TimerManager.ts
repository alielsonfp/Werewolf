// 🐺 LOBISOMEM ONLINE - Timer Manager (CORRIGIDO PARA exactOptionalPropertyTypes)
import type { GameConfig } from '@/types';
import { logger } from '@/utils/logger';

//====================================================================
// TIMER INTERFACE - CORRIGIDA PARA exactOptionalPropertyTypes
//====================================================================
export interface GameTimer {
    id: string;
    type: 'PHASE' | 'WARNING' | 'CUSTOM';
    startTime: number;
    duration: number;
    remaining: number;
    isActive: boolean;
    callback?: () => void;
    timeout?: NodeJS.Timeout; // CORREÇÃO: Opcional, pode não existir
}

//====================================================================
// TIMER MANAGER CLASS - CORRIGIDO PARA exactOptionalPropertyTypes
//====================================================================
export class TimerManager {
    private timers = new Map<string, GameTimer>();
    private config: GameConfig;
    private updateInterval?: NodeJS.Timeout; // CORREÇÃO: Opcional, pode não existir

    constructor(config: GameConfig) {
        this.config = config;
        this.startUpdateLoop();

        logger.info('TimerManager initialized', {
            nightDuration: config.nightDuration,
            dayDuration: config.dayDuration,
            votingDuration: config.votingDuration,
        });
    }

    //====================================================================
    // TIMER CREATION
    //====================================================================
    createPhaseTimer(
        phase: 'NIGHT' | 'DAY' | 'VOTING',
        gameId: string,
        onComplete: () => void,
        onWarning?: (timeLeft: number) => void
    ): string {
        const duration = this.getPhaseDuration(phase);
        const timerId = `${gameId}-${phase}-${Date.now()}`;

        const timer: GameTimer = {
            id: timerId,
            type: 'PHASE',
            startTime: Date.now(),
            duration,
            remaining: duration,
            isActive: true,
            callback: onComplete,
        };

        // Set timeout for completion
        timer.timeout = setTimeout(() => {
            this.handleTimerExpired(timerId);
        }, duration);

        this.timers.set(timerId, timer);

        // Create warning timers if provided
        if (onWarning) {
            this.createWarningTimers(gameId, phase, duration, onWarning);
        }

        logger.info('Phase timer created', {
            timerId,
            phase,
            duration: this.formatTime(duration),
            gameId,
        });

        return timerId;
    }

    createCustomTimer(
        id: string,
        duration: number,
        callback: () => void,
        type: 'WARNING' | 'CUSTOM' = 'CUSTOM'
    ): string {
        const timer: GameTimer = {
            id,
            type,
            startTime: Date.now(),
            duration,
            remaining: duration,
            isActive: true,
            callback,
        };

        timer.timeout = setTimeout(() => {
            this.handleTimerExpired(id);
        }, duration);

        this.timers.set(id, timer);

        logger.debug('Custom timer created', {
            id,
            duration: this.formatTime(duration),
            type
        });

        return id;
    }

    private createWarningTimers(
        gameId: string,
        phase: string,
        duration: number,
        onWarning: (timeLeft: number) => void
    ): void {
        // 30 second warning
        if (duration > 30000) {
            const warning30Id = `${gameId}-${phase}-warning-30`;
            setTimeout(() => onWarning(30000), duration - 30000);
        }

        // 10 second warning
        if (duration > 10000) {
            const warning10Id = `${gameId}-${phase}-warning-10`;
            setTimeout(() => onWarning(10000), duration - 10000);
        }
    }

    //====================================================================
    // TIMER MANAGEMENT
    //====================================================================
    getTimer(timerId: string): GameTimer | undefined {
        return this.timers.get(timerId);
    }

    pauseTimer(timerId: string): boolean {
        const timer = this.timers.get(timerId);
        if (!timer || !timer.isActive) return false;

        timer.isActive = false;
        timer.remaining = timer.duration - (Date.now() - timer.startTime);

        // CORREÇÃO: Clear timeout se existir
        if (timer.timeout) {
            clearTimeout(timer.timeout);
            // CORREÇÃO: Remover propriedade ao invés de atribuir undefined
            delete timer.timeout;
        }

        logger.debug('Timer paused', { timerId, remaining: this.formatTime(timer.remaining) });
        return true;
    }

    resumeTimer(timerId: string): boolean {
        const timer = this.timers.get(timerId);
        if (!timer || timer.isActive) return false;

        timer.isActive = true;
        timer.startTime = Date.now();
        timer.duration = timer.remaining;

        // Set new timeout for remaining time
        timer.timeout = setTimeout(() => {
            this.handleTimerExpired(timerId);
        }, timer.remaining);

        logger.debug('Timer resumed', { timerId, remaining: this.formatTime(timer.remaining) });
        return true;
    }

    extendTimer(timerId: string, additionalTime: number): boolean {
        const timer = this.timers.get(timerId);
        if (!timer) return false;

        timer.duration += additionalTime;

        if (timer.isActive) {
            timer.remaining = timer.duration - (Date.now() - timer.startTime);

            // Reset timeout with new duration
            if (timer.timeout) {
                clearTimeout(timer.timeout);
            }
            timer.timeout = setTimeout(() => {
                this.handleTimerExpired(timerId);
            }, timer.remaining);
        } else {
            timer.remaining += additionalTime;
        }

        logger.info('Timer extended', {
            timerId,
            additionalTime: this.formatTime(additionalTime),
            newDuration: this.formatTime(timer.duration),
            remaining: this.formatTime(timer.remaining),
        });

        return true;
    }

    stopTimer(timerId: string): boolean {
        const timer = this.timers.get(timerId);
        if (!timer) return false;

        timer.isActive = false;

        if (timer.timeout) {
            clearTimeout(timer.timeout);
            // CORREÇÃO: Remover propriedade ao invés de atribuir undefined
            delete timer.timeout;
        }

        this.timers.delete(timerId);

        logger.debug('Timer stopped', { timerId });
        return true;
    }

    stopAllTimers(): void {
        this.timers.forEach((timer, timerId) => {
            if (timer.timeout) {
                clearTimeout(timer.timeout);
            }
        });

        this.timers.clear();

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            // CORREÇÃO: Remover propriedade ao invés de atribuir undefined
            delete this.updateInterval;
        }

        logger.info('All timers stopped');
    }

    //====================================================================
    // TIMER UPDATES
    //====================================================================
    private startUpdateLoop(): void {
        this.updateInterval = setInterval(() => {
            this.updateAllTimers();
        }, 1000); // Update every second
    }

    private updateAllTimers(): void {
        const now = Date.now();

        this.timers.forEach((timer) => {
            if (!timer.isActive) return;

            // Calculate remaining time
            timer.remaining = Math.max(0, timer.duration - (now - timer.startTime));
        });
    }

    private handleTimerExpired(timerId: string): void {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        logger.debug('Timer expired', {
            timerId,
            type: timer.type,
            duration: this.formatTime(timer.duration),
        });

        // Execute callback
        if (timer.callback) {
            try {
                timer.callback();
            } catch (error) {
                logger.error('Error executing timer callback', error instanceof Error ? error : new Error('Unknown timer error'), {
                    timerId,
                    type: timer.type,
                });
            }
        }

        // Remove timer
        this.stopTimer(timerId);
    }

    //====================================================================
    // PHASE DURATION HELPERS
    //====================================================================
    private getPhaseDuration(phase: 'NIGHT' | 'DAY' | 'VOTING'): number {
        switch (phase) {
            case 'NIGHT':
                return this.config.nightDuration;
            case 'DAY':
                return this.config.dayDuration;
            case 'VOTING':
                return this.config.votingDuration;
            default:
                return 60000; // 1 minute default
        }
    }

    //====================================================================
    // TIMER INFORMATION
    //====================================================================
    getAllActiveTimers(): GameTimer[] {
        return Array.from(this.timers.values()).filter(timer => timer.isActive);
    }

    getTimersByType(type: 'PHASE' | 'WARNING' | 'CUSTOM'): GameTimer[] {
        return Array.from(this.timers.values()).filter(timer => timer.type === type);
    }

    getRemainingTime(timerId: string): number {
        const timer = this.timers.get(timerId);
        if (!timer) return 0;

        if (!timer.isActive) return timer.remaining;

        const elapsed = Date.now() - timer.startTime;
        return Math.max(0, timer.duration - elapsed);
    }

    getTimeElapsed(timerId: string): number {
        const timer = this.timers.get(timerId);
        if (!timer) return 0;

        if (!timer.isActive) return timer.duration - timer.remaining;

        return Math.min(timer.duration, Date.now() - timer.startTime);
    }

    getTimerProgress(timerId: string): number {
        const timer = this.timers.get(timerId);
        if (!timer || timer.duration === 0) return 0;

        const elapsed = this.getTimeElapsed(timerId);
        return Math.min(100, (elapsed / timer.duration) * 100);
    }

    //====================================================================
    // UTILITY METHODS
    //====================================================================
    formatTime(milliseconds: number): string {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes > 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${seconds}s`;
        }
    }

    //====================================================================
    // STATISTICS
    //====================================================================
    getTimerStats(): {
        total: number;
        active: number;
        paused: number;
        byType: Record<string, number>;
    } {
        const allTimers = Array.from(this.timers.values());

        const stats = {
            total: allTimers.length,
            active: allTimers.filter(t => t.isActive).length,
            paused: allTimers.filter(t => !t.isActive).length,
            byType: {
                PHASE: 0,
                WARNING: 0,
                CUSTOM: 0,
            },
        };

        allTimers.forEach(timer => {
            stats.byType[timer.type]++;
        });

        return stats;
    }

    //====================================================================
    // PHASE-SPECIFIC TIMERS
    //====================================================================
    createNightTimer(gameId: string, onComplete: () => void, onWarning?: (timeLeft: number) => void): string {
        return this.createPhaseTimer('NIGHT', gameId, onComplete, onWarning);
    }

    createDayTimer(gameId: string, onComplete: () => void, onWarning?: (timeLeft: number) => void): string {
        return this.createPhaseTimer('DAY', gameId, onComplete, onWarning);
    }

    createVotingTimer(gameId: string, onComplete: () => void, onWarning?: (timeLeft: number) => void): string {
        return this.createPhaseTimer('VOTING', gameId, onComplete, onWarning);
    }

    //====================================================================
    // CLEANUP
    //====================================================================
    cleanup(): void {
        this.stopAllTimers();
        logger.info('TimerManager cleanup completed');
    }

    //====================================================================
    // HEALTH CHECK
    //====================================================================
    healthCheck(): {
        status: 'healthy' | 'unhealthy';
        isRunning: boolean;
        stats: any;
        issues: string[];
    } {
        const issues: string[] = [];
        const stats = this.getTimerStats();

        if (!this.updateInterval) {
            issues.push('Timer update loop is not running');
        }

        // Check for stuck timers
        const now = Date.now();
        this.timers.forEach((timer, timerId) => {
            if (timer.isActive) {
                const elapsed = now - timer.startTime;
                if (elapsed > timer.duration * 1.5) { // 50% overtime tolerance
                    issues.push(`Timer ${timerId} appears to be stuck`);
                }
            }
        });

        return {
            status: issues.length === 0 ? 'healthy' : 'unhealthy',
            isRunning: !!this.updateInterval,
            stats,
            issues,
        };
    }
}