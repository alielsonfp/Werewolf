// 🐺 LOBISOMEM ONLINE - Room Routes
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → lobby-service

import { Router } from 'express';
import {
    listRooms,
    createRoom,
    joinRoom,
    joinRoomByCode,
    getRoomDetails,
    deleteRoom
} from '@/controllers/roomController';
import { requireAuth } from '@/middleware/auth';

const router = Router();

//====================================================================
// ROOM ROUTES - ALL REQUIRE AUTHENTICATION
//====================================================================

/**
 * @route GET /api/rooms
 * @desc List public rooms
 * @access Private
 */
router.get('/', requireAuth, listRooms);

/**
 * @route POST /api/rooms
 * @desc Create new room
 * @access Private
 * @body { name, isPrivate?, maxPlayers?, maxSpectators? }
 */
router.post('/', requireAuth, createRoom);

/**
 * @route GET /api/rooms/:id
 * @desc Get room details by ID
 * @access Private
 */
router.get('/:id', requireAuth, getRoomDetails);

/**
 * @route POST /api/rooms/:id/join
 * @desc Join room by ID
 * @access Private
 * @body { asSpectator? }
 */
router.post('/:id/join', requireAuth, joinRoom);

/**
 * @route POST /api/rooms/join-by-code
 * @desc Join room by 6-digit code
 * @access Private
 * @body { code, asSpectator? }
 */
router.post('/join-by-code', requireAuth, joinRoomByCode);

/**
 * @route DELETE /api/rooms/:id
 * @desc Delete room (host only)
 * @access Private
 */
router.delete('/:id', requireAuth, deleteRoom);

export default router;