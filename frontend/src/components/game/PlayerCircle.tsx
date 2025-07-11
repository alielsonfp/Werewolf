import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useTheme } from '@/context/ThemeContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Player, GamePhase, Role } from '@/types';
import PlayerActionModal from './PlayerActionModal';

// =============================================================================
// PLAYER EMOJIS - Lista de emojis de pessoas para usar nas bolinhas
// =============================================================================
const PLAYER_EMOJIS = [
  '👨', '👩', '🧑', '👴', '👵', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍⚕️',
  '👩‍⚕️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💻',
  '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🚒', '👩‍🚒', '👮‍♂️', '👮‍♀️', '🧙‍♂️', '🧙‍♀️', '🧝‍♂️',
  '🧝‍♀️', '🧛‍♂️', '🧛‍♀️', '🧟‍♂️', '🧟‍♀️', '👸', '🤴', '👰', '🤵', '🤱'
];

// =============================================================================
// HELPER FUNCTION - Get player emoji by ID
// =============================================================================
const getPlayerEmoji = (playerId: string | undefined): string => {
  // Default emoji if no ID provided
  if (!playerId) return '👤';
  
  // Use a simple hash of the player ID to consistently assign the same emoji
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % PLAYER_EMOJIS.length;
  return PLAYER_EMOJIS[index] || '👤'; // Fallback emoji if undefined
};
// =============================================================================
// PLAYER CIRCLE COMPONENT - PLAYERS AO REDOR DA FORCA (COM AÇÕES DE CLIQUE)
// =============================================================================
export default function PlayerCircle() {
  const { gameState, me } = useGame();
  const { playSound } = useTheme();
  
  // =============================================================================
  // MODAL STATE
  // =============================================================================
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (!gameState) {
    return (
      <div className="w-full h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex items-center justify-center">
        <LoadingSpinner text="Carregando jogadores..." />
      </div>
    );
  }

  // =============================================================================
  // FILTER PLAYERS - APENAS JOGADORES VIVOS
  // =============================================================================
  const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isSpectator);

  // =============================================================================
  // CALCULATE PLAYER POSITIONS IN CIRCLE
  // =============================================================================
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    const angle = (index * 360) / totalPlayers - 90; // Start from top
    const radius = 180; // Distance from center
    const centerX = 50; // Center X percentage
    const centerY = 50; // Center Y percentage

    const x = centerX + (radius * Math.cos((angle * Math.PI) / 180)) / 4;
    const y = centerY + (radius * Math.sin((angle * Math.PI) / 180)) / 4;

    return { x: `${x}%`, y: `${y}%` };
  };

  // =============================================================================
  // PLAYER CLICK HANDLER
  // =============================================================================
  const handlePlayerClick = (player: Player) => {
    console.log('🎯 DEBUG - Player clicked:', {
      targetPlayer: player.username,
      targetRole: player.role,
      myRole: me?.role,
      gamePhase: gameState?.phase
    });

    // Don't allow actions if not logged in or no game state
    if (!me || !gameState) {
      console.log('❌ No me or gameState');
      playSound('error');
      return;
    }

    // Don't allow clicking on dead players
    if (!player.isAlive) {
      console.log('❌ Player is dead');
      playSound('error');
      return;
    }

    // Don't allow actions during certain phases
    const canAct = gameState.phase === GamePhase.VOTING || 
                   (gameState.phase === GamePhase.NIGHT && me.role && 
                    [Role.SHERIFF, Role.DOCTOR, Role.WEREWOLF_KING, Role.VIGILANTE, Role.SERIAL_KILLER].includes(me.role));
    
    if (!canAct) {
      console.log('❌ Cannot act in this phase');
      playSound('error');
      return;
    }

    // ✅ VALIDAÇÃO PRINCIPAL: Verificar se ambos são lobos (CORRIGIDA PARA ENUMS)
    const isTargetWerewolf = player.role === Role.WEREWOLF || player.role === Role.WEREWOLF_KING;
    const isMeWerewolf = me.role === Role.WEREWOLF || me.role === Role.WEREWOLF_KING;
    const isBothWerewolves = isTargetWerewolf && isMeWerewolf && player.id !== me.id;

    console.log('🐺 DEBUG - Werewolf check:', {
      isTargetWerewolf,
      isMeWerewolf,
      isBothWerewolves,
      targetId: player.id,
      myId: me.id
    });

    // Se ambos são lobos, bloquear qualquer ação (votação ou ataque)
    if (isBothWerewolves) {
      console.log('🚫 BLOCKED - Both are werewolves!');
      playSound('error');
      
      // Mostrar feedback visual rápido
      alert(`🐺 Proteção da Alcateia!\n\nLobos não podem agir contra outros lobos.\n\nSeu role: ${me.role}\nAlvo: ${player.username} (${player.role})`);
      return;
    }

    console.log('✅ Action allowed - Opening modal');
    // Open modal for selected player
    playSound('button_click');
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  // =============================================================================
  // MODAL HANDLERS
  // =============================================================================
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };

  // =============================================================================
  // GET PLAYER STATUS STYLING
  // =============================================================================
  const getPlayerStyles = (player: Player) => {
    const isCurrentPlayer = player.id === me?.id;
    
    // ✅ NOVA LÓGICA: Verificar se pode clicar (considerando proteção de lobos)
    let canClickPlayer = false;
    if (me && gameState && player.isAlive) {
      const isTargetWerewolf = player.role === Role.WEREWOLF || player.role === Role.WEREWOLF_KING;
      const isMeWerewolf = me.role === Role.WEREWOLF || me.role === Role.WEREWOLF_KING;
      const isBothWerewolves = isTargetWerewolf && isMeWerewolf && !isCurrentPlayer;
      
      // Pode clicar se: fase correta + role válida + não são ambos lobos
      const hasValidPhase = gameState.phase === GamePhase.VOTING || 
                           (gameState.phase === GamePhase.NIGHT && 
                            me.role !== undefined && 
                            [Role.SHERIFF, Role.DOCTOR, Role.WEREWOLF_KING, Role.VIGILANTE, Role.SERIAL_KILLER].includes(me.role));
      
      canClickPlayer = Boolean(hasValidPhase && !isBothWerewolves);
    }

    let baseClasses = `
      relative w-16 h-16 rounded-full border-4 flex items-center justify-center
      transition-all duration-300 transform text-white font-bold text-sm
      shadow-lg backdrop-blur-sm
    `;

    // Current player styling
    if (isCurrentPlayer) {
      baseClasses += ` border-yellow-400 bg-gradient-to-br from-yellow-600/80 to-yellow-800/80
                       shadow-yellow-400/50 ring-2 ring-yellow-400/30`;
    }
    // Clickable players
    else if (canClickPlayer && !isCurrentPlayer) {
      baseClasses += ` border-blue-400 bg-gradient-to-br from-blue-600/80 to-blue-800/80
                       hover:border-blue-300 hover:shadow-blue-400/50 hover:scale-110
                       cursor-pointer hover:ring-2 hover:ring-blue-400/50
                       active:scale-95`;
    }
    // Non-clickable players (including protected werewolves)
    else {
      baseClasses += ` border-gray-400 bg-gradient-to-br from-gray-600/80 to-gray-800/80`;
    }

    return baseClasses;
  };

  // =============================================================================
  // GET CLICK INDICATOR
  // =============================================================================
  const getClickIndicator = (player: Player) => {
    if (!me || !gameState || player.id === me.id || !player.isAlive) {
      return null;
    }

    const isVoting = gameState.phase === GamePhase.VOTING;
    const isNight = gameState.phase === GamePhase.NIGHT;
    const hasNightAbility = me.role && [Role.SHERIFF, Role.DOCTOR, Role.WEREWOLF_KING, Role.VIGILANTE, Role.SERIAL_KILLER].includes(me.role);

    if (isVoting) {
      return (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs">
          🗳️
        </div>
      );
    }

    if (isNight && hasNightAbility && !me.hasActed) {
      const abilityIcons = {
        [Role.SHERIFF]: '🔍',
        [Role.DOCTOR]: '🛡️',
        [Role.WEREWOLF_KING]: '👑',
        [Role.VIGILANTE]: '⚔️',
        [Role.SERIAL_KILLER]: '🔪'
      };
      
      return (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs">
          {abilityIcons[me.role as keyof typeof abilityIcons] || '✨'}
        </div>
      );
    }

    return null;
  };

  // =============================================================================
  // RENDER COMPONENT
  // =============================================================================
  return (
    <>
      <div className="relative w-full h-full">
        {/* Background Circle */}
        <div className="absolute inset-0 border-2 border-medieval-600/50 rounded-full bg-medieval-900/20" />
        
        {/* Center Gallows with Axe */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-6xl filter drop-shadow-lg">🪓</div>
          <div className="text-center text-white/70 text-sm mt-1 font-medieval font-bold">
            FORCA
          </div>
        </div>

        {/* Players positioned in circle */}
        {alivePlayers.map((player, index) => {
          const position = getPlayerPosition(index, alivePlayers.length);
          
          return (
            <div
              key={player.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: position.x,
                top: position.y,
              }}
            >
              {/* Player Circle */}
              <div
                className={getPlayerStyles(player)}
                onClick={() => handlePlayerClick(player)}
                title={`${player.username}${player.id === me?.id ? ' (Você)' : ''}`}
              >
                {/* Player Emoji */}
                <span className="text-2xl">
                  {getPlayerEmoji(player?.id)}
                </span>

                {/* Action Indicator */}
                {getClickIndicator(player)}

                {/* Voted Indicator */}
                {gameState.phase === GamePhase.VOTING && gameState.votes[player.id] && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 
                                w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}

                {/* Protected Indicator (if you know they're protected) */}
                {gameState.phase === GamePhase.NIGHT && player.isProtected && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full 
                                flex items-center justify-center text-xs">
                    🛡️
                  </div>
                )}
              </div>

              {/* Player Name */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 
                            text-white text-xs text-center font-medium min-w-max px-2">
                <div className="bg-black/50 rounded px-2 py-1 backdrop-blur-sm">
                  {player.username}
                  {player.id === me?.id && (
                    <div className="text-yellow-400 text-xs">(Você)</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Instructions overlay */}
        {me && gameState && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                        text-center text-white/70 text-sm max-w-xs">
            {gameState.phase === GamePhase.VOTING && (
              <div className="bg-black/60 rounded-lg px-4 py-2 backdrop-blur-sm">
                🗳️ Clique em um jogador para votar
              </div>
            )}
            {gameState.phase === GamePhase.NIGHT && me.role && 
             [Role.SHERIFF, Role.DOCTOR, Role.WEREWOLF_KING, Role.VIGILANTE, Role.SERIAL_KILLER].includes(me.role) && 
             !me.hasActed && (
              <div className="bg-black/60 rounded-lg px-4 py-2 backdrop-blur-sm">
                ✨ Clique em um jogador para usar sua habilidade
              </div>
            )}
            {gameState.phase === GamePhase.NIGHT && me.hasActed && (
              <div className="bg-black/60 rounded-lg px-4 py-2 backdrop-blur-sm">
                ✅ Você já realizou sua ação nesta noite
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player Action Modal */}
      {isModalOpen && selectedPlayer && (
        <PlayerActionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          targetPlayer={selectedPlayer}
        />
      )}
    </>
  );
}