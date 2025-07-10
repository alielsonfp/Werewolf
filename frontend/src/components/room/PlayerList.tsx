import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Crown,
  Check,
  Clock,
  UserX,
  Eye,
  UserPlus
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
  // ✅ CORRIGIDO: Calcular slots vazios baseado nos jogadores reais
  const emptyPlayerSlots = Math.max(0, maxPlayers - players.length);
  const emptySpectatorSlots = Math.max(0, maxSpectators - spectators.length);

  // ✅ MELHORADO: Mostrar apenas alguns slots vazios para evitar lista muito longa
  const visibleEmptyPlayerSlots = Math.min(emptyPlayerSlots, 3);
  const visibleEmptySpectatorSlots = Math.min(emptySpectatorSlots, 2);

  return (
    <div className="space-y-6">
      {/* Lista de Jogadores */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Jogadores ({players.length}/{maxPlayers})
          </h3>

          {/* ✅ NOVO: Indicador de progresso visual */}
          <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(players.length / maxPlayers) * 100}%` }}
              />
            </div>
            <span className="text-sm text-slate-400">
              {players.length >= 3 ? '✅' : '⏳'} Min: 3
            </span>
          </div>
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
                  flex items-center justify-between p-3 rounded-lg transition-all duration-200
                  ${player.isConnected
                    ? 'bg-slate-700/50 border border-slate-600 hover:bg-slate-700/70'
                    : 'bg-red-900/30 border border-red-600/50'
                  }
                  ${player.userId === currentUserId ? 'ring-2 ring-blue-500/50' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                      ${player.isHost
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                      }
                    `}>
                      {player.username?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Host Crown */}
                    {player.isHost && (
                      <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                    )}

                    {/* Connection Status */}
                    <div className={`
                      absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-800
                      ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}
                    `} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {player.username}
                        {player.userId === currentUserId && (
                          <span className="text-blue-400 ml-1">(Você)</span>
                        )}
                      </span>

                      {/* Tags */}
                      <div className="flex gap-1">
                        {player.isHost && (
                          <span className="text-xs bg-yellow-600 px-2 py-1 rounded-full font-medium">
                            HOST
                          </span>
                        )}
                        {!player.isConnected && (
                          <span className="text-xs bg-red-600 px-2 py-1 rounded-full">
                            OFFLINE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400">
                      {player.isConnected ? 'Online' : 'Desconectado'}
                      {player.isHost && ' • Controla a sala'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* ✅ CORRIGIDO: Host não mostra status "Ready" */}
                  {!player.isHost && (
                    <div className={`
                      flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
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
                  )}

                  {/* ✅ NOVO: Status especial para host */}
                  {player.isHost && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
                      <Crown className="w-3 h-3" />
                      Host
                    </div>
                  )}

                  {/* Kick Button */}
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

          {/* ✅ CORRIGIDO: Mostrar apenas alguns slots vazios */}
          {visibleEmptyPlayerSlots > 0 && (
            <div className="space-y-2">
              {Array.from({ length: visibleEmptyPlayerSlots }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center p-3 rounded-lg border-2 border-dashed border-slate-600 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="ml-3 text-slate-500">
                    Aguardando jogador...
                  </span>
                </div>
              ))}

              {/* ✅ NOVO: Mostrar quantos slots restantes se houver muitos */}
              {emptyPlayerSlots > visibleEmptyPlayerSlots && (
                <div className="text-center py-2">
                  <span className="text-xs text-slate-500">
                    + {emptyPlayerSlots - visibleEmptyPlayerSlots} slot{emptyPlayerSlots - visibleEmptyPlayerSlots !== 1 ? 's' : ''} disponível{emptyPlayerSlots - visibleEmptyPlayerSlots !== 1 ? 'eis' : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ✅ NOVO: Sala cheia */}
          {players.length === maxPlayers && (
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-600/20 text-green-400 rounded-lg border border-green-600/30">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Sala Completa!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Espectadores */}
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
                        {spectator.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className={`
                        absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-800
                        ${spectator.isConnected ? 'bg-green-500' : 'bg-red-500'}
                      `} />
                    </div>
                    <span className="text-sm">
                      {spectator.username}
                      {spectator.userId === currentUserId && (
                        <span className="text-blue-400 ml-1">(Você)</span>
                      )}
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
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Slots vazios para espectadores (limitados) */}
            {visibleEmptySpectatorSlots > 0 && (
              <div className="space-y-2">
                {Array.from({ length: visibleEmptySpectatorSlots }).map((_, index) => (
                  <div
                    key={`empty-spec-${index}`}
                    className="flex items-center p-2 rounded-lg border border-dashed border-slate-600/50 opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700/30 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="ml-2 text-slate-600 text-sm">
                      Slot para espectador
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Nenhum espectador */}
            {spectators.length === 0 && visibleEmptySpectatorSlots === 0 && (
              <div className="text-center py-4 text-slate-500">
                <Eye className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum espectador</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}