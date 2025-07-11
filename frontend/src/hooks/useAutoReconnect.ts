// frontend/src/hooks/useAutoReconnect.ts
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/api'; // ✅ CORRETO

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

        const response = await apiService.get('/api/rooms/check-active-game');

        if (response.hasActiveRoom) { // ✅ SEM .data
          const { room } = response;
          console.log('🔄 Sala ativa encontrada, reconectando...', room.name);

          // Redirecionar para o JOGO
          router.push(`/game/${room.id}`); // ✅ /game/ não /room/
        } else {
          console.log('✅ Nenhuma sala ativa encontrada');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar sala ativa:', error);
      }
    };

    // Só verifica se estiver no lobby
    if (router.pathname === '/lobby') {
      console.log('📍 Usuário no lobby, verificando...');
      checkActiveRoom();
    }
  }, [isAuthenticated, router.pathname, user]);
}