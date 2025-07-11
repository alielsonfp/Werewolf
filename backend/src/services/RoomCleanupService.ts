
// 🧹 SERVIÇO DE LIMPEZA DE SALAS ÓRFÃSimport { pool } from '@/config/database';
import { logger } from '@/utils/logger';
import type { ChannelManager } from '@/websocket/ChannelManager';
import type { ConnectionManager } from '@/websocket/ConnectionManager';
import { pool } from '@/config/database';

// ⏱️ Tempo em segundos que uma sala pode ficar sem host antes de ser deletada
const HOSTLESS_ROOM_TTL_SECONDS = 30;

interface CleanupResult {
  cleanedRooms: number;
  checkedRooms: number;
  errors: string[];
}

export class RoomCleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private channelManager: ChannelManager,
    private connectionManager: ConnectionManager,
    private gameEngine: any // certifique-se de definir o tipo correto se disponível
  ) { }

  /**
   * 🚀 Inicia o serviço de limpeza periódica
   */
  start(intervalMs: number = 30000): void {
    if (this.isRunning) {
      logger.warn('Room cleanup service is already running');
      return;
    }

    this.isRunning = true;
    logger.info(`🧹 Starting room cleanup service(interval: ${intervalMs}ms)`);

    this.cleanup().catch(error => {
      logger.error('Error in initial room cleanup', error);
    });

    this.intervalId = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Error in scheduled room cleanup', error);
      });
    }, intervalMs);
  }

  /**
   * 🛑 Para o serviço de limpeza
   */
  stop(): void {
    if (!this.isRunning) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('🧹 Room cleanup service stopped');
  }

  /**
   * 🧹 Executa a limpeza das salas órfãs e jogos abandonados
   */
  private async cleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    logger.debug('🔍 Starting room cleanup...');

    const result: CleanupResult = {
      cleanedRooms: 0,
      checkedRooms: 0,
      errors: []
    };

    try {
      // ✅ PARTE 1: Limpar salas WAITING sem host
      const waitingRoomsResult = await pool.query(`
        SELECT id, "hostId", "createdAt" 
        FROM rooms 
        WHERE status = 'WAITING'
        ORDER BY "createdAt" ASC
      `);

      const waitingRooms = waitingRoomsResult.rows;
      result.checkedRooms = waitingRooms.length;

      const connectedHosts = this.getConnectedHosts(waitingRooms.map(r => r.hostId));

      const orphanedRooms = waitingRooms.filter(room => {
        const isHostConnected = connectedHosts.has(room.hostId);
        const roomAge = Date.now() - new Date(room.createdAt).getTime();
        const isOldEnough = roomAge > (HOSTLESS_ROOM_TTL_SECONDS * 1000);
        return !isHostConnected && isOldEnough;
      });

      if (orphanedRooms.length > 0) {
        const roomIds = orphanedRooms.map(r => r.id);
        await this.deleteOrphanedRooms(roomIds);
        result.cleanedRooms += roomIds.length;
      }

      // ✅ PARTE 2: Limpar jogos sem jogadores
      await this.cleanupOrphanedGames(result);

      const duration = Date.now() - startTime;
      logger.info(`✅ Cleanup completed in ${duration} ms`, {
        cleanedRooms: result.cleanedRooms,
        checkedRooms: result.checkedRooms,
        duration
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      logger.error('❌ Error during cleanup', error);
    }

    return result;
  }

  /**
   * 🎮 Limpa jogos em andamento sem jogadores conectados
   */
  private async cleanupOrphanedGames(result: CleanupResult): Promise<void> {
    logger.debug('🎮 Checking for orphaned games...');

    try {
      const playingRoomsResult = await pool.query(`
        SELECT id, "hostId", name 
        FROM rooms 
        WHERE status = 'PLAYING'
  `);

      const playingRooms = playingRoomsResult.rows;
      result.checkedRooms += playingRooms.length;

      const gamesToEnd: string[] = [];

      for (const room of playingRooms) {
        const gameId = `game - ${room.id} `;
        const connectedPlayers = this.channelManager.getRoomPlayerConnections(room.id);
        logger.debug(`🎮 Game ${gameId}: ${connectedPlayers.size} connected players`);

        if (connectedPlayers.size === 0) {
          gamesToEnd.push(room.id);
          logger.info(`🧹 Marking game ${gameId} for cleanup - no connected players`);
        }
      }

      if (gamesToEnd.length > 0) {
        for (const roomId of gamesToEnd) {
          const gameId = `game - ${roomId} `;

          try {
            const game = await this.gameEngine.getGameState(gameId);
            if (game) {
              await this.gameEngine.endGame(gameId, 'All players disconnected');
            }

            await pool.query(
              `UPDATE rooms SET status = 'FINISHED', "updatedAt" = NOW() WHERE id = $1`,
              [roomId]
            );

            result.cleanedRooms++;
            logger.info(`✅ Cleaned up orphaned game ${gameId} `);

          } catch (gameError) {
            logger.error(`Error cleaning game ${gameId} `, gameError);
            result.errors.push(`Failed to clean game ${gameId} `);
          }
        }
      }

    } catch (error) {
      logger.error('Error in cleanupOrphanedGames', error);
      result.errors.push('Failed to check orphaned games');
    }
  }

  /**
   * 🔍 Identifica quais hosts estão realmente conectados
   */
  private getConnectedHosts(hostIds: string[]): Set<string> {
    const connectedHosts = new Set<string>();
    const allConnections = this.connectionManager.getAllConnections();

    for (const connection of allConnections) {
      if (
        connection.ws.readyState === connection.ws.OPEN &&
        connection.context?.userId &&
        hostIds.includes(connection.context.userId)
      ) {
        connectedHosts.add(connection.context.userId);
      }
    }

    logger.debug(`🔍 Found ${connectedHosts.size} connected hosts out of ${hostIds.length} total hosts`);
    return connectedHosts;
  }

  /**
   * 🗑️ Deleta salas órfãs do banco e limpa o channel manager
   */
  private async deleteOrphanedRooms(roomIds: string[]): Promise<void> {
    if (roomIds.length === 0) return;

    logger.info(`🗑️ Deleting ${roomIds.length} orphaned rooms`, {
      roomIds: roomIds.map(id => id.slice(-6))
    });

    try {
      const deleteResult = await pool.query(`
        DELETE FROM rooms 
        WHERE id = ANY($1:: uuid[])
        RETURNING id
      `, [roomIds]);

      const deletedCount = deleteResult.rowCount || 0;
      logger.info(`🗑️ Deleted ${deletedCount} rooms from database`);

      for (const roomId of roomIds) {
        try {
          const sentCount = this.channelManager.broadcastToRoom(roomId, 'room-deleted', {
            reason: 'O host se desconectou e a sala foi encerrada automaticamente.',
            timestamp: new Date().toISOString()
          });

          if (sentCount > 0) {
            logger.info(`📢 Notified ${sentCount} players about room deletion`, {
              roomId: roomId.slice(-6)
            });
          }
        } catch (broadcastError) {
          logger.warn('Error broadcasting room deletion', broadcastError);
        }

        const roomConnections = this.channelManager.getRoomConnections(roomId);
        for (const connectionId of roomConnections) {
          try {
            this.channelManager.removeConnectionFromAllRooms(connectionId);
          } catch (removeError) {
            logger.warn('Error removing connection from room', removeError);
          }
        }
      }

    } catch (error) {
      logger.error('❌ Error deleting orphaned rooms', error);
      throw error;
    }
  }

  /**
   * 📊 Retorna estatísticas do serviço
   */
  getStats(): { isRunning: boolean; intervalMs: number | null } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalId ? 30000 : null
    };
  }
}

