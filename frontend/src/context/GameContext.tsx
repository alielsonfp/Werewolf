'use client';

import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import type { GameState, Player, GamePhase } from '@/types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================
interface GameContextState {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
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
  | { type: 'CLEAR_GAME' };

const initialState: GameContextState = {
  gameState: null,
  isLoading: false,
  error: null,
  connectionStatus: 'disconnected',
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
            }
            break;

          case 'game-ended':
            if (message.data?.gameId === gameId) {
              dispatch({ type: 'SET_GAME_STATE', payload: message.data });
            }
            break;

          case 'error':
            dispatch({ type: 'SET_ERROR', payload: message.data?.message || 'Erro desconhecido' });
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