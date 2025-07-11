// 🐺 WEREWOLF - Landing Page
// Home page with werewolf game inspired design

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Play,
  Users,
  Trophy,
  Shield,
  Zap,
  Moon,
  Sun,
  ChevronDown,
  Github
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/common/Button';
import Layout from '@/components/common/Layout';

// ❌ REMOVER: Todo esse componente SafeStatsDisplay
// ❌ REMOVER: interface SafeStatsDisplayProps {
// ❌ REMOVER:   value: number;
// ❌ REMOVER:   label: string;
// ❌ REMOVER:   color?: string;
// ❌ REMOVER: }

// ❌ REMOVER: function SafeStatsDisplay({ value, label, color = "text-salem-400" }: SafeStatsDisplayProps) {
// ❌ REMOVER:   const [mounted, setMounted] = useState(false);
// ❌ REMOVER: 
// ❌ REMOVER:   useEffect(() => {
// ❌ REMOVER:     setMounted(true);
// ❌ REMOVER:   }, []);
// ❌ REMOVER: 
// ❌ REMOVER:   return (
// ❌ REMOVER:     <div className="text-center">
// ❌ REMOVER:       <div className={`text-2xl font-bold ${color}`}>
// ❌ REMOVER:         {mounted ? value.toLocaleString('pt-BR') : value}
// ❌ REMOVER:       </div>
// ❌ REMOVER:       <div className="text-sm text-white/60">{label}</div>
// ❌ REMOVER:     </div>
// ❌ REMOVER:   );
// ❌ REMOVER: }

// =============================================================================
// LANDING PAGE COMPONENT
// =============================================================================
export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { playSound } = useTheme();
  const { scrollY } = useScroll();

  // Parallax effects
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const textY = useTransform(scrollY, [0, 500], [0, 100]);

  // ❌ REMOVER: Todo esse estado stats
  // ❌ REMOVER: const [stats] = useState({
  // ❌ REMOVER:   totalPlayers: 15847,
  // ❌ REMOVER:   gamesPlayed: 89234,
  // ❌ REMOVER:   onlineNow: 342,
  // ❌ REMOVER: });

  // Handle main action
  const handleMainAction = () => {
    playSound('button_click');

    if (isAuthenticated) {
      router.push('/lobby');
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <>
      <Head>
        <title>Werewolf O Jogo de Dedução Social</title>
        <meta name="description" content="Entre na vila e descubra quem são os lobisomens neste emocionante jogo de dedução social." />
      </Head>

      <Layout variant="landing" showHeader={false} showSidebar={false} showFooter={false}>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-medieval-900 via-medieval-800 to-night-dark"
            style={{ y: backgroundY }}
          />

          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-medieval-paper bg-cover bg-center" />
          </div>

          {/* Floating wolves */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-6xl opacity-20"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${10 + i * 20}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  x: [0, 10, 0],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                🐺
              </motion.div>
            ))}
          </div>

          {/* Hero content */}
          <motion.div
            className="relative z-10 text-center px-4 max-w-4xl"
            style={{ y: textY }}
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: 'spring', bounce: 0.5 }}
              className="text-8xl md:text-9xl mb-8"
            >
              🐺
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-5xl md:text-7xl font-medieval text-glow mb-6"
            >
              Werewolf
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              O clássico jogo de dedução social que vai testar sua capacidade de
              blefe, investigação e sobrevivência.
            </motion.p>

            {/* ❌ REMOVER: Todo esse bloco de estatísticas */}
            {/* ❌ REMOVER: <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="flex justify-center gap-8 mb-12"
            >
              <SafeStatsDisplay
                value={stats.totalPlayers}
                label="Jogadores"
              />
              <SafeStatsDisplay
                value={stats.gamesPlayed}
                label="Partidas"
              />
              <SafeStatsDisplay
                value={stats.onlineNow}
                label="Online Agora"
                color="text-green-400"
              />
            </motion.div> */}

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                variant="medieval"
                size="xl"
                onClick={handleMainAction}
                className="text-xl px-12 py-4"
              >
                <Play className="w-6 h-6" />
                <span>{isAuthenticated ? 'Entrar no Lobby' : 'Começar a Jogar'}</span>
              </Button>

              {!isAuthenticated && (
                <Button
                  variant="ghost"
                  size="xl"
                  onClick={() => router.push('/auth/register')}
                  className="text-xl px-8 py-4"
                >
                  Criar Conta
                </Button>
              )}
            </motion.div>

            {/* User welcome - ✅ MODIFICAR: Remover detalhes, centralizar */}
            {isAuthenticated && user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.7 }}
                className="mt-8 p-4 bg-salem-800/30 rounded-lg border border-salem-600/50 text-center"
              >
                <p className="text-salem-300">
                  Bem-vindo de volta, <span className="font-bold">{user.username}</span>!
                  {/* ❌ REMOVER: Você está no nível {user.level} com {user.totalGames} partidas jogadas. */}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white/60 cursor-pointer"
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-medieval-800/50">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl font-medieval text-center text-glow mb-16"
            >
              Como Jogar
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Day Phase */}
              <FeatureCard
                icon={<Sun className="w-12 h-12" />}
                title="Fase do Dia"
                description="Durante o dia, todos os jogadores discutem e votam para eliminar alguém suspeito de ser um lobisomem."
                delay={0.2}
              />

              {/* Night Phase */}
              <FeatureCard
                icon={<Moon className="w-12 h-12" />}
                title="Fase da Noite"
                description="À noite, lobisomens escolhem suas vítimas enquanto outros papéis especiais agem em segredo."
                delay={0.4}
              />

              {/* Victory */}
              <FeatureCard
                icon={<Trophy className="w-12 h-12" />}
                title="Condições de Vitória"
                description="A vila vence eliminando todos os lobisomens. Os lobisomens vencem igualando o número de aldeões."
                delay={0.6}
              />
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl font-medieval text-center text-glow mb-16"
            >
              Papéis do Jogo
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <RoleCard
                emoji="👤"
                name="Aldeão"
                faction="Vila"
                description="Vota durante o dia para eliminar suspeitos"
                color="text-green-400"
              />

              <RoleCard
                emoji="🔍"
                name="Investigador"
                faction="Vila"
                description="Investiga uma pessoa por noite"
                color="text-blue-400"
              />

              <RoleCard
                emoji="⚕️"
                name="Médico"
                faction="Vila"
                description="Protege alguém da morte durante a noite"
                color="text-green-400"
              />

              <RoleCard
                emoji="🐺"
                name="Lobisomem"
                faction="Lobisomens"
                description="Mata aldeões durante a noite"
                color="text-red-400"
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-12"
            >
              <Button
                variant="ghost"
                onClick={() => router.push('/roles')}
              >
                Ver Todos os Papéis
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 bg-medieval-900 border-t border-medieval-600">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="text-3xl">🐺</div>
                <div>
                  <h3 className="font-medieval text-xl">Werewolf</h3>
                  <p className="text-white/60 text-sm">O Jogo de Dedução Social</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    playSound('button_click');
                    window.open('https://github.com/alielsonfp/Werewolf', '_blank');
                  }}
                  className="hover:text-salem-400 transition-colors"
                >
                  <Github className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-medieval-600 text-center text-white/60 text-sm">
              © 2025 Werewolf. Todos os direitos reservados.
            </div>
          </div>
        </footer>
      </Layout>
    </>
  );
}

// =============================================================================
// FEATURE CARD COMPONENT
// =============================================================================
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      className="text-center p-6 bg-medieval-700/30 rounded-lg border border-medieval-600/50 hover:border-salem-500/50 transition-colors"
    >
      <div className="text-salem-400 mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-white/70 leading-relaxed">{description}</p>
    </motion.div>
  );
}

// =============================================================================
// ROLE CARD COMPONENT
// =============================================================================
interface RoleCardProps {
  emoji: string;
  name: string;
  faction: string;
  description: string;
  color: string;
}

function RoleCard({ emoji, name, faction, description, color }: RoleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      className="p-4 bg-medieval-800/50 rounded-lg border border-medieval-600/50 hover:border-salem-500/50 transition-all cursor-pointer"
    >
      <div className="text-3xl mb-2">{emoji}</div>
      <h4 className="font-bold mb-1">{name}</h4>
      <div className={`text-sm mb-2 ${color}`}>{faction}</div>
      <p className="text-white/70 text-sm">{description}</p>
    </motion.div>
  );
}