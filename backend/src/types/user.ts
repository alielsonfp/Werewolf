// 🐺 LOBISOMEM ONLINE - User Types
// Type definitions for user-related functionality

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  level: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  avatar?: string;
}

export interface UserStatistics {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  level: number;
  favoriteRole?: string;
  longestWinStreak: number;
  roleStats: RoleStatistics[];
  recentGames: GameSummary[];
}

export interface RoleStatistics {
  role: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface GameSummary {
  gameId: string;
  role: string;
  faction: string;
  won: boolean;
  survived: boolean;
  playedAt: Date;
  duration: number; // in minutes
}

export interface UserProfile {
  user: Omit<User, 'passwordHash'>;
  statistics: UserStatistics;
  achievements: UserAchievement[];
}

export interface UserAchievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  points: number;
  progress: Record<string, any>;
  completed: boolean;
  unlockedAt?: Date;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatar?: string;
    level: number;
  };
  points: number;
  totalGames: number;
  winRate: number;
  favoriteRole?: string;
}

export interface LeaderboardQuery {
  period?: 'week' | 'month' | 'all';
  role?: string;
  limit?: number;
  offset?: number;
} 