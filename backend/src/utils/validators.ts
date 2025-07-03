// 🐺 LOBISOMEM ONLINE - Validation Utilities
// Input validation and sanitization functions
import { z } from 'zod';
import { GAME_LIMITS } from './constants';

//====================================================================
// BASIC VALIDATION SCHEMAS
//====================================================================
// User validation
export const emailSchema = z
  .string()
  .email('Email inválido')
  .toLowerCase()
  .trim();

export const usernameSchema = z
  .string()
  .min(3, 'Username deve ter pelo menos 3 caracteres')
  .max(20, 'Username deve ter no máximo 20 caracteres')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username só pode conter letras, números, _ e -')
  .trim();

export const passwordSchema = z
  .string()
  .min(6, 'Senha deve ter pelo menos 6 caracteres')
  .max(50, 'Senha deve ter no máximo 50 caracteres')
  .regex(/(?=.*[a-z])/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/(?=.*[A-Z])/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/(?=.*\d)/, 'Senha deve conter pelo menos um número');

// Room validation
export const roomNameSchema = z
  .string()
  .min(1, 'Nome da sala é obrigatório')
  .max(GAME_LIMITS.MAX_ROOM_NAME_LENGTH, `Nome deve ter no máximo ${GAME_LIMITS.MAX_ROOM_NAME_LENGTH} caracteres`)
  .trim();

export const roomCodeSchema = z
  .string()
  .length(GAME_LIMITS.ROOM_CODE_LENGTH, `Código deve ter ${GAME_LIMITS.ROOM_CODE_LENGTH} dígitos`)
  .regex(/^\d+$/, 'Código deve conter apenas números');

// Chat validation
export const chatMessageSchema = z
  .string()
  .min(1, 'Mensagem não pode estar vazia')
  .max(GAME_LIMITS.MAX_MESSAGE_LENGTH, `Mensagem deve ter no máximo ${GAME_LIMITS.MAX_MESSAGE_LENGTH} caracteres`)
  .trim();

//====================================================================
// AUTH REQUEST SCHEMAS
//====================================================================
export const registerRequestSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

//====================================================================
// ROOM REQUEST SCHEMAS
//====================================================================
export const createRoomSchema = z.object({
  name: roomNameSchema,
  isPrivate: z.boolean().optional().default(false),
  maxPlayers: z
    .number()
    .min(GAME_LIMITS.MIN_PLAYERS, `Mínimo ${GAME_LIMITS.MIN_PLAYERS} jogadores`)
    .max(GAME_LIMITS.MAX_PLAYERS, `Máximo ${GAME_LIMITS.MAX_PLAYERS} jogadores`)
    .optional()
    .default(GAME_LIMITS.MAX_PLAYERS),
  maxSpectators: z
    .number()
    .min(0, 'Número de espectadores não pode ser negativo')
    .max(GAME_LIMITS.MAX_SPECTATORS, `Máximo ${GAME_LIMITS.MAX_SPECTATORS} espectadores`)
    .optional()
    .default(GAME_LIMITS.MAX_SPECTATORS),
});

export const joinRoomSchema = z.object({
  roomId: z.string().cuid().optional(),
  code: roomCodeSchema.optional(),
  asSpectator: z.boolean().optional().default(false),
}).refine((data) => data.roomId || data.code, {
  message: 'Room ID ou código é obrigatório',
});

export const updateRoomSchema = z.object({
  name: roomNameSchema.optional(),
  maxPlayers: z
    .number()
    .min(GAME_LIMITS.MIN_PLAYERS)
    .max(GAME_LIMITS.MAX_PLAYERS)
    .optional(),
  maxSpectators: z
    .number()
    .min(0)
    .max(GAME_LIMITS.MAX_SPECTATORS)
    .optional(),
});

//====================================================================
// GAME REQUEST SCHEMAS
//====================================================================
export const gameActionSchema = z.object({
  type: z.enum(['INVESTIGATE', 'PROTECT', 'KILL', 'VOTE']),
  targetId: z.string().cuid().optional(),
  data: z.record(z.any()).optional(),
});

export const voteSchema = z.object({
  targetId: z.string().cuid('ID do alvo inválido'),
});

//====================================================================
// CHAT SCHEMAS
//====================================================================
export const chatMessageRequestSchema = z.object({
  message: chatMessageSchema,
  channel: z.enum(['public', 'werewolf', 'spectator']).optional().default('public'),
});

//====================================================================
// PAGINATION SCHEMAS
//====================================================================
export const paginationSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().min(1, 'Página deve ser maior que 0'))
    .optional()
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().min(1).max(100, 'Limite máximo de 100 itens por página'))
    .optional()
    .default('10'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

//====================================================================
// CUSTOM VALIDATION FUNCTIONS
//====================================================================
/**
 * Validate if a string is a valid CUID
 */
export function isValidCuid(id: string): boolean {
  return z.string().cuid().safeParse(id).success;
}

/**
 * Validate if a user can perform an action in a game
 */
export function canPerformAction(
  role: string,
  phase: string,
  action: string
): boolean {
  const nightActions = ['INVESTIGATE', 'PROTECT', 'KILL'];
  const dayActions = ['VOTE'];

  if (phase === 'NIGHT' && nightActions.includes(action)) {
    return ['SHERIFF', 'DOCTOR', 'WEREWOLF', 'WEREWOLF_KING', 'VIGILANTE', 'SERIAL_KILLER'].includes(role);
  }

  if (phase === 'VOTING' && action === 'VOTE') {
    return true; // Everyone can vote
  }

  return false;
}

/**
 * Validate room code format
 */
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sanitize chat message (remove harmful content)
 */
export function sanitizeChatMessage(message: string): string {
  return message
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .substring(0, GAME_LIMITS.MAX_MESSAGE_LENGTH);
}

/**
 * Validate if email domain is allowed
 */
export function isAllowedEmailDomain(email: string): boolean {
  // Add email domain restrictions if needed
  const blockedDomains = ['tempmail.com', '10minutemail.com'];
  const domain = email.split('@')[1];
  if (!domain) return false;
  return !blockedDomains.includes(domain.toLowerCase());
}

/**
 * Validate username availability pattern
 */
export function hasValidUsernamePattern(username: string): boolean {
  // Block offensive patterns
  const blockedPatterns = [
    /admin/i,
    /moderator/i,
    /system/i,
    /bot/i,
    /fuck/i,
    /shit/i,
    // Add more as needed
  ];

  return !blockedPatterns.some(pattern => pattern.test(username));
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(
  requests: number,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; retryAfter?: number } {
  if (requests >= maxRequests) {
    return {
      allowed: false,
      retryAfter: windowMs,
    };
  }

  return { allowed: true };
}

//====================================================================
// WEBSOCKET VALIDATION
//====================================================================
export const websocketMessageSchema = z.object({
  type: z.string().min(1, 'Message type is required'),
  data: z.any().optional(),
  timestamp: z.string().optional(),
  messageId: z.string().optional(),
});

//====================================================================
// EXPORT VALIDATION HELPER
//====================================================================
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map(err =>
      `${err.path.join('.')}: ${err.message}`
    );

    return { success: false, errors };
  };
}