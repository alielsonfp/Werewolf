import React, { createContext, useContext, useState, useEffect } from 'react';
import audioService from '@/services/audioService';

// =============================================================================
// TYPES
// =============================================================================
interface PhaseColors {
  background: string;
  text: string;
  accent: string;
  border: string;
}

interface AudioConfig {
  musicVolume: number;
  sfxVolume: number;
  enabled: boolean;
}

interface ThemeContextType {
  theme: 'werewolf' | 'medieval' | 'modern';
  setTheme: (theme: 'werewolf' | 'medieval' | 'modern') => void;
  playSound: (soundId: string) => void;
  playMusic: (musicId: string) => void;
  stopMusic: () => void;
  setMusicVolume: (volume: number) => void;
  setSoundVolume: (volume: number) => void;
  musicVolume: number;
  soundVolume: number;
  isMusicPlaying: boolean;
  isAudioUnblocked: boolean;
  getPhaseColors: () => PhaseColors;
  getThemeClass: () => string;
  audioConfig: AudioConfig;
  updateAudioConfig: (config: Partial<AudioConfig>) => void;
}

// =============================================================================
// THEME CONTEXT
// =============================================================================
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// =============================================================================
// THEME PROVIDER
// =============================================================================
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'werewolf' | 'medieval' | 'modern'>('werewolf');
  const [audioConfig, setAudioConfig] = useState<AudioConfig>({
    musicVolume: 0.5,
    sfxVolume: 0.7,
    enabled: true,
  });

  // =============================================================================
  // AUDIO FUNCTIONS (delegando para o audioService)
  // =============================================================================
  const playSound = (soundId: string) => {
    if (audioConfig.enabled) {
      audioService.playSound(soundId);
    }
  };

  const playMusic = (musicId: string) => {
    if (audioConfig.enabled) {
      audioService.playMusic(musicId);
    }
  };

  const stopMusic = () => {
    audioService.stopMusic();
  };

  const setMusicVolume = (volume: number) => {
    const newConfig = { ...audioConfig, musicVolume: volume };
    setAudioConfig(newConfig);
    audioService.setMusicVolume(volume);
  };

  const setSoundVolume = (volume: number) => {
    const newConfig = { ...audioConfig, sfxVolume: volume };
    setAudioConfig(newConfig);
    audioService.setSoundVolume(volume);
  };

  const updateAudioConfig = (config: Partial<AudioConfig>) => {
    const newConfig = { ...audioConfig, ...config };
    setAudioConfig(newConfig);

    // Atualizar volumes no audioService
    if (config.musicVolume !== undefined) {
      audioService.setMusicVolume(config.musicVolume);
    }
    if (config.sfxVolume !== undefined) {
      audioService.setSoundVolume(config.sfxVolume);
    }

    // Se desabilitou o áudio, para a música
    if (config.enabled === false) {
      audioService.stopMusic();
    }
  };

  // =============================================================================
  // THEME UTILITIES (que o Layout.tsx precisa)
  // =============================================================================
  const getPhaseColors = (): PhaseColors => {
    // Por enquanto retorna cores padrão do tema medieval
    // Quando implementar fases do jogo, adicionar lógica aqui
    return {
      background: 'from-medieval-900 to-medieval-800',
      text: 'text-white',
      accent: 'text-salem-300',
      border: 'border-medieval-600',
    };
  };

  const getThemeClass = (): string => {
    return `theme-${theme}`;
  };

  // =============================================================================
  // THEME EFFECT
  // =============================================================================
  useEffect(() => {
    // Aplicar classes do tema
    document.documentElement.setAttribute('data-theme', theme);

    // Aplicar classes específicas
    if (theme === 'werewolf') {
      document.documentElement.classList.add('werewolf-theme');
      document.documentElement.classList.remove('medieval-theme', 'modern-theme');
    } else if (theme === 'medieval') {
      document.documentElement.classList.add('medieval-theme');
      document.documentElement.classList.remove('werewolf-theme', 'modern-theme');
    } else {
      document.documentElement.classList.add('modern-theme');
      document.documentElement.classList.remove('werewolf-theme', 'medieval-theme');
    }
  }, [theme]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  const value: ThemeContextType = {
    theme,
    setTheme,
    playSound,
    playMusic,
    stopMusic,
    setMusicVolume,
    setSoundVolume,
    musicVolume: audioConfig.musicVolume,
    soundVolume: audioConfig.sfxVolume,
    isMusicPlaying: audioService.isMusicPlaying,
    isAudioUnblocked: audioService.isAudioUnblocked,
    getPhaseColors,
    getThemeClass,
    audioConfig,
    updateAudioConfig,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// USE THEME HOOK
// =============================================================================
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}