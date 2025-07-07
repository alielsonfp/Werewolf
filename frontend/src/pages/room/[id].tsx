import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect } from 'react';
import { withAuth } from '@/context/AuthContext';
import WaitingRoom from '@/components/room/WaitingRoom';
import LoadingSpinner from '@/components/common/LoadingSpinner';

function RoomPage() {
  const router = useRouter();
  const { id: roomId } = router.query;

  // Proteção contra renderização prematura
  if (!router.isReady) {
    return (
      <>
        <Head>
          <title>Carregando... - Lobisomem Online</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <LoadingSpinner variant="medieval" size="xl" text="Carregando sala..." />
        </div>
      </>
    );
  }

  // Validação do roomId
  if (!roomId || typeof roomId !== 'string') {
    return (
      <>
        <Head>
          <title>Erro - Lobisomem Online</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Sala Inválida</h1>
            <button
              onClick={() => router.push('/lobby')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Voltar ao Lobby
            </button>
          </div>
        </div>
      </>
    );
  }

  // Renderiza o WaitingRoom apenas quando temos um roomId válido
  return (
    <>
      <Head>
        <title>Sala de Espera - Lobisomem Online</title>
        <meta name="description" content="Aguardando jogadores para começar a partida" />
      </Head>
      <WaitingRoom roomId={roomId} />
    </>
  );
}

// Protege a rota com autenticação
export default withAuth(RoomPage);