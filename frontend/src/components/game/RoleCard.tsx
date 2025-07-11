import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import type { Role, Faction } from '@/types';

// =============================================================================
// ROLE CONFIGURATIONS
// =============================================================================
const ROLE_INFO: Record<Role, {
  name: string;
  icon: string;
  description: string;
  abilities: string[];
  goal: string;
  tips: string[];
}> = {
  VILLAGER: {
    name: 'Aldeão',
    icon: '👨‍🌾',
    description: 'Um cidadão comum da vila',
    abilities: ['Votar durante o dia'],
    goal: 'Eliminar todos os Lobisomens',
    tips: [
      'Preste atenção aos comportamentos suspeitos',
      'Use seu voto com sabedoria',
      'Confie nas informações do Sheriff'
    ],
  },
  SHERIFF: {
    name: 'Sheriff',
    icon: '🕵️',
    description: 'Investigador da vila',
    abilities: ['Investigar um jogador por noite', 'Descobre se é SUSPEITO ou NÃO SUSPEITO'],
    goal: 'Encontrar e eliminar todos os Lobisomens',
    tips: [
      'Investigue jogadores suspeitos',
      'Compartilhe informações com cuidado',
      'Cuidado para não se revelar cedo demais'
    ],
  },
  DOCTOR: {
    name: 'Médico',
    icon: '⚕️',
    description: 'Protetor da vila',
    abilities: ['Proteger um jogador por noite', 'Não pode proteger a mesma pessoa duas noites seguidas'],
    goal: 'Manter a vila viva eliminando Lobisomens',
    tips: [
      'Proteja jogadores importantes',
      'Não se proteja consecutivamente',
      'Observe padrões de ataque'
    ],
  },
  VIGILANTE: {
    name: 'Vigilante',
    icon: '🔫',
    description: 'Justiceiro da vila',
    abilities: ['Matar um jogador por noite (3 usos)', 'Perde a propria vida se matar inocente'],
    goal: 'Eliminar Lobisomens com sua arma',
    tips: [
      'Use suas balas com muito cuidado',
      'Só atire se tiver certeza',
      'Matar um inocente te faz a vida'
    ],
  },
  WEREWOLF: {
    name: 'Lobisomem',
    icon: '🐺',
    description: 'Predador da noite',
    abilities: ['Ajudar o lobo rei a manipular os villagers', 'Chat privado com outros lobisomens'],
    goal: 'Igualar ou superar o número da Vila',
    tips: [
      'Coordene com outros lobisomens',
      'Blefe durante o dia',
      'Elimine ameaças prioritárias'
    ],
  },
  WEREWOLF_KING: {
    name: 'Rei Lobisomem',
    icon: '👑',
    description: 'Líder da alcateia',
    abilities: ['Matar um jogador por noite', 'Imune à investigação do Sheriff', 'Chat privado com lobisomens'],
    goal: 'Liderar a alcateia até a vitória',
    tips: [
      'Use sua imunidade ao Sheriff',
      'Lidere as decisões da alcateia',
      'Mantenha-se disfarçado'
    ],
  },
  JESTER: {
    name: 'Bobo da Corte',
    icon: '🤡',
    description: 'Personagem caótico',
    abilities: ['Vencer se for executado durante o dia', 'Imune a ataques noturnos'],
    goal: 'Ser executado pela vila (NÃO morto à noite)',
    tips: [
      'Pareça suspeito sem ser óbvio',
      'Evite ser morto à noite',
      'Cause confusão nas discussões'
    ],
  },
  SERIAL_KILLER: {
    name: 'Assassino em Série',
    icon: '🔪',
    description: 'Matador solitário',
    abilities: ['Matar um jogador por noite', 'Imune a investigação na primeira noite'],
    goal: 'Ser o último sobrevivente',
    tips: [
      'Elimine todos os outros',
      'Finja ser da vila',
      'Mate ameaças e suspeitos'
    ],
  },
};

const FACTION_INFO: Record<Faction, {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  TOWN: {
    name: 'Vila',
    color: 'text-green-400',
    bgColor: 'bg-green-900',
    borderColor: 'border-green-600',
  },
  WEREWOLF: {
    name: 'Lobisomens',
    color: 'text-red-400',
    bgColor: 'bg-red-900',
    borderColor: 'border-red-600',
  },
  NEUTRAL: {
    name: 'Neutro',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900',
    borderColor: 'border-purple-600',
  },
};

// =============================================================================
// ROLE CARD COMPONENT - COMPACTO PARA LAYOUT TOWN OF SALEM
// =============================================================================
export default function RoleCard() {
  const { me, gameState } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!me || !me.role || !me.faction || !gameState) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4 animate-pulse">❓</div>
          <h3 className="text-white font-semibold mb-2">Aguardando Role</h3>
          <p className="text-white/50 text-sm">Sua role será revelada quando o jogo começar</p>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_INFO[me.role];
  const factionInfo = FACTION_INFO[me.faction];

  if (!roleInfo || !factionInfo) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4">❓</div>
          <h3 className="text-white font-semibold mb-2">Role Desconhecida</h3>
          <p className="text-white/50 text-sm">Role: {me.role}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

      {/* Header - Always Visible */}
      <div className={`
        flex-shrink-0 ${factionInfo.bgColor} border-b ${factionInfo.borderColor} p-4 rounded-t-lg cursor-pointer transition-all duration-200
        ${isExpanded ? '' : 'hover:opacity-80'}
      `} onClick={() => setIsExpanded(!isExpanded)}>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{roleInfo.icon}</div>
            <div>
              <h3 className="text-white font-bold text-lg">{roleInfo.name}</h3>
              <p className={`text-sm ${factionInfo.color}`}>{factionInfo.name}</p>
            </div>
          </div>

          <div className="text-white text-lg">
            {isExpanded ? '📖' : '📚'}
          </div>
        </div>

        {/* Quick Status - Always Visible */}
        {!isExpanded && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-white/70">Status:</span>
              <span className={me.isAlive ? 'text-green-400' : 'text-red-400'}>
                {me.isAlive ? 'Vivo' : 'Morto'}
              </span>
            </div>

            {me.hasActed !== undefined && gameState?.phase === 'NIGHT' && (
              <div className="flex justify-between">
                <span className="text-white/70">Ação:</span>
                <span className={me.hasActed ? 'text-blue-400' : 'text-amber-400'}>
                  {me.hasActed ? 'Usada' : 'Disponível'}
                </span>
              </div>
            )}

            {me.hasVoted !== undefined && gameState?.phase === 'VOTING' && (
              <div className="flex justify-between">
                <span className="text-white/70">Voto:</span>
                <span className={me.hasVoted ? 'text-green-400' : 'text-amber-400'}>
                  {me.hasVoted ? 'Votou' : 'Pendente'}
                </span>
              </div>
            )}

            {me.isProtected && (
              <div className="flex justify-between col-span-2">
                <span className="text-white/70">Proteção:</span>
                <span className="text-blue-400">🛡️ Ativa</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-medieval-900/20">

          {/* Description */}
          <div>
            <h4 className="text-white font-semibold mb-2 flex items-center space-x-1">
              <span>📝</span>
              <span>Descrição</span>
            </h4>
            <p className="text-white/80 text-sm">{roleInfo.description}</p>
          </div>

          {/* Abilities */}
          <div>
            <h4 className="text-white font-semibold mb-2 flex items-center space-x-1">
              <span>⚡</span>
              <span>Habilidades</span>
            </h4>
            <ul className="space-y-1">
              {roleInfo.abilities.map((ability, index) => (
                <li key={index} className="text-white/80 text-sm flex items-start space-x-2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                  <span>{ability}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Goal */}
          <div>
            <h4 className="text-white font-semibold mb-2 flex items-center space-x-1">
              <span>🎯</span>
              <span>Objetivo</span>
            </h4>
            <p className={`text-sm font-medium ${factionInfo.color} bg-medieval-800/50 p-2 rounded border ${factionInfo.borderColor}`}>
              {roleInfo.goal}
            </p>
          </div>

          {/* Tips */}
          <div>
            <h4 className="text-white font-semibold mb-2 flex items-center space-x-1">
              <span>💡</span>
              <span>Dicas</span>
            </h4>
            <ul className="space-y-1">
              {roleInfo.tips.map((tip, index) => (
                <li key={index} className="text-white/70 text-xs flex items-start space-x-2">
                  <span className="text-amber-400 mt-1 flex-shrink-0">💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Detailed Status */}
          <div className="border-t border-medieval-600 pt-3">
            <h4 className="text-white font-semibold mb-2 flex items-center space-x-1">
              <span>📊</span>
              <span>Status Detalhado</span>
            </h4>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between p-2 bg-medieval-800/30 rounded">
                <span className="text-white/70">Status de Vida:</span>
                <span className={me.isAlive ? 'text-green-400' : 'text-red-400'}>
                  {me.isAlive ? '💚 Vivo' : '💀 Morto'}
                </span>
              </div>

              {me.hasActed !== undefined && (
                <div className="flex justify-between p-2 bg-medieval-800/30 rounded">
                  <span className="text-white/70">Ação Noturna:</span>
                  <span className={me.hasActed ? 'text-blue-400' : 'text-amber-400'}>
                    {me.hasActed ? '✅ Executada' : '⏳ Disponível'}
                  </span>
                </div>
              )}

              {me.hasVoted !== undefined && (
                <div className="flex justify-between p-2 bg-medieval-800/30 rounded">
                  <span className="text-white/70">Voto:</span>
                  <span className={me.hasVoted ? 'text-green-400' : 'text-amber-400'}>
                    {me.hasVoted ? '🗳️ Votou' : '⏳ Pendente'}
                  </span>
                </div>
              )}

              {me.isProtected && (
                <div className="flex justify-between p-2 bg-blue-900/30 rounded border border-blue-600">
                  <span className="text-white/70">Proteção:</span>
                  <span className="text-blue-400">🛡️ Protegido</span>
                </div>
              )}

              {me.actionsUsed !== undefined && me.maxActions !== undefined && (
                <div className="flex justify-between p-2 bg-medieval-800/30 rounded">
                  <span className="text-white/70">Ações Restantes:</span>
                  <span className="text-amber-400">{me.maxActions - me.actionsUsed}/{me.maxActions}</span>
                </div>
              )}

              {me.eliminationReason && (
                <div className="flex justify-between p-2 bg-red-900/30 rounded border border-red-600">
                  <span className="text-white/70">Causa da Morte:</span>
                  <span className="text-red-400">
                    {me.eliminationReason === 'NIGHT_KILL' ? '🌙 Morto à noite' :
                      me.eliminationReason === 'EXECUTION' ? '🗳️ Executado' :
                        me.eliminationReason === 'VIGILANTE' ? '🔫 Vigilante' :
                          '🔪 Assassino'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer - Game Info */}
      {!isExpanded && gameState && (
        <div className="flex-shrink-0 border-t border-medieval-600 p-3 bg-medieval-900/30">
          <div className="text-xs text-center text-white/50">
            Dia {gameState.day} • {gameState.phase === 'NIGHT' ? '🌙 Noite' :
              gameState.phase === 'DAY' ? '☀️ Dia' :
                gameState.phase === 'VOTING' ? '🗳️ Votação' :
                  gameState.phase}
          </div>
        </div>
      )}
    </div>
  );
}