import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown } from 'lucide-react';
import { Player, Room, ChatMessage } from '@/types';

import PlayerList from './PlayerList';
import RoomChat from './RoomChat';
import ActionButtons from './ActionButtons';
import { ConfirmModal } from '@/components/common/Modal';

interface WaitingRoomProps {
  // Dados
  roomId: string;
  room: Room | null;
  players: Player[];
  spectators: Player[]; // Mantido para compatibilidade, mas não usado
  messages: ChatMessage[];

  // Estados
  currentUserId: string;
  isHost: boolean;
  isReady: boolean;
  canStartGame: boolean;
  isConnected: boolean;
  showLeaveModal: boolean;
  setShowLeaveModal: (show: boolean) => void;

  // Handlers
  onToggleReady: () => void;
  onStartGame: () => void;
  onKickPlayer: (playerId: string) => void;
  onSendChatMessage: (message: string) => void;
  onShareRoom: () => void; // Mantido para compatibilidade, mas não usado
  onLeaveRoom: () => void;
  onConfirmLeaveAsHost: () => void;
}

export default function WaitingRoom({
  roomId,
  room,
  players,
  spectators, // Não usado
  messages,
  currentUserId,
  isHost,
  isReady,
  canStartGame,
  isConnected,
  showLeaveModal,
  setShowLeaveModal,
  onToggleReady,
  onStartGame,
  onKickPlayer,
  onSendChatMessage,
  onShareRoom, // Não usado
  onLeaveRoom,
  onConfirmLeaveAsHost
}: WaitingRoomProps) {

  // Se não tiver dados da sala, não deve renderizar (isso é controlado pelo componente pai)
  if (!room) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Header */}
        <div className="bg-slate-800/80 border-b border-slate-700 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onLeaveRoom}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="text-3xl">🐺</div>

                <div>
                  <h1 className="text-2xl font-bold">{room.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>Código: {room.code}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Host: {room.hostUsername}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-slate-400">Jogadores Prontos</div>
                  <div className="text-lg font-bold">
                    {players.filter(p => p.isReady).length}/{players.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players List */}
            <div className="lg:col-span-2">
              <PlayerList
                players={players}
                spectators={[]} // ✅ Array vazio - não mostra espectadores
                currentUserId={currentUserId}
                isHost={isHost}
                onKickPlayer={onKickPlayer}
                maxPlayers={room.maxPlayers}
                maxSpectators={0} // ✅ Zero espectadores
              />
            </div>

            {/* Actions and Chat */}
            <div className="space-y-6">
              <ActionButtons
                isHost={isHost}
                isReady={isReady}
                canStartGame={canStartGame}
                isConnected={isConnected}
                onToggleReady={onToggleReady}
                onStartGame={onStartGame}
              />

              <RoomChat
                messages={messages}
                onSendMessage={onSendChatMessage}
                currentUserId={currentUserId}
                isConnected={isConnected}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação para host sair */}
      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={onConfirmLeaveAsHost}
        title="Encerrar Sala"
        message="Você é o host desta sala. Ao sair, a sala será encerrada e todos os jogadores serão removidos. Deseja continuar?"
        confirmText="Sim, Encerrar Sala"
        cancelText="Cancelar"
        variant="warning"
      />
    </>
  );
}