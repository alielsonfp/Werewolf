// 🐺 LOBISOMEM ONLINE - Room Controller
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → lobby-service

import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { generateRoomCode } from '@/utils/helper';
import { logger } from '@/utils/logger';
import { ERROR_MESSAGES, GAME_LIMITS } from '@/utils/constants';
import {
    createRoomSchema,
    joinRoomSchema,
    roomCodeSchema
} from '@/utils/validators';
import type { ApiResponse } from '@/types/api';
import type { Room, RoomStatus } from '@/types/room';

//====================================================================
// ROOM CONTROLLER
//====================================================================

/**
 * GET /api/rooms
 * List public rooms available for joining
 */
export const listRooms = async (req: Request, res: Response): Promise<void> => {
    try {
        logger.info('Listing public rooms', { userId: req.userId });

        const rooms = await prisma.room.findMany({
            where: {
                isPrivate: false,
                status: {
                    in: ['WAITING', 'PLAYING']
                }
            },
            include: {
                host: {
                    select: { username: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        const roomsMetadata = rooms.map((room: any) => ({
            id: room.id,
            name: room.name,
            isPrivate: room.isPrivate,
            currentPlayers: 0, // TODO: Get from game state
            maxPlayers: room.maxPlayers,
            currentSpectators: 0, // TODO: Get from game state
            maxSpectators: room.maxSpectators,
            status: room.status as RoomStatus,
            hostUsername: room.host.username,
            createdAt: room.createdAt,
            canJoin: room.status === 'WAITING',
            isFull: false // TODO: Calculate
        }));

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

/**
 * POST /api/rooms
 * Create a new room
 */
export const createRoom = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request body
        const validation = createRoomSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            res.status(400).json({
                success: false,
                error: ERROR_MESSAGES.VALIDATION_FAILED,
                message: errors.join(', '),
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        const { name, isPrivate, maxPlayers, maxSpectators } = validation.data;

        // Check if host already has an active room
        const existingRoom = await prisma.room.findFirst({
            where: {
                hostId: req.userId,
                status: {
                    in: ['WAITING', 'PLAYING']
                }
            }
        });

        if (existingRoom) {
            res.status(409).json({
                success: false,
                error: 'ROOM_ALREADY_EXISTS',
                message: 'Você já possui uma sala ativa',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Generate room code if private
        let roomCode: string | undefined;
        if (isPrivate) {
            let attempts = 0;
            do {
                roomCode = generateRoomCode();
                const existingCode = await prisma.room.findUnique({
                    where: { code: roomCode }
                });
                if (!existingCode) break;
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

        // Create room
        const room = await prisma.room.create({
            data: {
                name,
                code: roomCode,
                isPrivate: isPrivate || false,
                maxPlayers: maxPlayers || GAME_LIMITS.MAX_PLAYERS,
                maxSpectators: maxSpectators || GAME_LIMITS.MAX_SPECTATORS,
                hostId: req.userId,
                status: 'WAITING',
                serverId: 'local-server'
            }
        });

        logger.info('Room created successfully', {
            roomId: room.id,
            hostId: req.userId,
            code: roomCode,
            isPrivate
        });

        // Generate WebSocket URL for the room
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

/**
 * POST /api/rooms/:id/join
 * Join a room by ID
 */
export const joinRoom = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: roomId } = req.params;
        const { asSpectator = false } = req.body;

        // Check if room exists
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                host: {
                    select: { username: true }
                }
            }
        });

        if (!room) {
            res.status(404).json({
                success: false,
                error: 'ROOM_NOT_FOUND',
                message: 'Sala não encontrada',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Check if room is joinable
        if (room.status !== 'WAITING') {
            res.status(409).json({
                success: false,
                error: 'ROOM_NOT_JOINABLE',
                message: 'A sala não está aceitando novos jogadores',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, username: true, avatar: true }
        });

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'USER_NOT_FOUND',
                message: 'Usuário não encontrado',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Create player object
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

        // Generate WebSocket URL
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
                    hostUsername: room.host.username,
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

/**
 * POST /api/rooms/join-by-code
 * Join a room by 6-digit code
 */
export const joinRoomByCode = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request body
        const validation = roomCodeSchema.safeParse(req.body.code);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: ERROR_MESSAGES.VALIDATION_FAILED,
                message: 'Código inválido - deve ter 6 dígitos',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        const code = validation.data;
        const { asSpectator = false } = req.body;

        // Find room by code
        const room = await prisma.room.findUnique({
            where: { code },
            include: {
                host: {
                    select: { username: true }
                }
            }
        });

        if (!room) {
            res.status(404).json({
                success: false,
                error: 'ROOM_NOT_FOUND',
                message: 'Sala não encontrada com este código',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Check if room is joinable
        if (room.status !== 'WAITING') {
            res.status(409).json({
                success: false,
                error: 'ROOM_NOT_JOINABLE',
                message: 'A sala não está aceitando novos jogadores',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, username: true, avatar: true }
        });

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'USER_NOT_FOUND',
                message: 'Usuário não encontrado',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        // Create player object
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

        // Generate WebSocket URL
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
                    hostUsername: room.host.username,
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

/**
 * GET /api/rooms/:id
 * Get room details by ID
 */
export const getRoomDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: roomId } = req.params;

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                host: {
                    select: { username: true }
                }
            }
        });

        if (!room) {
            res.status(404).json({
                success: false,
                error: 'ROOM_NOT_FOUND',
                message: 'Sala não encontrada',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

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
                hostUsername: room.host.username,
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

/**
 * DELETE /api/rooms/:id
 * Delete room (only host can do this)
 */
export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: roomId } = req.params;

        // Check if room exists and user is host
        const room = await prisma.room.findUnique({
            where: { id: roomId }
        });

        if (!room) {
            res.status(404).json({
                success: false,
                error: 'ROOM_NOT_FOUND',
                message: 'Sala não encontrada',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        if (room.hostId !== req.userId) {
            res.status(403).json({
                success: false,
                error: ERROR_MESSAGES.FORBIDDEN,
                message: 'Apenas o host pode deletar a sala',
                timestamp: new Date().toISOString(),
            } as ApiResponse);
            return;
        }

        await prisma.room.delete({
            where: { id: roomId }
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