import { Request, Response } from 'express';
import { pool } from '@/config/database';
import { generateRoomCode } from '@/utils/helper';
import { logger } from '@/utils/logger';
import { ERROR_MESSAGES, GAME_LIMITS } from '@/utils/constants';
import { validateCreateRoomRequest, validateRoomCode } from '@/utils/simpleValidators';
import type { ApiResponse } from '@/types';
import type { Room, RoomStatus } from '@/types';

export const listRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Listing public rooms', { userId: req.userId });

    const roomsQuery = `
            SELECT 
                r.id, r.name, r."isPrivate", r."maxPlayers", r."maxSpectators", 
                r.status, r."createdAt", u.username as "hostUsername"
            FROM rooms r
            JOIN users u ON r."hostId" = u.id
            WHERE r."isPrivate" = false AND r.status IN ('WAITING', 'PLAYING')
            ORDER BY r."createdAt" DESC
            LIMIT 50
        `;
    const roomsResult = await pool.query(roomsQuery);

    const channelManager = req.app.locals.channelManager;

    const roomsMetadata = roomsResult.rows.map((room: any) => {
      const stats = channelManager ? channelManager.getRoomStats(room.id) : null;

      return {
        id: room.id,
        name: room.name,
        isPrivate: room.isPrivate,
        currentPlayers: stats?.playersCount || 0,
        maxPlayers: room.maxPlayers,
        currentSpectators: stats?.spectatorsCount || 0,
        maxSpectators: room.maxSpectators,
        status: room.status as RoomStatus,
        hostUsername: room.hostUsername,
        createdAt: room.createdAt,
        canJoin: room.status === 'WAITING' && (stats?.playersCount || 0) < room.maxPlayers,
        isFull: (stats?.playersCount || 0) >= room.maxPlayers
      };
    });

    res.json({
      success: true,
      data: {
        rooms: roomsMetadata,
        total: roomsMetadata.length
      },
      message: 'Salas públicas listadas com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    logger.error('Failed to list rooms', error instanceof Error ? error : new Error('Unknown error'), {
      userId: req.userId
    });

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateCreateRoomRequest(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_FAILED,
        message: validation.error,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const { name, isPrivate, maxPlayers, maxSpectators } = validation.data!;

    const existingRoomQuery = `
            SELECT id, name, status FROM rooms 
            WHERE "hostId" = $1 AND status IN ('WAITING', 'PLAYING')
        `;
    const existingRoomResult = await pool.query(existingRoomQuery, [req.userId]);

    if (existingRoomResult.rows.length > 0) {
      logger.warn('User creating room while having active room', {
        userId: req.userId,
        username: req.username,
        existingRooms: existingRoomResult.rows,
        action: 'creating_new_room_anyway'
      });

      try {
        await pool.query(`DELETE FROM rooms WHERE "hostId" = $1 AND status IN ('WAITING', 'PLAYING')`, [req.userId]);
        logger.info('Cleaned up orphaned rooms for user', {
          userId: req.userId,
          cleanedRooms: existingRoomResult.rows.length
        });
      } catch (cleanupError) {
        logger.error('Failed to cleanup orphaned rooms', cleanupError instanceof Error ? cleanupError : new Error('Unknown cleanup error'), {
          userId: req.userId
        });
      }
    }

    let roomCode: string | undefined;
    if (isPrivate) {
      let attempts = 0;
      do {
        roomCode = generateRoomCode();
        const existingCodeQuery = `SELECT id FROM rooms WHERE code = $1`;
        const existingCodeResult = await pool.query(existingCodeQuery, [roomCode]);
        if (existingCodeResult.rows.length === 0) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        res.status(500).json({
          success: false,
          error: ERROR_MESSAGES.SERVER_ERROR,
          message: 'Não foi possível gerar código único',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }
    }

    const createRoomQuery = `
            INSERT INTO rooms (name, code, "isPrivate", "maxPlayers", "maxSpectators", "hostId", status, "serverId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, 'WAITING', 'local-server', NOW(), NOW())
            RETURNING *
        `;
    const roomResult = await pool.query(createRoomQuery, [
      name,
      roomCode,
      isPrivate || false,
      maxPlayers || GAME_LIMITS.MAX_PLAYERS,
      maxSpectators || GAME_LIMITS.MAX_SPECTATORS,
      req.userId
    ]);
    const room = roomResult.rows[0];

    logger.info('Room created successfully', {
      roomId: room.id,
      hostId: req.userId,
      code: roomCode,
      isPrivate,
      hadOrphanedRooms: existingRoomResult.rows.length > 0
    });

    const wsUrl = `ws://localhost:3001/ws/room/${room.id}`;

    res.status(201).json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          code: room.code,
          isPrivate: room.isPrivate,
          maxPlayers: room.maxPlayers,
          maxSpectators: room.maxSpectators,
          status: room.status,
          hostId: room.hostId,
          hostUsername: req.username,
          currentPlayers: 0,
          currentSpectators: 0,
          serverId: room.serverId,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        },
        wsUrl,
        joinUrl: wsUrl,
        code: room.code
      },
      message: 'Sala criada com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    logger.error('Failed to create room', error instanceof Error ? error : new Error('Unknown error'), {
      userId: req.userId,
      username: req.username,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const joinRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const { asSpectator = false } = req.body;

    const roomQuery = `
            SELECT r.*, u.username as "hostUsername"
            FROM rooms r
            JOIN users u ON r."hostId" = u.id
            WHERE r.id = $1
        `;
    const roomResult = await pool.query(roomQuery, [roomId]);

    if (roomResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'ROOM_NOT_FOUND',
        message: 'Sala não encontrada',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const room = roomResult.rows[0];

    if (room.status !== 'WAITING') {
      res.status(409).json({
        success: false,
        error: 'ROOM_NOT_JOINABLE',
        message: 'A sala não está aceitando novos jogadores',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const userQuery = `SELECT id, username, avatar FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [req.userId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const user = userResult.rows[0];

    const player = {
      id: `${roomId}-${user.id}`,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      isHost: room.hostId === user.id,
      isReady: false,
      isSpectator: asSpectator,
      isConnected: false,
      joinedAt: new Date(),
      lastSeen: new Date()
    };

    const wsUrl = `ws://localhost:3001/ws/room/${roomId}`;

    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          code: room.code,
          isPrivate: room.isPrivate,
          maxPlayers: room.maxPlayers,
          maxSpectators: room.maxSpectators,
          status: room.status,
          hostId: room.hostId,
          hostUsername: room.hostUsername,
          currentPlayers: 0,
          currentSpectators: 0,
          serverId: room.serverId,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        },
        player,
        wsUrl,
        joinUrl: wsUrl,
        yourRole: player.isHost ? 'HOST' : (player.isSpectator ? 'SPECTATOR' : 'PLAYER')
      },
      message: 'Entrou na sala com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    logger.error('Failed to join room', error instanceof Error ? error : new Error('Unknown error'), {
      userId: req.userId,
      username: req.username,
      roomId: req.params.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const joinRoomByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code || !validateRoomCode(code)) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_FAILED,
        message: 'Código inválido - deve ter 6 dígitos',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const { asSpectator = false } = req.body;

    const roomQuery = `
            SELECT r.*, u.username as "hostUsername"
            FROM rooms r
            JOIN users u ON r."hostId" = u.id
            WHERE r.code = $1
        `;
    const roomResult = await pool.query(roomQuery, [code]);

    if (roomResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'ROOM_NOT_FOUND',
        message: 'Sala não encontrada com este código',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const room = roomResult.rows[0];

    if (room.status !== 'WAITING') {
      res.status(409).json({
        success: false,
        error: 'ROOM_NOT_JOINABLE',
        message: 'A sala não está aceitando novos jogadores',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const userQuery = `SELECT id, username, avatar FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [req.userId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const user = userResult.rows[0];

    const player = {
      id: `${room.id}-${user.id}`,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      isHost: room.hostId === user.id,
      isReady: false,
      isSpectator: asSpectator,
      isConnected: false,
      joinedAt: new Date(),
      lastSeen: new Date()
    };

    const wsUrl = `ws://localhost:3001/ws/room/${room.id}`;

    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          code: room.code,
          isPrivate: room.isPrivate,
          maxPlayers: room.maxPlayers,
          maxSpectators: room.maxSpectators,
          status: room.status,
          hostId: room.hostId,
          hostUsername: room.hostUsername,
          currentPlayers: 0,
          currentSpectators: 0,
          serverId: room.serverId,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        },
        player,
        wsUrl,
        joinUrl: wsUrl,
        yourRole: player.isHost ? 'HOST' : (player.isSpectator ? 'SPECTATOR' : 'PLAYER')
      },
      message: 'Entrou na sala com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    logger.error('Failed to join room by code', error instanceof Error ? error : new Error('Unknown error'), {
      userId: req.userId,
      username: req.username,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const getRoomDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;

    const roomQuery = `
            SELECT r.*, u.username as "hostUsername"
            FROM rooms r
            JOIN users u ON r."hostId" = u.id
            WHERE r.id = $1
        `;
    const roomResult = await pool.query(roomQuery, [roomId]);

    if (roomResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'ROOM_NOT_FOUND',
        message: 'Sala não encontrada',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const room = roomResult.rows[0];

    res.json({
      success: true,
      data: {
        id: room.id,
        name: room.name,
        code: room.code,
        isPrivate: room.isPrivate,
        maxPlayers: room.maxPlayers,
        maxSpectators: room.maxSpectators,
        status: room.status,
        hostId: room.hostId,
        hostUsername: room.hostUsername,
        currentPlayers: 0,
        currentSpectators: 0,
        serverId: room.serverId,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    logger.error('Failed to get room details', error instanceof Error ? error : new Error('Unknown error'), {
      userId: req.userId,
      roomId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;

    const roomQuery = `SELECT id, "hostId" FROM rooms WHERE id = $1`;
    const roomResult = await pool.query(roomQuery, [roomId]);

    if (roomResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'ROOM_NOT_FOUND',
        message: 'Sala não encontrada',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const room = roomResult.rows[0];

    if (room.hostId !== req.userId) {
      res.status(403).json({
        success: false,
        error: ERROR_MESSAGES.FORBIDDEN,
        message: 'Apenas o host pode deletar a sala',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    await pool.query(`DELETE FROM rooms WHERE id = $1`, [roomId]);

    logger.info('Room deleted via HTTP API', {
      roomId,
      hostId: req.userId,
      username: req.username
    });

    res.json({
      success: true,
      message: 'Sala deletada com sucesso',
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    logger.error('Failed to delete room', error instanceof Error ? error : new Error('Unknown error'), {
      userId: req.userId,
      roomId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};