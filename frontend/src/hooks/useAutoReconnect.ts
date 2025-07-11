import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/api';

type RoomType = {
  id: string;
  name: string;
  // adicione outras propriedades conforme sua modelagem
};

type CheckActiveRoomResponse = {
  hasActiveRoom: boolean;
  room: RoomType;
};

export function useAutoReconnect() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('🔍 AutoReconnect: Não autenticado, pulando');
      return;
    }

    const checkActiveRoom = async () => {
      try {
        console.log('🔍 [AutoReconnect] Verificando sala ativa...');

        const response = await apiService.get<CheckActiveRoomResponse | undefined>(
          '/api/rooms/check-active-game'
        );

        const data = response?.data;

        if (data && data.hasActiveRoom) {
          const { room } = data;
          console.log('🔄 Sala ativa encontrada, reconectando...', room.name);
          router.push(`/game/${room.id}`);
        } else {
          console.log('✅ Nenhuma sala ativa encontrada');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar sala ativa:', error);
      }
    };

    if (router.pathname === '/lobby') {
      console.log('📍 Usuário no lobby, verificando...');
      checkActiveRoom();
    }
  }, [isAuthenticated, router.pathname, user]);
}
