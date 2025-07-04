'use client';

import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  User,
  Trophy,
  Settings,
  LogOut,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSocket } from '@/context/SocketContext';
import Button from './Button';
import { useRouter } from 'next/navigation';

// =============================================================================
// LAYOUT PROPS
// =============================================================================
interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showSidebar?: boolean;
  showFooter?: boolean;
  className?: string;
  variant?: 'default' | 'game' | 'auth' | 'landing';
}

// =============================================================================
// MAIN LAYOUT COMPONENT
// =============================================================================
export default function Layout({
  children,
  showHeader = true,
  showSidebar = true,
  showFooter = true,
  className = '',
  variant = 'default',
}: LayoutProps) {
  const { getThemeClass, getPhaseColors } = useTheme();
  const phaseColors = getPhaseColors();

  // Variant-specific layouts
  if (variant === 'auth') {
    return <AuthLayout>{children}</AuthLayout>;
  }

  if (variant === 'landing') {
    return <LandingLayout>{children}</LandingLayout>;
  }

  if (variant === 'game') {
    return <GameLayout>{children}</GameLayout>;
  }

  // Default layout
  return (
    <div className={clsx(
      'min-h-screen',
      `bg-gradient-to-br ${phaseColors.background}`,
      getThemeClass(),
      className
    )}>
      {showHeader && <Header />}

      <div className="flex">
        {showSidebar && <Sidebar />}

        <main className={clsx(
          'flex-1 transition-all duration-300',
          showSidebar ? 'ml-64' : 'ml-0',
          showHeader ? 'pt-16' : 'pt-0',
          'p-6'
        )}>
          {children}
        </main>
      </div>

      {showFooter && <Footer />}
    </div>
  );
}

// =============================================================================
// HEADER COMPONENT
// =============================================================================
function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleDarkMode, audioConfig, updateAudioConfig } = useTheme();
  const { status } = useSocket();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleAudio = () => {
    updateAudioConfig({ enabled: !audioConfig.enabled });
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-40 bg-medieval-900/95 backdrop-blur-sm border-b border-medieval-600"
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🐺</div>
          <h1 className="text-xl font-medieval text-glow">
            Werewolf
          </h1>

          {/* Connection status */}
          <div className={clsx(
            'w-2 h-2 rounded-full',
            status === 'connected' ? 'bg-green-400' : 'bg-red-400'
          )} />
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Audio toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAudio}
            aria-label={audioConfig.enabled ? 'Desativar som' : 'Ativar som'}
          >
            {audioConfig.enabled ?
              <Volume2 className="w-5 h-5" /> :
              <VolumeX className="w-5 h-5" />
            }
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            aria-label={isDark ? 'Tema claro' : 'Tema escuro'}
          >
            {isDark ?
              <Sun className="w-5 h-5" /> :
              <Moon className="w-5 h-5" />
            }
          </Button>

          {/* User menu */}
          {user && (
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 bg-salem-600 rounded-full flex items-center justify-center">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    <span className="text-sm font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-medium">{user.username}</span>
              </Button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 w-48 bg-medieval-800 rounded-lg shadow-medieval border border-medieval-600"
                >
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-medieval-600">
                      <p className="text-sm text-white/70">Nível {user.level}</p>
                      <p className="text-xs text-white/50">{user.totalGames} jogos</p>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full justify-start px-4 py-2 text-left"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Perfil
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start px-4 py-2 text-left"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </Button>

                    <div className="border-t border-medieval-600 mt-2 pt-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-4 py-2 text-left text-red-400 hover:text-red-300"
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================
function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Lobby', href: '/lobby' },
    { icon: User, label: 'Perfil', href: '/profile' },
    { icon: Trophy, label: 'Ranking', href: '/leaderboard' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ];

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className={clsx(
        'fixed left-0 top-16 bottom-0 z-30',
        'bg-medieval-900/95 backdrop-blur-sm border-r border-medieval-600',
        'transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle button */}
      <div className="p-4 border-b border-medieval-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-center"
        >
          {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            className={clsx(
              'w-full justify-start',
              isCollapsed ? 'px-2' : 'px-4'
            )}
            onClick={() => router.push(item.href)}
          >
            <item.icon className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">{item.label}</span>}
          </Button>
        ))}
      </nav>
    </motion.aside>
  );
}

// =============================================================================
// FOOTER COMPONENT
// =============================================================================
function Footer() {
  return (
    <footer className="bg-medieval-900/80 border-t border-medieval-600 py-4 px-6 mt-auto relative z-10">
      <div className="flex items-center justify-between text-sm text-white/70">
        <p>© 2025 Werewolf. Todos os direitos reservados.</p>
        <p>Versão 1.0.0</p>
      </div>
    </footer>
  );
}

// =============================================================================
// AUTH LAYOUT
// =============================================================================
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-night-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">🐺</div>
          <h1 className="text-3xl font-medieval text-glow">
            Werewolf
          </h1>
          <p className="text-white/70 mt-2">
            Entre na vila... se tiver coragem
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

// =============================================================================
// LANDING LAYOUT
// =============================================================================
function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-night-dark">
      {children}
    </div>
  );
}

// =============================================================================
// GAME LAYOUT
// =============================================================================
function GameLayout({ children }: { children: ReactNode }) {
  const { currentPhase, getPhaseColors } = useTheme();
  const phaseColors = getPhaseColors();

  return (
    <div className={clsx(
      'min-h-screen transition-all duration-1000',
      `bg-gradient-to-br ${phaseColors.background}`
    )}>
      {/* Game header */}
      <div className="bg-black/20 border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">🐺</div>
            <div>
              <h1 className="font-medieval text-xl text-glow">
                Werewolf
              </h1>
              <p className={clsx('text-sm', phaseColors.text)}>
                Fase: {currentPhase}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Game content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}