import React from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Clock,
  Play,
  Wifi,
  WifiOff,
  AlertCircle,
  Crown
} from 'lucide-react';

interface ActionButtonsProps {
  isHost: boolean;
  isReady: boolean;
  canStartGame: boolean;
  isConnected: boolean;
  onToggleReady: () => void;
  onStartGame: () => void;
}

export default function ActionButtons({
  isHost,
  isReady,
  canStartGame,
  isConnected,
  onToggleReady,
  onStartGame
}: ActionButtonsProps) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {isHost && <Crown className="w-5 h-5 text-yellow-400" />}
        {isHost ? 'Controles do Host' : 'Ações'}
      </h3>

      <div className="space-y-3">
        {/* Botão Ready para todos */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleReady}
          disabled={!isConnected}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
            flex items-center justify-center gap-2
            ${isReady
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isReady ? (
            <>
              <Check className="w-5 h-5" />
              Pronto! (Clique para cancelar)
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              Marcar como Pronto
            </>
          )}
        </motion.button>

        {/* Botão Start Game apenas para host */}
        {isHost && (
          <motion.button
            whileHover={canStartGame ? { scale: 1.02 } : {}}
            whileTap={canStartGame ? { scale: 0.98 } : {}}
            onClick={onStartGame}
            disabled={!canStartGame || !isConnected}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
              flex items-center justify-center gap-2
              ${canStartGame
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/25'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }
              disabled:opacity-50
            `}
          >
            <Play className="w-5 h-5" />
            {canStartGame ? '🎮 Iniciar Jogo!' : 'Aguardando jogadores prontos...'}
          </motion.button>
        )}

        {/* Informações adicionais para host */}
        {isHost && (
          <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
            <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
              <AlertCircle className="w-4 h-4" />
              Requisitos para iniciar:
            </div>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Mínimo de 3 jogadores</li>
              <li>• Todos os jogadores prontos</li>
              <li>• Conexão estável</li>
            </ul>
          </div>
        )}

        {/* Indicador de conexão */}
        <div className="flex items-center justify-center gap-2 text-sm pt-2 border-t border-slate-600/50">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-red-500">Desconectado</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}