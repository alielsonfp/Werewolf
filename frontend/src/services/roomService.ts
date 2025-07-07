import { apiClient } from '@/services/api';
import type { ApiResponse, Room } from '@/types';

export interface RoomListItem {
  id: string;
  name: string;
  isPrivate: boolean;
  currentPlayers: number;
  maxPlayers: number;
  currentSpectators: number;
  maxSpectators: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  hostUsername: string;
  createdAt: string;
  canJoin: boolean;
  isFull: boolean;
}

export const roomService = {
  async listPublicRooms(): Promise<RoomListItem[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ rooms: RoomListItem[] }>>('/api/rooms');

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch rooms');
      }

      return response.data.data.rooms;
    } catch (error: any) {
      console.error('Failed to fetch rooms:', error);
      // Retorna array vazio em caso de erro para não quebrar a UI
      return [];
    }
  },

  async createRoom(data: {
    name: string;
    isPrivate: boolean;
    maxPlayers?: number;
    maxSpectators?: number;
  }) {
    try {
      const response = await apiClient.post<ApiResponse>('/api/rooms', data);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to create room');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create room:', error);
      throw error;
    }
  },

  async joinRoom(roomId: string, asSpectator: boolean = false) {
    try {
      const response = await apiClient.post<ApiResponse>(`/api/rooms/${roomId}/join`, { asSpectator });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to join room');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to join room:', error);
      throw error;
    }
  },

  async joinRoomByCode(code: string, asSpectator: boolean = false) {
    try {
      const response = await apiClient.post<ApiResponse>('/api/rooms/join-by-code', { code, asSpectator });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to join room by code');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to join room by code:', error);
      throw error;
    }
  },

  async getRoomDetails(roomId: string) {
    try {
      const response = await apiClient.get<ApiResponse>(`/api/rooms/${roomId}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get room details');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get room details:', error);
      throw error;
    }
  },

  async deleteRoom(roomId: string) {
    try {
      const response = await apiClient.delete<ApiResponse>(`/api/rooms/${roomId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete room');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to delete room:', error);
      throw error;
    }
  }
};