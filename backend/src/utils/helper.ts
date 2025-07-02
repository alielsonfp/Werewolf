// 🐺 LOBISOMEM ONLINE - Helper Utilities
// Common utility functions used throughout the application

import crypto from 'crypto';
import { THEMED_NICKNAMES, ROLE_DISTRIBUTIONS, GAME_LIMITS } from './constants';
import type { Role, RoleDistribution } from '@/types/game';

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
    // Fallback to numbered nicknames if all are used
    let counter = 1;
    let nickname = '';
    do {
      nickname = `Cidadão ${counter}`;
      counter++;
    } while (usedNicknames.has(nickname));

    return nickname;
  }

  return availableNicknames[Math.floor(Math.random() * availableNicknames.length)];
}

/**
 * Slugify a string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single
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
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random element from array
 */
export function randomElement<T>(array: T[]): T {
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
    chunks.push(array.slice(i, i + chunkSize));
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

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

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
// =============================================================================

/**
 * Get role distribution based on player count
 */
export function getRoleDistribution(playerCount: number): RoleDistribution {
  // Find the closest predefined distribution
  const availableCounts = Object.keys(ROLE_DISTRIBUTIONS).map(Number).sort((a, b) => a - b);

  let targetCount = availableCounts.find(count => count >= playerCount);
  if (!targetCount) {
    targetCount = availableCounts[availableCounts.length - 1]; // Use largest if exceeds max
  }

  const distribution = ROLE_DISTRIBUTIONS[targetCount as keyof typeof ROLE_DISTRIBUTIONS];

  // Adjust distribution if needed to match exact player count
  if (targetCount > playerCount) {
    return adjustRoleDistribution(distribution, playerCount);
  }

  return distribution;
}

/**
 * Adjust role distribution to match exact player count
 */
function adjustRoleDistribution(distribution: RoleDistribution, targetCount: number): RoleDistribution {
  const newDistribution = { ...distribution };
  const currentTotal = Object.values(newDistribution).reduce((sum, count) => sum + count, 0);
  const difference = currentTotal - targetCount;

  if (difference > 0) {
    // Remove roles starting with villagers
    let toRemove = difference;
    const removeOrder: Role[] = ['VILLAGER', 'WEREWOLF', 'JESTER', 'SERIAL_KILLER'];

    for (const role of removeOrder) {
      if (toRemove <= 0) break;
      const canRemove = Math.min(newDistribution[role], toRemove);
      newDistribution[role] -= canRemove;
      toRemove -= canRemove;
    }
  }

  return newDistribution;
}

/**
 * Distribute roles to players randomly
 */
export function distributeRoles(playerIds: string[], distribution: RoleDistribution): Map<string, Role> {
  const roles: Role[] = [];

  // Create array of roles based on distribution
  for (const [role, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      roles.push(role as Role);
    }
  }

  // Shuffle players and roles
  const shuffledPlayers = shuffleArray(playerIds);
  const shuffledRoles = shuffleArray(roles);

  // Create map of player to role
  const roleAssignment = new Map<string, Role>();
  shuffledPlayers.forEach((playerId, index) => {
    if (index < shuffledRoles.length) {
      roleAssignment.set(playerId, shuffledRoles[index]);
    }
  });

  return roleAssignment;
}

/**
 * Check if game can start with current player count
 */
export function canStartGame(playerCount: number): boolean {
  return playerCount >= GAME_LIMITS.MIN_PLAYERS && playerCount <= GAME_LIMITS.MAX_PLAYERS;
}

/**
 * Calculate win condition for current game state
 */
export function calculateWinCondition(alivePlayers: { role: Role; playerId: string }[]): {
  hasWinner: boolean;
  winningFaction?: string;
  winningPlayers?: string[];
} {
  const aliveByFaction = alivePlayers.reduce((acc, player) => {
    let faction: string;

    if (['VILLAGER', 'SHERIFF', 'DOCTOR', 'VIGILANTE'].includes(player.role)) {
      faction = 'TOWN';
    } else if (['WEREWOLF', 'WEREWOLF_KING'].includes(player.role)) {
      faction = 'WEREWOLF';
    } else {
      faction = 'NEUTRAL';
    }

    if (!acc[faction]) acc[faction] = [];
    acc[faction].push(player.playerId);

    return acc;
  }, {} as Record<string, string[]>);

  const townCount = aliveByFaction.TOWN?.length || 0;
  const werewolfCount = aliveByFaction.WEREWOLF?.length || 0;
  const neutralCount = aliveByFaction.NEUTRAL?.length || 0;

  // Werewolves win if they equal or outnumber town
  if (werewolfCount >= townCount && townCount > 0) {
    return {
      hasWinner: true,
      winningFaction: 'WEREWOLF',
      winningPlayers: aliveByFaction.WEREWOLF,
    };
  }

  // Town wins if no werewolves left
  if (werewolfCount === 0 && townCount > 0) {
    return {
      hasWinner: true,
      winningFaction: 'TOWN',
      winningPlayers: aliveByFaction.TOWN,
    };
  }

  // Serial killer wins if alone
  if (townCount + werewolfCount === 0 && neutralCount === 1) {
    return {
      hasWinner: true,
      winningFaction: 'SERIAL_KILLER',
      winningPlayers: aliveByFaction.NEUTRAL,
    };
  }

  return { hasWinner: false };
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Check if string contains profanity (basic filter)
 */
export function containsProfanity(text: string): boolean {
  const profanityList = [
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell',
    'porra', 'merda', 'caralho', 'puta', 'fodase', 'buceta'
    // Add more words as needed
  ];

  const lowerText = text.toLowerCase();
  return profanityList.some(word => lowerText.includes(word));
}

/**
 * Clean profanity from text
 */
export function cleanProfanity(text: string): string {
  if (!containsProfanity(text)) return text;

  const replacements = [
    'barbaridade', 'caramba', 'nossa', 'eita', 'puxa', 'xi'
  ];

  return randomElement(replacements);
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
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
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
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as any;

  for (const key of keys) {
    delete result[key];
  }

  return result;
}