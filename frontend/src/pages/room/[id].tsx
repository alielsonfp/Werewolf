import { useRouter } from 'next/router';
import Head from 'next/head';
import { withAuth } from '@/context/AuthContext';
import WaitingRoom from '@/components/room/WaitingRoom';

function RoomPage() {
  const router = useRouter();
  const { id: roomId } = router.query;

  if (!roomId || typeof roomId !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-xl">Sala não encontrada</div>
          <button
            onClick={() => router.push('/lobby')}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sala de Espera - Lobisomem Online</title>
        <meta name="description" content="Sala de espera do jogo Lobisomem" />
      </Head>

      <WaitingRoom roomId={roomId} />
    </>
  );
}

export default withAuth(RoomPage);