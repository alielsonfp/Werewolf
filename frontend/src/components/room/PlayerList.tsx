import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Crown,
  Check,
  Clock,
  UserX,
  Eye
} from 'lucide-react';
import { Player } from '@/types';

interface PlayerListProps {
  players: Player[];
  spectators: Player[];
  currentUserId: string;
  isHost: boolean;
  onKickPlayer: (playerId: string) => void;
  maxPlayers: number;
  maxSpectators: number;
}

export default function PlayerList({
  players,
  spectators,
  currentUserId,
  isHost,
  onKickPlayer,
  maxPlayers,
  maxSpectators
}: PlayerListProps) {
  return (
    <div className="space-y-6">
      {/* Jogadores */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Jogadores ({players.length}/{maxPlayers})
          </h3>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {players.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`
                  flex items-center justify-between p-3 rounded-lg
                  ${player.isConnected ? 'bg-slate-700/50' : 'bg-red-900/30'}
                  border ${player.isConnected ? 'border-slate-600' : 'border-red-600/50'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`
                      w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                      flex items-center justify-center text-white font-bold
                    `}>
                      {player.username[0].toUpperCase()}
                    </div>
                    {player.isHost && (
                      <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                    )}
                    <div className={`
                      absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-800
                      ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}
                    `} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {player.username}
                        {player.userId === currentUserId && " (Você)"}
                      </span>
                      {player.isHost && (
                        <span className="text-xs bg-yellow-600 px-2 py-1 rounded-full">
                          HOST
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {player.isConnected ? 'Online' : 'Desconectado'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Ready */}
                  <div className={`
                    flex items-center gap-1 px-2 py-1 rounded-full text-xs
                    ${player.isReady
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                      : 'bg-orange-600/20 text-orange-400 border border-orange-600/30'
                    }
                  `}>
                    {player.isReady ? (
                      <>
                        <Check className="w-3 h-3" />
                        Pronto
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        Aguardando
                      </>
                    )}
                  </div>

                  {/* Botão de Kick (só para host) */}
                  {isHost && player.userId !== currentUserId && (
                    <button
                      onClick={() => onKickPlayer(player.id)}
                      className="p-1 rounded text-red-400 hover:bg-red-600/20 transition-colors"
                      title="Expulsar jogador"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Slots vazios */}
          {Array.from({ length: maxPlayers - players.length }).map((_, index) => (
            <div key={index} className="flex items-center p-3 rounded-lg border-2 border-dashed border-slate-600">
              <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-500" />
              </div>
              <span className="ml-3 text-slate-500">Aguardando jogador...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Espectadores */}
      {maxSpectators > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Espectadores ({spectators.length}/{maxSpectators})
            </h3>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {spectators.map((spectator) => (
                <motion.div
                  key={spectator.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30 border border-slate-600/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-sm">
                        {spectator.username[0].toUpperCase()}
                      </div>
                      <div className={`
                        absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-800
                        ${spectator.isConnected ? 'bg-green-500' : 'bg-red-500'}
                      `} />
                    </div>
                    <span className="text-sm">
                      {spectator.username}
                      {spectator.userId === currentUserId && " (Você)"}
                    </span>
                  </div>

                  {isHost && spectator.userId !== currentUserId && (
                    <button
                      onClick={() => onKickPlayer(spectator.id)}
                      className="p-1 rounded text-red-400 hover:bg-red-600/20 transition-colors"
                      title="Expulsar espectador"
                    >
                      <UserX className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}