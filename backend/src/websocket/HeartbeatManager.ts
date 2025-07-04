// 🐺 LOBISOMEM ONLINE - Heartbeat Manager
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → game-service
import { wsConfig } from '@/config/websocket';
import { wsLogger } from '@/utils/logger';
import type { ConnectionManager } from './ConnectionManager';

//====================================================================
// HEARTBEAT STATS INTERFACE
//====================================================================
export interface HeartbeatStats {
    totalPingsSent: number;
    totalPongsReceived: number;
    currentInterval: number;
    timeout: number;
    lastCleanup: Date;
    connectionsMonitored: number;
    deadConnectionsDetected: number;
}

//====================================================================
// HEARTBEAT MANAGER CLASS
//====================================================================
export class HeartbeatManager {
    private pingInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isRunning = false;
    private stats: HeartbeatStats = {
        totalPingsSent: 0,
        totalPongsReceived: 0,
        currentInterval: wsConfig.heartbeat.interval,
        timeout: wsConfig.heartbeat.timeout,
        lastCleanup: new Date(),
        connectionsMonitored: 0,
        deadConnectionsDetected: 0,
    };

    constructor(private connectionManager: ConnectionManager) { }

    //====================================================================
    // LIFECYCLE MANAGEMENT
    //====================================================================
    start(): void {
        if (this.isRunning) {
            wsLogger.warn('HeartbeatManager already running');
            return;
        }

        this.isRunning = true;

        // Start ping interval
        this.pingInterval = setInterval(() => {
            this.sendPingToAllConnections();
        }, wsConfig.heartbeat.interval);

        // Start cleanup interval (check for dead connections)
        this.cleanupInterval = setInterval(() => {
            this.cleanupDeadConnections();
        }, wsConfig.heartbeat.interval * 2); // Run cleanup less frequently

        wsLogger.info('HeartbeatManager started', {
            pingInterval: wsConfig.heartbeat.interval,
            timeout: wsConfig.heartbeat.timeout,
        });
    }

    stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        wsLogger.info('HeartbeatManager stopped');
    }

    restart(): void {
        this.stop();
        this.start();
    }

    isActive(): boolean {
        return this.isRunning;
    }

    //====================================================================
    // PING OPERATIONS
    //====================================================================
    private sendPingToAllConnections(): void {
        const connections = this.connectionManager.getAllConnections();
        let sentCount = 0;
        let failedCount = 0;

        for (const connection of connections) {
            try {
                if (connection.ws.readyState === connection.ws.OPEN) {
                    // Mark as potentially dead - will be marked alive when pong is received
                    this.connectionManager.markDead(connection.id);

                    // Send ping
                    connection.ws.ping();
                    sentCount++;

                    wsLogger.debug('Ping sent', {
                        connectionId: connection.id,
                        userId: connection.context.userId,
                    });
                } else {
                    // Connection is already closed
                    failedCount++;
                    wsLogger.debug('Skipping ping for closed connection', {
                        connectionId: connection.id,
                        readyState: connection.ws.readyState,
                    });
                }
            } catch (error) {
                failedCount++;
                wsLogger.error('Failed to send ping', error instanceof Error ? error : new Error('Unknown ping error'), {
                    connectionId: connection.id,
                    userId: connection.context.userId,
                });
            }
        }

        this.stats.totalPingsSent += sentCount;
        this.stats.connectionsMonitored = connections.length;

        if (sentCount > 0 || failedCount > 0) {
            wsLogger.debug('Ping round completed', {
                sent: sentCount,
                failed: failedCount,
                total: connections.length,
            });
        }
    }

    sendPingToConnection(connectionId: string): boolean {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection) {
            wsLogger.warn('Cannot ping non-existent connection', { connectionId });
            return false;
        }

        try {
            if (connection.ws.readyState === connection.ws.OPEN) {
                this.connectionManager.markDead(connectionId);
                connection.ws.ping();

                wsLogger.debug('Individual ping sent', {
                    connectionId,
                    userId: connection.context.userId,
                });

                return true;
            } else {
                wsLogger.debug('Cannot ping closed connection', {
                    connectionId,
                    readyState: connection.ws.readyState,
                });
                return false;
            }
        } catch (error) {
            wsLogger.error('Failed to send individual ping', error instanceof Error ? error : new Error('Unknown individual ping error'), {
                connectionId,
                userId: connection.context.userId,
            });
            return false;
        }
    }

    //====================================================================
    // PONG HANDLING
    //====================================================================
    handlePong(connectionId: string): void {
        const success = this.connectionManager.markAlive(connectionId);
        if (success) {
            this.stats.totalPongsReceived++;

            wsLogger.debug('Pong received', {
                connectionId,
                responseTime: Date.now(), // Could calculate actual response time if needed
            });
        } else {
            wsLogger.warn('Received pong for unknown connection', { connectionId });
        }
    }

    //====================================================================
    // DEAD CONNECTION CLEANUP
    //====================================================================
    private cleanupDeadConnections(): void {
        const deadConnections = this.connectionManager.getDeadConnections();
        let cleanedCount = 0;

        for (const connectionId of deadConnections) {
            const connection = this.connectionManager.getConnection(connectionId);
            if (!connection) continue;

            // Check if connection has been dead for too long
            const timeSinceLastPing = Date.now() - connection.lastPing;
            const isTimedOut = timeSinceLastPing > (wsConfig.heartbeat.interval + wsConfig.heartbeat.timeout);

            if (isTimedOut) {
                wsLogger.info('Removing dead connection', {
                    connectionId,
                    userId: connection.context.userId,
                    username: connection.context.username,
                    timeSinceLastPing,
                    lastPing: new Date(connection.lastPing).toISOString(),
                });

                // Close the connection and remove it
                try {
                    if (connection.ws.readyState === connection.ws.OPEN) {
                        connection.ws.terminate(); // Force close
                    }
                } catch (error) {
                    wsLogger.error('Error terminating dead connection', error instanceof Error ? error : new Error('Unknown termination error'), {
                        connectionId,
                    });
                }

                this.connectionManager.removeConnection(connectionId);
                cleanedCount++;
                this.stats.deadConnectionsDetected++;
            }
        }

        this.stats.lastCleanup = new Date();

        if (cleanedCount > 0) {
            wsLogger.info('Dead connection cleanup completed', {
                cleanedCount,
                totalDeadConnections: deadConnections.length,
                remainingConnections: this.connectionManager.getConnectionCount(),
            });
        }
    }

    forceCleanupDeadConnections(): number {
        wsLogger.info('Force cleanup requested');
        this.cleanupDeadConnections();

        const deadConnections = this.connectionManager.getDeadConnections();
        return deadConnections.length;
    }

    //====================================================================
    // CONNECTION HEALTH MONITORING
    //====================================================================
    getConnectionHealth(connectionId: string): {
        isAlive: boolean;
        lastPing: number;
        timeSinceLastPing: number;
        isHealthy: boolean;
    } | null {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection) return null;

        const now = Date.now();
        const timeSinceLastPing = now - connection.lastPing;
        const isHealthy = connection.isAlive && timeSinceLastPing < wsConfig.heartbeat.interval * 2;

        return {
            isAlive: connection.isAlive,
            lastPing: connection.lastPing,
            timeSinceLastPing,
            isHealthy,
        };
    }

    getAllConnectionsHealth(): Array<{
        connectionId: string;
        userId: string;
        username: string;
        isAlive: boolean;
        lastPing: number;
        timeSinceLastPing: number;
        isHealthy: boolean;
    }> {
        const connections = this.connectionManager.getAllConnections();
        const now = Date.now();

        return connections.map(connection => {
            const timeSinceLastPing = now - connection.lastPing;
            const isHealthy = connection.isAlive && timeSinceLastPing < wsConfig.heartbeat.interval * 2;

            return {
                connectionId: connection.id,
                userId: connection.context.userId,
                username: connection.context.username,
                isAlive: connection.isAlive,
                lastPing: connection.lastPing,
                timeSinceLastPing,
                isHealthy,
            };
        });
    }

    getHealthySummary(): {
        total: number;
        alive: number;
        dead: number;
        healthy: number;
        unhealthy: number;
    } {
        const healthData = this.getAllConnectionsHealth();

        return {
            total: healthData.length,
            alive: healthData.filter(h => h.isAlive).length,
            dead: healthData.filter(h => !h.isAlive).length,
            healthy: healthData.filter(h => h.isHealthy).length,
            unhealthy: healthData.filter(h => !h.isHealthy).length,
        };
    }

    //====================================================================
    // STATISTICS AND MONITORING
    //====================================================================
    getStats(): HeartbeatStats {
        return {
            ...this.stats,
            connectionsMonitored: this.connectionManager.getConnectionCount(),
        };
    }

    getDetailedStats() {
        const healthSummary = this.getHealthySummary();
        const baseStats = this.getStats();

        return {
            ...baseStats,
            healthSummary,
            isRunning: this.isRunning,
            uptime: this.isRunning ? Date.now() - this.stats.lastCleanup.getTime() : 0,
            pingSuccessRate: baseStats.totalPingsSent > 0
                ? (baseStats.totalPongsReceived / baseStats.totalPingsSent) * 100
                : 0,
        };
    }

    resetStats(): void {
        this.stats = {
            totalPingsSent: 0,
            totalPongsReceived: 0,
            currentInterval: wsConfig.heartbeat.interval,
            timeout: wsConfig.heartbeat.timeout,
            lastCleanup: new Date(),
            connectionsMonitored: this.connectionManager.getConnectionCount(),
            deadConnectionsDetected: 0,
        };

        wsLogger.info('HeartbeatManager stats reset');
    }

    //====================================================================
    // CONFIGURATION
    //====================================================================
    updateInterval(newInterval: number): void {
        if (newInterval < 1000) {
            throw new Error('Heartbeat interval must be at least 1000ms');
        }

        this.stats.currentInterval = newInterval;

        if (this.isRunning) {
            wsLogger.info('Updating heartbeat interval', {
                oldInterval: wsConfig.heartbeat.interval,
                newInterval,
            });

            this.restart();
        }
    }

    //====================================================================
    // HEALTH CHECK
    //====================================================================
    healthCheck(): {
        status: 'healthy' | 'unhealthy';
        isRunning: boolean;
        stats: HeartbeatStats;
        issues: string[];
    } {
        const issues: string[] = [];

        if (!this.isRunning) {
            issues.push('HeartbeatManager is not running');
        }

        const healthSummary = this.getHealthySummary();
        const unhealthyPercentage = healthSummary.total > 0
            ? (healthSummary.unhealthy / healthSummary.total) * 100
            : 0;

        if (unhealthyPercentage > 50) {
            issues.push(`${unhealthyPercentage.toFixed(1)}% of connections are unhealthy`);
        }

        if (this.stats.totalPingsSent > 0) {
            const successRate = (this.stats.totalPongsReceived / this.stats.totalPingsSent) * 100;
            if (successRate < 80) {
                issues.push(`Low ping success rate: ${successRate.toFixed(1)}%`);
            }
        }

        return {
            status: issues.length === 0 ? 'healthy' : 'unhealthy',
            isRunning: this.isRunning,
            stats: this.getStats(),
            issues,
        };
    }
}