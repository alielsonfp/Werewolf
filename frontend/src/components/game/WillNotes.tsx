import React, { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';

// =============================================================================
// WILL NOTES COMPONENT - TESTAMENTO E ANOTAÇÕES
// =============================================================================
export default function WillNotes() {
  const { gameState, me } = useGame();

  const [will, setWill] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'will' | 'notes'>('will');

  // =============================================================================
  // LOAD FROM LOCALSTORAGE
  // =============================================================================
  useEffect(() => {
    if (gameState?.gameId) {
      const savedWill = localStorage.getItem(`will-${gameState.gameId}`);
      const savedNotes = localStorage.getItem(`notes-${gameState.gameId}`);

      if (savedWill) setWill(savedWill);
      if (savedNotes) setNotes(savedNotes);
    }
  }, [gameState?.gameId]);

  // =============================================================================
  // SAVE TO LOCALSTORAGE
  // =============================================================================
  useEffect(() => {
    if (gameState?.gameId) {
      localStorage.setItem(`will-${gameState.gameId}`, will);
    }
  }, [will, gameState?.gameId]);

  useEffect(() => {
    if (gameState?.gameId) {
      localStorage.setItem(`notes-${gameState.gameId}`, notes);
    }
  }, [notes, gameState?.gameId]);

  // =============================================================================
  // TEMPLATE HELPERS
  // =============================================================================
  const insertTemplate = (template: string) => {
    if (activeTab === 'will') {
      setWill(prev => prev + (prev ? '\n' : '') + template);
    } else {
      setNotes(prev => prev + (prev ? '\n' : '') + template);
    }
  };

  const getWillTemplates = () => [
    'Meu nome é [NOME] e eu sou [ROLE].',
    'N1: [INVESTIGAÇÃO/AÇÃO]',
    'D1: [SUSPEITAS]',
    'Se eu morrer, suspeitem de: [NOMES]',
    'Confiem em: [NOMES]',
  ];

  const getNotesTemplates = () => [
    '🔍 INVESTIGAÇÕES:',
    '⚡ SUSPEITOS:',
    '✅ CONFIRMADOS:',
    '🐺 POSSÍVEIS LOBISOMENS:',
    '📝 CLAIMS:',
  ];

  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

      {/* Header with Tabs */}
      <div className="flex-shrink-0 border-b border-medieval-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>📜</span>
            <span>Anotações</span>
          </h3>

          {/* Character count */}
          <div className="text-xs text-white/50">
            {activeTab === 'will' ? will.length : notes.length}/1000
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('will')}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'will'
                ? 'bg-amber-600 text-white'
                : 'bg-medieval-700/50 text-white/70 hover:bg-medieval-700'
              }
            `}
          >
            📜 Testamento
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'notes'
                ? 'bg-blue-600 text-white'
                : 'bg-medieval-700/50 text-white/70 hover:bg-medieval-700'
              }
            `}
          >
            📝 Notas
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">

        {/* Templates */}
        <div className="flex-shrink-0 border-b border-medieval-600 p-2">
          <div className="text-xs text-white/70 mb-2">Templates rápidos:</div>
          <div className="flex flex-wrap gap-1">
            {(activeTab === 'will' ? getWillTemplates() : getNotesTemplates()).map((template, index) => (
              <button
                key={index}
                onClick={() => insertTemplate(template)}
                className="text-xs bg-medieval-700 hover:bg-medieval-600 text-white/80 px-2 py-1 rounded transition-all duration-200"
                title={`Inserir: ${template}`}
              >
                {template.split(':')[0] || template.substring(0, 10)}...
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 p-4">
          <textarea
            value={activeTab === 'will' ? will : notes}
            onChange={(e) => {
              const value = e.target.value.substring(0, 1000); // Limit characters
              if (activeTab === 'will') {
                setWill(value);
              } else {
                setNotes(value);
              }
            }}
            placeholder={
              activeTab === 'will'
                ? `Escreva seu testamento aqui...\n\nExemplo:\nMeu nome é ${me?.username} e eu sou ${me?.role || '[ROLE]'}.\nN1: Investiguei João - SUSPEITO\nD1: João está mentindo sobre sua role\nSe eu morrer, suspeitem de João e Maria`
                : `Suas anotações pessoais...\n\n🔍 INVESTIGAÇÕES:\n- João: SUSPEITO (N1)\n- Maria: INOCENTE (N2)\n\n⚡ SUSPEITOS:\n- João (mentiu sobre role)\n- Pedro (comportamento estranho)\n\n✅ CONFIRMADOS:\n- Ana (Doctor claim + salvou alguém)`
            }
            className="w-full h-full bg-medieval-900/50 border border-medieval-600 rounded-lg p-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-amber-400 font-mono leading-relaxed"
            style={{ minHeight: '200px' }}
          />
        </div>

        {/* Tips */}
        <div className="flex-shrink-0 border-t border-medieval-600 p-3">
          <div className="text-xs text-white/50">
            {activeTab === 'will' ? (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <span>💡</span>
                  <span>Dica: Seu testamento será revelado quando você morrer</span>
                </div>
                <div>Use-o para deixar informações importantes para seu time!</div>
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <span>💡</span>
                  <span>Dica: Use as notas para rastrear suas investigações</span>
                </div>
                <div>Mantenha registro de quem é suspeito e por quê!</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Info Panel */}
      <div className="flex-shrink-0 border-t border-medieval-600 p-3 bg-medieval-900/30">
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-white/70">Sua Role:</span>
            <span className="text-purple-300">{me?.role || 'Aguardando...'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/70">Facção:</span>
            <span className={`${me?.faction === 'TOWN' ? 'text-green-400' :
              me?.faction === 'WEREWOLF' ? 'text-red-400' :
                'text-purple-400'
              }`}>
              {me?.faction === 'TOWN' ? 'Vila' :
                me?.faction === 'WEREWOLF' ? 'Lobisomem' :
                  me?.faction === 'NEUTRAL' ? 'Neutro' : 'Aguardando...'}
            </span>
          </div>

          {gameState && (
            <div className="flex justify-between">
              <span className="text-white/70">Dia:</span>
              <span className="text-amber-400">{gameState.day}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-white/70">Status:</span>
            <span className={me?.isAlive ? 'text-green-400' : 'text-red-400'}>
              {me?.isAlive ? 'Vivo' : 'Morto'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}