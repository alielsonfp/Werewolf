import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Lock, Globe } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { apiService } from '@/services/api';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoomModal({
  isOpen,
  onClose,
}: CreateRoomModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    isPrivate: false,
    maxPlayers: 12,
  });

  /* -------------------------------------------------------------------------- */
  /*                                 Handlers                                   */
  /* -------------------------------------------------------------------------- */
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome da sala é obrigatório');
      return;
    }
    if (formData.name.length < 3) {
      toast.error('Nome da sala deve ter pelo menos 3 caracteres');
      return;
    }

    setLoading(true);

    try {
      /* ------------------------------ Cria a sala ----------------------------- */
      const response = await apiService.post('/api/rooms', formData);

      toast.success('Sala criada com sucesso!');
      onClose();

      /* ----------------------- Redireciona para a nova sala ----------------------- */
      const roomId =
        response.data?.data?.room?.id ?? response.data?.room?.id ?? null;

      if (roomId) {
        router.push(`/room/${roomId}`);
      } else {
        console.error(
          'ERRO CRÍTICO: Não foi possível obter o ID da sala.',
          response.data,
        );
        toast.error('Não foi possível redirecionar para a sala.');
      }
    } catch (error: any) {
      console.error('Erro ao criar sala:', error);
      toast.error(
        error.response?.data?.message || 'Erro inesperado ao criar sala',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        isPrivate: false,
        maxPlayers: 12,
      });
      onClose();
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                   JSX                                      */
  /* -------------------------------------------------------------------------- */
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="🐺 Criar Nova Sala"
      size="lg"
      variant="medieval"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome da Sala */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Nome da Sala *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => handleInputChange('name', e.target.value)}
            placeholder="Digite o nome da sua sala."
            maxLength={50}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          <div className="text-xs text-slate-500 mt-1">
            {formData.name.length}/50 caracteres
          </div>
        </div>

        {/* Máximo de Jogadores */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Users className="w-4 h-4 inline mr-2" />
            Máximo de Jogadores
          </label>
          <select
            value={formData.maxPlayers}
            onChange={e =>
              handleInputChange('maxPlayers', parseInt(e.target.value))
            }
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {[6, 8, 10, 12, 14, 16].map(num => (
              <option key={num} value={num}>
                {num} jogadores
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Sala */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Tipo de Sala
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleInputChange('isPrivate', false)}
              className={`p-4 rounded-lg border-2 transition-all ${!formData.isPrivate
                ? 'border-green-500 bg-green-500/10 text-green-400'
                : 'border-slate-600 bg-slate-700/50 text-slate-300'
                }`}
              disabled={loading}
            >
              <Globe className="w-6 h-6 mx-auto mb-2" />
              <div className="font-medium">Pública</div>
              <div className="text-xs opacity-75">Visível no lobby</div>
            </button>

            <button
              type="button"
              onClick={() => handleInputChange('isPrivate', true)}
              className={`p-4 rounded-lg border-2 transition-all ${formData.isPrivate
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-slate-600 bg-slate-700/50 text-slate-300'
                }`}
              disabled={loading}
            >
              <Lock className="w-6 h-6 mx-auto mb-2" />
              <div className="font-medium">Privada</div>
              <div className="text-xs opacity-75">Apenas por código</div>
            </button>
          </div>
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
            {loading ? 'Criando...' : 'Criar Sala'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}