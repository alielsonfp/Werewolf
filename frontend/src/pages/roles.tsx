import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  ArrowLeft,
  Users,
  Moon,
  Sun,
  Shield,
  Search,
  Heart,
  Sword,
  Crown,
  Skull,
  Zap,
  Target,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/common/Button';

// Tipos de roles
interface Role {
  id: string;
  name: string;
  emoji: string;
  faction: 'Vila' | 'Lobisomens' | 'Neutros';
  description: string;
  power: string;
  strategy: string;
  winCondition: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Dados das roles baseados na documentação
const roles: Role[] = [
  // VILA
  {
    id: 'villager',
    name: 'Aldeão',
    emoji: '👤',
    faction: 'Vila',
    description: 'Cidadão comum da vila que deve ajudar a identificar e eliminar os lobisomens.',
    power: 'Apenas voto durante o dia',
    strategy: 'Preste atenção nos comportamentos suspeitos e participe ativamente das discussões.',
    winCondition: 'Eliminar todos os lobisomens e inimigos da vila',
    icon: <Users className="w-6 h-6" />,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-500/30'
  },
  {
    id: 'sheriff',
    name: 'Sheriff',
    emoji: '🔍',
    faction: 'Vila',
    description: 'Investigador experiente que pode descobrir a verdadeira natureza dos habitantes.',
    power: 'Investiga 1 pessoa por noite - resultado: "SUSPEITO" ou "NÃO SUSPEITO"',
    strategy: 'Compartilhe informações com cuidado. Lobisomens podem se passar por Sheriff.',
    winCondition: 'Eliminar todos os lobisomens e inimigos da vila',
    icon: <Search className="w-6 h-6" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'doctor',
    name: 'Médico',
    emoji: '⚕️',
    faction: 'Vila',
    description: 'Curandeiro da vila capaz de proteger pessoas dos ataques noturnos.',
    power: 'Protege 1 pessoa por noite da morte (não pode se proteger consecutivamente)',
    strategy: 'Proteja pessoas importantes ou suspeitas de serem atacadas. Varie seus alvos.',
    winCondition: 'Eliminar todos os lobisomens e inimigos da vila',
    icon: <Heart className="w-6 h-6" />,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-500/30'
  },
  {
    id: 'vigilante',
    name: 'Vigilante',
    emoji: '🔫',
    faction: 'Vila',
    description: 'Justiceiro da vila que toma a lei em suas próprias mãos.',
    power: 'Mata 1 pessoa por noite (3 usos) - Se matar inocente, perde a propria vida com peso na consciencia',
    strategy: 'Só mate se tiver CERTEZA. Um erro pode custar caro à vila.',
    winCondition: 'Eliminar todos os lobisomens e inimigos da vila',
    icon: <Sword className="w-6 h-6" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-500/30'
  },

  // LOBISOMENS
  {
    id: 'werewolf_king',
    name: 'Lobisomem Rei',
    emoji: '👑',
    faction: 'Lobisomens',
    description: 'Líder da alcateia com poderes especiais que o tornam mais difícil de detectar.',
    power: 'Mata 1 pessoa por noite + IMUNE à investigação do Sheriff (aparece como "NÃO SUSPEITO")',
    strategy: 'Use sua imunidade com sabedoria. Lidere a alcateia nas decisões noturnas.',
    winCondition: 'Igualar ou superar o número de membros da vila',
    icon: <Crown className="w-6 h-6" />,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-500/30'
  },
  {
    id: 'werewolf',
    name: 'Lobisomem',
    emoji: '🐺',
    faction: 'Lobisomens',
    description: 'Criatura da noite que caça em matilha para dominar a vila.',
    power: 'Mata 1 pessoa por noite (votação em grupo) + Chat privado com outros lobisomens',
    strategy: 'Blefe durante o dia fingindo ser da vila. Coordene ataques à noite.',
    winCondition: 'Igualar ou superar o número de membros da vila',
    icon: <Moon className="w-6 h-6" />,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-500/30'
  },

  // NEUTROS
  {
    id: 'jester',
    name: 'Jester',
    emoji: '🤡',
    faction: 'Neutros',
    description: 'Bobo da corte que busca sua própria destruição de forma peculiar.',
    power: 'Nenhum poder especial - Objetivo único de ser executado',
    strategy: 'Seja suspeito o suficiente para ser votado, mas não óbvio demais.',
    winCondition: 'Ser executado durante o dia por votação (NÃO morto à noite)',
    icon: <Target className="w-6 h-6" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
    borderColor: 'border-purple-500/30'
  },
  {
    id: 'serial_killer',
    name: 'Serial Killer',
    emoji: '🔪',
    faction: 'Neutros',
    description: 'Assassino solitário que busca eliminar todos os outros jogadores.',
    power: 'Mata 1 pessoa por noite - Age independentemente',
    strategy: 'Finja ser da vila enquanto elimina ameaças. Sobreviva até o final.',
    winCondition: 'Ser o último sobrevivente (eliminar TODOS os outros jogadores)',
    icon: <Skull className="w-6 h-6" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-900/20',
    borderColor: 'border-gray-500/30'
  }
];

// Composições de jogo
const gameCompositions = [
  {
    players: 6,
    name: 'Composição Básica',
    vila: 3,
    lobisomens: 2,
    neutros: 1,
    details: '1 Sheriff + 1 Doctor + 1 Villager | 1 Lobisomem Rei + 1 Lobisomem | 1 Jester'
  },
  {
    players: 9,
    name: 'Composição Média',
    vila: 5,
    lobisomens: 3,
    neutros: 1,
    details: '1 Sheriff + 1 Doctor + 1 Vigilante + 2 Villagers | 1 Lobisomem Rei + 2 Lobisomens | 1 Jester'
  },
  {
    players: 12,
    name: 'Composição Padrão',
    vila: 7,
    lobisomens: 3,
    neutros: 2,
    details: '1 Sheriff + 1 Doctor + 1 Vigilante + 4 Villagers | 1 Lobisomem Rei + 2 Lobisomens | 1 Jester + 1 Serial Killer'
  },
  {
    players: 15,
    name: 'Composição Máxima',
    vila: 9,
    lobisomens: 4,
    neutros: 2,
    details: '1 Sheriff + 1 Doctor + 1 Vigilante + 6 Villagers | 1 Lobisomem Rei + 3 Lobisomens | 1 Jester + 1 Serial Killer'
  }
];

export default function RolesPage() {
  const router = useRouter();
  const { playSound, getPhaseColors, getThemeClass } = useTheme();
  const { scrollY } = useScroll();

  const [selectedFaction, setSelectedFaction] = useState<string>('all');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showCompositions, setShowCompositions] = useState(false);

  // Aplicar cores dinâmicas do tema
  const phaseColors = getPhaseColors();

  // Parallax effects
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const textY = useTransform(scrollY, [0, 500], [0, 100]);

  const filteredRoles = selectedFaction === 'all'
    ? roles
    : roles.filter(role => role.faction === selectedFaction);

  const handleBack = () => {
    playSound('button_click');
    router.push('/');
  };

  const toggleRole = (roleId: string) => {
    playSound('button_click');
    setExpandedRole(expandedRole === roleId ? null : roleId);
  };

  const getFactionIcon = (faction: string) => {
    switch (faction) {
      case 'Vila': return <Shield className="w-5 h-5" />;
      case 'Lobisomens': return <Moon className="w-5 h-5" />;
      case 'Neutros': return <Zap className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getFactionColor = (faction: string) => {
    switch (faction) {
      case 'Vila': return 'text-green-400';
      case 'Lobisomens': return 'text-red-400';
      case 'Neutros': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  return (
    <>
      <Head>
        <title>Papéis do Jogo - Werewolf</title>
        <meta name="description" content="Conheça todos os papéis disponíveis no Werewolf e aprenda as estratégias de cada um." />
      </Head>

      <div className={`min-h-screen transition-all duration-300 bg-gradient-to-br ${phaseColors.background} ${getThemeClass()}`}>
        {/* Header */}
        <header className="relative z-10 p-6">
          <div className="max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4 text-white hover:text-salem-400"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar ao Início</span>
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden py-12">
          {/* Background pattern */}
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{ y: backgroundY }}
          >
            <div className="absolute inset-0 bg-medieval-paper bg-cover bg-center" />
          </motion.div>

          {/* Floating elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-4xl opacity-20"
                style={{
                  top: `${10 + i * 15}%`,
                  left: `${5 + i * 15}%`,
                }}
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 10, 0],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {['🐺', '🔍', '⚕️', '🔫', '👑', '🤡'][i]}
              </motion.div>
            ))}
          </div>

          <motion.div
            className="relative z-10 text-center px-4 max-w-4xl mx-auto"
            style={{ y: textY }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: 'spring', bounce: 0.5 }}
              className="text-6xl mb-6"
            >
              📜
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-4xl md:text-6xl font-medieval text-glow mb-6"
            >
              Papéis do Jogo
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              Conheça todos os papéis disponíveis, suas habilidades especiais e estratégias para dominar o jogo de dedução social.
            </motion.p>
          </motion.div>
        </section>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 pb-12">
          {/* Game Rules Quick Summary */}
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12 p-6 bg-medieval-800/30 rounded-lg border border-medieval-600/50"
          >
            <h2 className="text-2xl font-medieval text-glow mb-4 flex items-center gap-3">
              <Sun className="w-6 h-6 text-yellow-400" />
              <Moon className="w-6 h-6 text-blue-400" />
              Como Funciona o Jogo
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-white/80">
              <div>
                <h3 className="font-bold text-yellow-400 mb-2 flex items-center gap-2">
                  <Sun className="w-5 h-5" /> Fase do Dia
                </h3>
                <p>Chat liberado para discussão geral. Todos os jogadores discutem e votam para executar alguém suspeito. O jogador mais votado é eliminado e tem sua role revelada.</p>
              </div>
              <div>
                <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                  <Moon className="w-5 h-5" /> Fase da Noite
                </h3>
                <p>Ações secretas são realizadas. Lobisomens escolhem suas vítimas, Sheriff investiga, Doctor protege. Ninguém pode conversar (exceto lobisomens entre si).</p>
              </div>
            </div>
          </motion.section>

          {/* Faction Filter */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-8"
          >
            <div className="flex flex-wrap gap-3 justify-center">
              {['all', 'Vila', 'Lobisomens', 'Neutros'].map((faction) => (
                <Button
                  key={faction}
                  variant={selectedFaction === faction ? 'primary' : 'ghost'}
                  onClick={() => {
                    playSound('button_click');
                    setSelectedFaction(faction);
                  }}
                  className="flex items-center gap-2"
                >
                  {faction === 'all' ? <Eye className="w-5 h-5" /> : getFactionIcon(faction)}
                  <span>{faction === 'all' ? 'Todos os Papéis' : faction}</span>
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Roles Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid gap-4 mb-12"
          >
            {filteredRoles.map((role, index) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
                className={`${role.bgColor} ${role.borderColor} border rounded-lg overflow-hidden hover:border-salem-500/50 transition-all cursor-pointer`}
                onClick={() => toggleRole(role.id)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{role.emoji}</div>
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          {role.icon}
                          {role.name}
                        </h3>
                        <div className={`text-sm ${getFactionColor(role.faction)} flex items-center gap-1`}>
                          {getFactionIcon(role.faction)}
                          {role.faction}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/60">
                      {expandedRole === role.id ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>

                  <p className="text-white/80 mt-4">{role.description}</p>

                  {/* Expanded Details */}
                  {expandedRole === role.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 space-y-4"
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-medieval-900/30 rounded-lg">
                          <h4 className="font-bold text-salem-300 mb-2 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Poder Especial
                          </h4>
                          <p className="text-white/80 text-sm">{role.power}</p>
                        </div>
                        <div className="p-4 bg-medieval-900/30 rounded-lg">
                          <h4 className="font-bold text-salem-300 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Condição de Vitória
                          </h4>
                          <p className="text-white/80 text-sm">{role.winCondition}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-medieval-900/30 rounded-lg">
                        <h4 className="font-bold text-salem-300 mb-2 flex items-center gap-2">
                          <Sword className="w-4 h-4" />
                          Estratégia Recomendada
                        </h4>
                        <p className="text-white/80 text-sm">{role.strategy}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Game Compositions */}
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="mb-12"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-medieval text-glow mb-4">
                📊 Composições de Jogo
              </h2>
              <p className="text-white/70 mb-6">
                Configurações balanceadas para diferentes números de jogadores
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  playSound('button_click');
                  setShowCompositions(!showCompositions);
                }}
                className="flex items-center gap-2 mx-auto"
              >
                {showCompositions ? <ChevronUp /> : <ChevronDown />}
                <span>{showCompositions ? 'Ocultar' : 'Ver'} Composições</span>
              </Button>
            </div>

            {showCompositions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid md:grid-cols-2 gap-4"
              >
                {gameCompositions.map((comp, index) => (
                  <motion.div
                    key={comp.players}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 bg-medieval-800/30 rounded-lg border border-medieval-600/50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">
                        {comp.players} Jogadores
                      </h3>
                      <span className="text-salem-400 font-medieval">{comp.name}</span>
                    </div>

                    <div className="flex justify-between mb-4 text-sm">
                      <div className="text-center">
                        <div className="text-green-400 font-bold">{comp.vila}</div>
                        <div className="text-white/60">Vila</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-400 font-bold">{comp.lobisomens}</div>
                        <div className="text-white/60">Lobisomens</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400 font-bold">{comp.neutros}</div>
                        <div className="text-white/60">Neutros</div>
                      </div>
                    </div>

                    <div className="text-xs text-white/70 bg-medieval-900/30 p-3 rounded">
                      {comp.details}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.section>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="text-center"
          >
            <Button
              variant="medieval"
              size="xl"
              onClick={handleBack}
              className="text-xl px-12 py-4"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>Voltar e Começar a Jogar</span>
            </Button>
          </motion.div>
        </main>
      </div>
    </>
  );
}