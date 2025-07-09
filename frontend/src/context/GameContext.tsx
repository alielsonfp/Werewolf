'use client';

import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import type { GameState, Player, GamePhase } from '@/types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================
interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  channel: 'public' | 'werewolf' | 'dead' | 'system';
  timestamp: string;
  filtered?: boolean;
}

interface GameContextState {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  chatMessages: ChatMessage[]; // ✅ ADICIONADO: Estado do chat
}

interface GameContextValue extends GameContextState {
  // Dados derivados
  me: Player | null;
  alivePlayers: Player[];
  deadPlayers: Player[];
  isMyTurn: boolean;
  canVote: boolean;
  canAct: boolean;

  // Actions
  refreshGame: () => void;
  clearError: () => void;
}

// =============================================================================
// REDUCER
// =============================================================================
type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: GameContextState['connectionStatus'] }
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'UPDATE_PHASE'; payload: { phase: GamePhase; timeLeft: number; day: number } }
  | { type: 'UPDATE_VOTING'; payload: { votes: Record<string, string>; counts: Record<string, number> } }
  | { type: 'PLAYER_DIED'; payload: { playerId: string; role?: string; cause: string } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage } // ✅ ADICIONADO: Ação para chat
  | { type: 'CLEAR_GAME' };

const initialState: GameContextState = {
  gameState: null,
  isLoading: false,
  error: null,
  connectionStatus: 'disconnected',
  chatMessages: [], // ✅ ADICIONADO: Inicializar array do chat
};

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_GAME_STATE':
      return {
        ...state,
        gameState: action.payload,
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
      };

    case 'UPDATE_PHASE':
      return {
        ...state,
        gameState: state.gameState ? {
          ...state.gameState,
          phase: action.payload.phase,
          timeLeft: action.payload.timeLeft,
          day: action.payload.day,
        } : null,
      };

    case 'UPDATE_VOTING':
      return {
        ...state,
        gameState: state.gameState ? {
          ...state.gameState,
          votes: action.payload.votes,
        } : null,
      };

    case 'PLAYER_DIED':
      return {
        ...state,
        gameState: state.gameState ? {
          ...state.gameState,
          players: state.gameState.players.map(player =>
            player.id === action.payload.playerId
              ? { ...player, isAlive: false, eliminationReason: action.payload.cause as any }
              : player
          ),
        } : null,
      };

    // ✅ ADICIONADO: Case para processar mensagens de chat
    case 'ADD_CHAT_MESSAGE':
      // Evitar duplicatas
      if (state.chatMessages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };

    case 'CLEAR_GAME':
      return initialState;

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================
const GameContext = createContext<GameContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================
interface GameProviderProps {
  children: React.ReactNode;
  gameId: string;
}

export function GameProvider({ children, gameId }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { user } = useAuth();

  // =============================================================================
  // WEBSOCKET MESSAGE HANDLING
  // =============================================================================
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      const message = event.detail;

      if (!message?.type) return;

      try {
        console.log('🎮 GameContext received message:', message.type, message.data);

        switch (message.type) {
          case 'game-state':
            if (message.data?.gameId === gameId) {
              dispatch({ type: 'SET_GAME_STATE', payload: message.data });
            }
            break;

          case 'phase-changed':
            if (message.data?.gameId === gameId) {
              dispatch({
                type: 'UPDATE_PHASE',
                payload: {
                  phase: message.data.phase,
                  timeLeft: message.data.timeLeft,
                  day: message.data.day,
                },
              });

              // ✅ ADICIONADO: Mensagem de sistema para mudança de fase
              let phaseMessage = '';
              switch (message.data.phase) {
                case 'DAY':
                  phaseMessage = `🌅 Dia ${message.data.day || '?'} começou! Hora de discutir.`;
                  break;
                case 'VOTING':
                  phaseMessage = `🗳️ Hora da votação! Escolham quem será executado.`;
                  break;
                case 'NIGHT':
                  phaseMessage = `🌙 Noite chegou... Os poderes especiais acordam.`;
                  break;
                default:
                  phaseMessage = `⏰ Fase mudou para ${message.data.phase}`;
              }

              const systemMessage: ChatMessage = {
                id: `system-phase-${Date.now()}`,
                userId: 'system',
                username: 'Sistema',
                message: phaseMessage,
                channel: 'system',
                timestamp: new Date().toISOString(),
              };

              dispatch({ type: 'ADD_CHAT_MESSAGE', payload: systemMessage });
            }
            break;

          case 'voting-update':
          case 'vote-cast':
          case 'vote-removed':
            if (message.data?.gameId === gameId) {
              dispatch({
                type: 'UPDATE_VOTING',
                payload: {
                  votes: message.data.votes || {},
                  counts: message.data.counts || {},
                },
              });
            }
            break;

          case 'player-died':
          case 'night-results':
            if (message.data?.gameId === gameId) {
              // Handle player deaths from night results
              if (message.data.deaths && Array.isArray(message.data.deaths)) {
                message.data.deaths.forEach((death: any) => {
                  dispatch({
                    type: 'PLAYER_DIED',
                    payload: {
                      playerId: death.playerId,
                      role: death.role,
                      cause: death.cause,
                    },
                  });
                });
              }

              // ✅ ADICIONADO: Mensagem de sistema para mortes
              let deathMessage = '';
              if (message.data.playerName) {
                deathMessage = `💀 ${message.data.playerName} foi eliminado!`;
              } else if (message.data.deaths && Array.isArray(message.data.deaths)) {
                const deathNames = message.data.deaths.map((d: any) => d.playerName || 'Alguém').join(', ');
                deathMessage = `💀 ${deathNames} foram eliminados!`;
              } else {
                deathMessage = '💀 Alguém foi eliminado!';
              }

              const systemMessage: ChatMessage = {
                id: `system-death-${Date.now()}`,
                userId: 'system',
                username: 'Sistema',
                message: deathMessage,
                channel: 'system',
                timestamp: new Date().toISOString(),
              };

              dispatch({ type: 'ADD_CHAT_MESSAGE', payload: systemMessage });
            }
            break;

          case 'game-ended':
            if (message.data?.gameId === gameId) {
              dispatch({ type: 'SET_GAME_STATE', payload: message.data });

              // ✅ ADICIONADO: Mensagem de fim de jogo
              if (message.data?.winningFaction) {
                let winMessage = '';
                switch (message.data.winningFaction) {
                  case 'TOWN':
                    winMessage = '🏆 A VILA VENCEU! Todos os lobisomens foram eliminados!';
                    break;
                  case 'WEREWOLF':
                    winMessage = '🐺 OS LOBISOMENS VENCERAM! Eles dominaram a vila!';
                    break;
                  default:
                    winMessage = '🎭 VITÓRIA ESPECIAL! Jogo finalizado!';
                }

                const systemMessage: ChatMessage = {
                  id: `system-victory-${Date.now()}`,
                  userId: 'system',
                  username: 'Sistema',
                  message: winMessage,
                  channel: 'system',
                  timestamp: new Date().toISOString(),
                };

                dispatch({ type: 'ADD_CHAT_MESSAGE', payload: systemMessage });
              }
            }
            break;

          // ✅ ADICIONADO: Processar mensagens de chat
          case 'chat-message':
            if (message.data?.message) {
              const receivedMessage = message.data.message;
              console.log('📬 GameContext: Processing chat message:', {
                messageId: receivedMessage.id,
                username: receivedMessage.username,
                channel: receivedMessage.channel,
                messagePreview: receivedMessage.message?.substring(0, 50),
              });

              const newMessage: ChatMessage = {
                id: receivedMessage.id || `msg-${Date.now()}`,
                userId: receivedMessage.userId || 'unknown',
                username: receivedMessage.username || 'Usuário',
                message: receivedMessage.message || '',
                channel: receivedMessage.channel || 'public',
                timestamp: receivedMessage.timestamp || new Date().toISOString(),
                filtered: receivedMessage.filtered || false,
              };

              dispatch({ type: 'ADD_CHAT_MESSAGE', payload: newMessage });
            }
            break;

          // ✅ ADICIONADO: Feedback de ações
          case 'action-feedback':
            if (message.data?.message) {
              console.log('ℹ️ GameContext: Action feedback received:', message.data.message);
              // Aqui você pode adicionar um toast/notificação se quiser
              // toast.info(message.data.message, { icon: 'ℹ️' });
            }
            break;

          case 'error':
            dispatch({ type: 'SET_ERROR', payload: message.data?.message || 'Erro desconhecido' });

            // ✅ ADICIONADO: Mostrar erros como mensagens de sistema
            if (message.data?.message) {
              const errorMessage: ChatMessage = {
                id: `system-error-${Date.now()}`,
                userId: 'system',
                username: 'Sistema',
                message: `❌ Erro: ${message.data.message}`,
                channel: 'system',
                timestamp: new Date().toISOString(),
              };

              dispatch({ type: 'ADD_CHAT_MESSAGE', payload: errorMessage });
            }
            break;

          default:
            // Log unknown message types for debugging
            console.log('🔍 Unknown game message type:', message.type);
        }
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Erro ao processar mensagem do servidor' });
      }
    };

    // Listen to WebSocket messages
    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener);

    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener);
    };
  }, [gameId]);

  // =============================================================================
  // DERIVED DATA (MEMOIZED)
  // =============================================================================
  const me = useMemo((): Player | null => {
    if (!state.gameState || !user?.id) return null;
    return state.gameState.players.find(p => p.userId === user.id) || null;
  }, [state.gameState, user?.id]);

  const alivePlayers = useMemo((): Player[] => {
    if (!state.gameState) return [];
    return state.gameState.players.filter(p => p.isAlive && !p.isSpectator);
  }, [state.gameState]);

  const deadPlayers = useMemo((): Player[] => {
    if (!state.gameState) return [];
    return state.gameState.players.filter(p => !p.isAlive && !p.isSpectator);
  }, [state.gameState]);

  const isMyTurn = useMemo((): boolean => {
    if (!me || !state.gameState) return false;

    // Durante a noite, verificar se é a vez da role do jogador agir
    if (state.gameState.phase === 'NIGHT') {
      return me.isAlive && !me.hasActed && (me.role === 'SHERIFF' || me.role === 'DOCTOR' || me.role === 'VIGILANTE' || me.role === 'WEREWOLF');
    }

    // Durante votação, todos podem votar
    if (state.gameState.phase === 'VOTING') {
      return me.isAlive && !me.hasVoted;
    }

    return false;
  }, [me, state.gameState]);

  const canVote = useMemo((): boolean => {
    return Boolean(
      me &&
      state.gameState &&
      state.gameState.phase === 'VOTING' &&
      me.isAlive &&
      !me.hasVoted
    );
  }, [me, state.gameState]);

  const canAct = useMemo((): boolean => {
    return Boolean(
      me &&
      state.gameState &&
      state.gameState.phase === 'NIGHT' &&
      me.isAlive &&
      !me.hasActed &&
      (me.role === 'SHERIFF' || me.role === 'DOCTOR' || me.role === 'VIGILANTE' || me.role === 'WEREWOLF')
    );
  }, [me, state.gameState]);

  // =============================================================================
  // ACTIONS
  // =============================================================================
  const refreshGame = () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    // Trigger game state refresh - could send a message to backend
    // For now, just clear loading state after a timeout
    setTimeout(() => {
      dispatch({ type: 'SET_LOADING', payload: false });
    }, 1000);
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  const contextValue: GameContextValue = {
    // State
    ...state,

    // Derived data
    me,
    alivePlayers,
    deadPlayers,
    isMyTurn,
    canVote,
    canAct,

    // Actions
    refreshGame,
    clearError,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// =============================================================================
// EXPORT
// =============================================================================
export default GameContext;