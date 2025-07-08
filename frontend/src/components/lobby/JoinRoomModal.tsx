import React, { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { apiService } from '@/services/api';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter();

  const [roomCode, setRoomCode] = useState('');
  const [asSpectator, setAsSpectator] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomCode.trim()) {
      toast.error('Informe o código da sala');
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.post('/api/rooms/join-by-code', {
        code: roomCode.toUpperCase(),
        asSpectator,
      });

      toast.success(`${asSpectator ? 'Espectando' : 'Entrou na'} sala com sucesso!`);
      onClose();

      // ✅ CORREÇÃO APLICADA AQUI
      const roomId =
        response.data?.data?.room?.id ?? response.data?.room?.id ?? null;

      if (roomId) {
        router.push(`/room/${roomId}`);
      } else {
        console.error(
          'ERRO CRÍTICO: Não foi possível obter o ID da sala da resposta da API.',
          response.data
        );
        toast.error('Ocorreu um erro ao redirecionar para a sala.');
      }
    } catch (error: any) {
      console.error('Erro ao entrar na sala:', error);
      toast.error(
        error.response?.data?.message || 'Erro inesperado ao entrar na sala'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRoomCode('');
      setAsSpectator(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="🔑 Entrar em uma Sala"
      size="md"
      variant="medieval"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Código da Sala */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Código da Sala
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Ex: ABC123"
            maxLength={10}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase tracking-widest"
            disabled={loading}
          />
        </div>

        {/* Entrar como Espectador */}
        <div className="flex items-center gap-2">
          <input
            id="spectator"
            type="checkbox"
            checked={asSpectator}
            onChange={(e) => setAsSpectator(e.target.checked)}
            className="rounded"
            disabled={loading}
          />
          <label htmlFor="spectator" className="text-sm text-slate-300 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Entrar como espectador
          </label>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="min-w-[120px]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
