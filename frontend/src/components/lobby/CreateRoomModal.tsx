import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Eye, Lock, Globe, Settings } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { apiService } from '@/services/api';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoomSettings {
  gameMode: 'CLASSIC' | 'RANKED' | 'CUSTOM';
  timeDay: number;
  timeNight: number;
  timeVoting: number;
  allowSpectators: boolean;
  autoStart: boolean;
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
    maxSpectators: 8,
  });

  const [settings, setSettings] = useState<RoomSettings>({
    gameMode: 'CLASSIC',
    timeDay: 300,
    timeNight: 120,
    timeVoting: 180,
    allowSpectators: true,
    autoStart: false,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  /* -------------------------------------------------------------------------- */
  /*                                 Handlers                                   */
  /* -------------------------------------------------------------------------- */
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSettingsChange = (field: keyof RoomSettings, value: any) => {
    setSettings(prev => ({
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
      const response = await apiService.post('/api/rooms', {
        ...formData,
        settings,
      });

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
        maxSpectators: 8,
      });
      setSettings({
        gameMode: 'CLASSIC',
        timeDay: 300,
        timeNight: 120,
        timeVoting: 180,
        allowSpectators: true,
        autoStart: false,
      });
      setShowAdvanced(false);
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

        {/* Configurações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Máximo de Espectadores */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Eye className="w-4 h-4 inline mr-2" />
              Máximo de Espectadores
            </label>
            <select
              value={formData.maxSpectators}
              onChange={e =>
                handleInputChange('maxSpectators', parseInt(e.target.value))
              }
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {[0, 4, 8, 12, 16, 20].map(num => (
                <option key={num} value={num}>
                  {num === 0 ? 'Sem espectadores' : `${num} espectadores`}
                </option>
              ))}
            </select>
          </div>
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

        {/* Configurações Avançadas (colapse) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            disabled={loading}
          >
            <Settings className="w-4 h-4" />
            Configurações Avançadas
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-4 h-4" />
            </motion.div>
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-600 space-y-4"
            >
              {/* Modo de Jogo */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Modo de Jogo
                </label>
                <select
                  value={settings.gameMode}
                  onChange={e =>
                    handleSettingsChange(
                      'gameMode',
                      e.target.value as RoomSettings['gameMode'],
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  disabled={loading}
                >
                  <option value="CLASSIC">Clássico</option>
                  <option value="RANKED">Ranqueado</option>
                  <option value="CUSTOM">Personalizado</option>
                </select>
              </div>

              {/* Tempos */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Tempo Dia (seg)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={600}
                    value={settings.timeDay}
                    onChange={e =>
                      handleSettingsChange(
                        'timeDay',
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Tempo Noite (seg)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    value={settings.timeNight}
                    onChange={e =>
                      handleSettingsChange(
                        'timeNight',
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Tempo Votação (seg)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={300}
                    value={settings.timeVoting}
                    onChange={e =>
                      handleSettingsChange(
                        'timeVoting',
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Opções */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.allowSpectators}
                    onChange={e =>
                      handleSettingsChange('allowSpectators', e.target.checked)
                    }
                    className="rounded"
                    disabled={loading}
                  />
                  <span className="text-sm text-slate-300">
                    Permitir espectadores
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.autoStart}
                    onChange={e =>
                      handleSettingsChange('autoStart', e.target.checked)
                    }
                    className="rounded"
                    disabled={loading}
                  />
                  <span className="text-sm text-slate-300">
                    Início automático quando todos estiverem prontos
                  </span>
                </label>
              </div>
            </motion.div>
          )}
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
