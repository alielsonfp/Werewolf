'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// =============================================================================
// SIMPLIFIED TYPES
// =============================================================================
export enum GamePhase {
  LOBBY = 'LOBBY',
  NIGHT = 'NIGHT',
  DAY = 'DAY',
  VOTING = 'VOTING',
  ENDED = 'ENDED',
}

interface AudioConfig {
  musicVolume: number;
  sfxVolume: number;
  enabled: boolean;
}

interface PhaseColors {
  background: string;
  text: string;
  accent: string;
  border: string;
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================
interface ThemeContextType {
  // Theme state
  isDark: boolean;
  currentPhase: GamePhase;

  // Audio state
  audioConfig: AudioConfig;

  // Actions
  toggleDarkMode: () => void;
  setGamePhase: (phase: GamePhase) => void;
  updateAudioConfig: (config: Partial<AudioConfig>) => void;
  playSound: (soundId: string, volume?: number) => void;
  playMusic: (musicId: string, loop?: boolean) => void;
  stopMusic: () => void;

  // Utils
  getPhaseColors: () => PhaseColors;
  getThemeClass: () => string;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================
interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Theme state
  const [isDark, setIsDark] = useState(true); // Default dark for medieval theme
  const [currentPhase, setCurrentPhase] = useState<GamePhase>(GamePhase.LOBBY);

  // Audio state
  const [audioConfig, setAudioConfig] = useState<AudioConfig>({
    musicVolume: 0.3,
    sfxVolume: 0.7,
    enabled: true,
  });

  // =============================================================================
  // THEME ACTIONS
  // =============================================================================
  const toggleDarkMode = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('werewolf-theme', newTheme ? 'dark' : 'light');

    // Update document class
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', newTheme);
    }
  };

  const setGamePhase = (phase: GamePhase) => {
    setCurrentPhase(phase);
    // Simplified - no audio for now
    console.log(`🎮 Game phase changed to: ${phase}`);
  };

  // =============================================================================
  // AUDIO ACTIONS (SIMPLIFIED)
  // =============================================================================
  const updateAudioConfig = (config: Partial<AudioConfig>) => {
    const newConfig = { ...audioConfig, ...config };
    setAudioConfig(newConfig);
    localStorage.setItem('werewolf-audio', JSON.stringify(newConfig));
  };

  const playSound = (soundId: string, volume?: number) => {
    if (!audioConfig.enabled) return;
    console.log(`🔊 Playing sound: ${soundId} at volume ${volume || audioConfig.sfxVolume}`);
    // Simplified - no actual audio for now
  };

  const playMusic = (musicId: string, loop = false) => {
    if (!audioConfig.enabled) return;
    console.log(`🎵 Playing music: ${musicId}, loop: ${loop}`);
    // Simplified - no actual audio for now
  };

  const stopMusic = () => {
    console.log('🛑 Music stopped');
    // Simplified - no actual audio for now
  };

  // =============================================================================
  // THEME UTILITIES
  // =============================================================================
  const getPhaseColors = (): PhaseColors => {
    switch (currentPhase) {
      case GamePhase.NIGHT:
        return {
          background: 'from-night-dark to-night-light',
          text: 'text-white',
          accent: 'text-blue-300',
          border: 'border-night-light',
        };
      case GamePhase.DAY:
        return {
          background: 'from-day-light to-day-dark',
          text: 'text-medieval-900',
          accent: 'text-yellow-600',
          border: 'border-day-dark',
        };
      case GamePhase.VOTING:
        return {
          background: 'from-voting-dark to-voting-light',
          text: 'text-white',
          accent: 'text-red-300',
          border: 'border-voting-light',
        };
      default:
        return {
          background: 'from-medieval-900 to-medieval-800',
          text: 'text-white',
          accent: 'text-salem-300',
          border: 'border-medieval-600',
        };
    }
  };

  const getThemeClass = (): string => {
    const phaseClass = `phase-${currentPhase.toLowerCase()}`;
    const themeClass = isDark ? 'dark' : 'light';
    return `${themeClass} ${phaseClass}`;
  };

  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('werewolf-theme');
    if (savedTheme) {
      const isDarkTheme = savedTheme === 'dark';
      setIsDark(isDarkTheme);
      document.documentElement.classList.toggle('dark', isDarkTheme);
    }

    // Load audio config from localStorage
    const savedAudio = localStorage.getItem('werewolf-audio');
    if (savedAudio) {
      try {
        const parsedAudio = JSON.parse(savedAudio);
        setAudioConfig(parsedAudio);
      } catch (error) {
        console.error('Error parsing saved audio config:', error);
      }
    }

    console.log('🎮 ThemeProvider initialized for Werewolf');
  }, []);

  // Update document class when theme or phase changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.className = getThemeClass();
    }
  }, [isDark, currentPhase]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  const contextValue: ThemeContextType = {
    // Theme state
    isDark,
    currentPhase,

    // Audio state
    audioConfig,

    // Actions
    toggleDarkMode,
    setGamePhase,
    updateAudioConfig,
    playSound,
    playMusic,
    stopMusic,

    // Utils
    getPhaseColors,
    getThemeClass,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// =============================================================================
// HIGHER-ORDER COMPONENT
// =============================================================================
export function withTheme<P extends object>(Component: React.ComponentType<P>) {
  return function ThemedComponent(props: P) {
    const { getThemeClass } = useTheme();

    return (
      <div className={getThemeClass()}>
        <Component {...props} />
      </div>
    );
  };
}