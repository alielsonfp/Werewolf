// 🧹 SERVIÇO DE LIMPEZA DE SALAS ÓRFÃS
import { pool } from '@/config/database';
import { logger } from '@/utils/logger';
import type { ChannelManager } from '@/websocket/ChannelManager';
import type { ConnectionManager } from '@/websocket/ConnectionManager';

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
    private connectionManager: ConnectionManager
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
    logger.info(`🧹 Starting room cleanup service (interval: ${intervalMs}ms)`);

    // Executar uma vez imediatamente
    this.cleanup().catch(error => {
      logger.error('Error in initial room cleanup', error);
    });

    // Agendar execuções periódicas
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
   * 🧹 Executa a limpeza das salas órfãs
   */
  private async cleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    logger.debug('🔍 Starting orphaned rooms cleanup...');

    const result: CleanupResult = {
      cleanedRooms: 0,
      checkedRooms: 0,
      errors: []
    };

    try {
      // 1️⃣ Buscar todas as salas em estado de espera no banco
      const waitingRoomsResult = await pool.query(`
        SELECT id, "hostId", "createdAt" 
        FROM rooms 
        WHERE status = 'WAITING'
        ORDER BY "createdAt" ASC
      `);

      const waitingRooms = waitingRoomsResult.rows;
      result.checkedRooms = waitingRooms.length;

      if (waitingRooms.length === 0) {
        logger.debug('✅ No waiting rooms to check');
        return result;
      }

      logger.debug(`🔍 Checking ${waitingRooms.length} waiting rooms for orphaned status`);

      // 2️⃣ Identificar hosts conectados
      const connectedHosts = this.getConnectedHosts(waitingRooms.map(r => r.hostId));

      // 3️⃣ Encontrar salas órfãs
      const orphanedRooms = waitingRooms.filter(room => {
        const isHostConnected = connectedHosts.has(room.hostId);
        const roomAge = Date.now() - new Date(room.createdAt).getTime();
        const isOldEnough = roomAge > (HOSTLESS_ROOM_TTL_SECONDS * 1000);

        return !isHostConnected && isOldEnough;
      });

      if (orphanedRooms.length === 0) {
        logger.debug('✅ No orphaned rooms found');
        return result;
      }

      // 4️⃣ Limpar salas órfãs
      const roomIds = orphanedRooms.map(r => r.id);
      await this.deleteOrphanedRooms(roomIds);

      result.cleanedRooms = roomIds.length;

      const duration = Date.now() - startTime;
      logger.info(`✅ Cleaned up ${result.cleanedRooms} orphaned rooms in ${duration}ms`, {
        cleanedRooms: result.cleanedRooms,
        checkedRooms: result.checkedRooms,
        duration
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      logger.error('❌ Error during room cleanup', error);
    }

    return result;
  }

  /**
   * 🔍 Identifica quais hosts estão realmente conectados
   */
  private getConnectedHosts(hostIds: string[]): Set<string> {
    const connectedHosts = new Set<string>();

    // Obter todas as conexões ativas
    const allConnections = this.connectionManager.getAllConnections();

    for (const connection of allConnections) {
      // Verificar se a conexão está ativa e é um dos hosts que procuramos
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
      // 1️⃣ Deletar do banco de dados
      const deleteResult = await pool.query(`
        DELETE FROM rooms 
        WHERE id = ANY($1::uuid[])
        RETURNING id
      `, [roomIds]);

      const deletedCount = deleteResult.rowCount || 0;
      logger.info(`🗑️ Deleted ${deletedCount} rooms from database`);

      // 2️⃣ Limpar do channel manager e notificar jogadores restantes
      for (const roomId of roomIds) {
        // Notificar jogadores restantes antes de remover
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

        // Remover conexões da sala (forçar leave)
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
      intervalMs: this.intervalId ? 30000 : null // assumindo intervalo padrão
    };
  }
}