// 🐺 LOBISOMEM ONLINE - Helper Utilities (CORRIGIDO E OTIMIZADO)
// Funções utilitárias comuns usadas em toda a aplicação

import crypto from 'crypto';
import { THEMED_NICKNAMES, GAME_LIMITS, Faction, Role } from './constants';
// ✅ CORREÇÃO: Importando os tipos do local correto
import type { Player } from '@/types';

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Generate a random room code
 */
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random nickname from themed list
 */
export function generateRandomNickname(usedNicknames: Set<string> = new Set()): string {
  const availableNicknames = THEMED_NICKNAMES.filter(nickname => !usedNicknames.has(nickname));

  if (availableNicknames.length === 0) {
    let counter = 1;
    let nickname = '';
    do {
      nickname = `Cidadão ${counter}`;
      counter++;
    } while (usedNicknames.has(nickname));
    return nickname;
  }
  // ✅ CORREÇÃO: Garantir que o retorno não seja undefined se a lista for vazia (embora já coberto pelo if)
  return availableNicknames[Math.floor(Math.random() * availableNicknames.length)]!;
}

/**
 * Slugify a string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number, suffix: string = '...'): string {
  if (text.length <= length) return text;
  return text.substring(0, length - suffix.length) + suffix;
}

// =============================================================================
// ARRAY UTILITIES
// =============================================================================

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // ✅ CORREÇÃO: Garantir que os elementos não são undefined antes da troca (boa prática com noUncheckedIndexedAccess)
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const swapTarget = shuffled[j];
    if (temp !== undefined && swapTarget !== undefined) {
      shuffled[i] = swapTarget;
      shuffled[j] = temp;
    }
  }
  return shuffled;
}

/**
 * Get random element from array. Returns undefined if array is empty.
 */
export function randomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get multiple random elements from array
 */
export function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  return chunks;
}

// =============================================================================
// TIME UTILITIES
// =============================================================================

/**
 * Add milliseconds to a date
 */
export function addMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

/**
 * Check if a date is expired
 */
export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Get time remaining until target date
 */
export function getTimeRemaining(targetDate: Date): number {
  return Math.max(0, targetDate.getTime() - Date.now());
}

// =============================================================================
// GAME UTILITIES
// ❌ REMOÇÃO: Funções de distribuição de papéis foram removidas.
// A fonte da verdade para essa lógica é o `RoleSystem.ts` e o `GameEngine.ts`.
// Manter essas funções aqui criaria duplicidade e possíveis bugs.
// =============================================================================

/**
 * Check if game can start with current player count
 */
export function canStartGame(playerCount: number): boolean {
  return playerCount >= GAME_LIMITS.MIN_PLAYERS && playerCount <= GAME_LIMITS.MAX_PLAYERS;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Check if string contains profanity (basic filter)
 */
export function containsProfanity(text: string): boolean {
  const profanityList = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'porra', 'merda', 'caralho', 'puta', 'fodase', 'buceta'];
  const lowerText = text.toLowerCase();
  return profanityList.some(word => lowerText.includes(word));
}

/**
 * Clean profanity from text
 */
export function cleanProfanity(text: string): string {
  if (!containsProfanity(text)) return text;
  const replacements = ['barbaridade', 'caramba', 'nossa', 'eita', 'puxa', 'xi'];
  const element = randomElement(replacements);
  return element || '***'; // Fallback
}

// =============================================================================
// OBJECT UTILITIES
// =============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Remove undefined properties from object
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key as keyof T] = value;
    }
  }
  return cleaned;
}

/**
 * Pick specific properties from object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific properties from object
 */
// ✅ CORREÇÃO: Adicionando a restrição `T extends object`
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete (result as any)[key];
  }
  return result;
}