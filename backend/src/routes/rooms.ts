// 🐺 LOBISOMEM ONLINE - Room Routes
// ✅ ORDEM CORRETA: Rotas específicas ANTES das genéricas

import { Router } from 'express';
import { pool } from '@/config/database';
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

//====================================================================
// ✅ ROTAS ESPECÍFICAS PRIMEIRO - ANTES DAS ROTAS COM :id
//====================================================================

/**
 * @route GET /api/rooms/check-active-game
 * @desc Check if user has an active room (for auto-reconnect)
 * @access Private
 */
router.get('/check-active-game', requireAuth, async (req, res) => {
  try {
    // ✅ CORRIGIDO: usar req.userId que o middleware requireAuth define
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Not authenticated',
        hasActiveRoom: false
      });
    }

    console.log('🔍 Verificando sala ativa para usuário:', userId);

    // Buscar sala ativa do usuário no banco
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.status,
        r.code,
        r."isPrivate",
        rp."joinedAt",
        rp."isSpectator",
        rp."isReady"
      FROM rooms r
      JOIN room_players rp ON r.id = rp."roomId"
      WHERE rp."userId" = $1 
        AND r.status IN ('WAITING', 'PLAYING')
        AND rp."leftAt" IS NULL
      ORDER BY rp."joinedAt" DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length > 0) {
      const room = result.rows[0];

      console.log('✅ Sala ativa encontrada:', {
        roomId: room.id,
        roomName: room.name,
        status: room.status,
        isSpectator: room.isSpectator
      });

      return res.json({
        hasActiveRoom: true,
        room: {
          id: room.id,
          name: room.name,
          status: room.status,
          code: room.code,
          isPrivate: room.isPrivate,
          isSpectator: room.isSpectator,
          isReady: room.isReady,
          joinedAt: room.joinedAt
        }
      });
    }

    console.log('❌ Nenhuma sala ativa encontrada para usuário:', userId);
    return res.json({
      hasActiveRoom: false,
      room: null
    });

  } catch (error) {
    console.error('❌ Erro ao verificar sala ativa:', error);
    return res.status(500).json({
      error: 'Internal server error',
      hasActiveRoom: false
    });
  }
});

/**
 * @route POST /api/rooms/join-by-code
 * @desc Join room by 6-digit code
 * @access Private
 * @body { code, asSpectator? }
 */
router.post('/join-by-code', requireAuth, joinRoomByCode);

//====================================================================
// ✅ ROTAS GENÉRICAS COM :id VÊM DEPOIS
//====================================================================

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
 * @route DELETE /api/rooms/:id
 * @desc Delete room (host only)
 * @access Private
 */
router.delete('/:id', requireAuth, deleteRoom);

export default router;