// src/services/audioService.ts
import { Howl, Howler } from 'howler';

// =============================================================================
// TYPES
// =============================================================================
interface AudioServiceConfig {
  sounds: Record<string, string>;
  music: Record<string, string>;
}

// =============================================================================
// AUDIO SERVICE CLASS
// =============================================================================
class AudioService {
  private sounds: Map<string, Howl> = new Map();
  private music: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null;
  private isUnlocked: boolean = false;
  private pendingMusic: string | null = null;
  private musicVolume: number = 0.5;
  private soundVolume: number = 0.7;
  private isInitialized: boolean = false;

  // =============================================================================
  // INITIALIZE
  // =============================================================================
  initialize(config: AudioServiceConfig) {
    // Verificar se está no cliente (browser)
    if (typeof window === 'undefined') {
      console.log('🎮 AudioService: Ignorando inicialização no servidor (SSR)');
      return;
    }

    if (this.isInitialized) {
      console.log('🎮 AudioService: Já inicializado, ignorando...');
      return;
    }

    console.log('🎮 Inicializando AudioService...');

    // Carregar sons
    Object.entries(config.sounds).forEach(([id, path]) => {
      try {
        const sound = new Howl({
          src: [path],
          volume: this.soundVolume,
          preload: true,
          onload: () => console.log(`✅ Som carregado: ${id}`),
          onloaderror: (id, error) => console.error(`❌ Erro ao carregar som: ${id}`, error),
        });
        this.sounds.set(id, sound);
      } catch (error) {
        console.error(`❌ Erro ao criar som ${id}:`, error);
      }
    });

    // Carregar músicas
    Object.entries(config.music).forEach(([id, path]) => {
      try {
        const music = new Howl({
          src: [path],
          volume: this.musicVolume,
          loop: true,
          html5: true, // Importante para arquivos grandes
          preload: true,
          onload: () => console.log(`✅ Música carregada: ${id}`),
          onloaderror: (id, error) => console.error(`❌ Erro ao carregar música: ${id}`, error),
        });
        this.music.set(id, music);
      } catch (error) {
        console.error(`❌ Erro ao criar música ${id}:`, error);
      }
    });

    // Tentar desbloquear áudio em qualquer clique
    this.setupUnlockListeners();
    this.isInitialized = true;
  }

  // =============================================================================
  // SETUP UNLOCK LISTENERS
  // =============================================================================
  private setupUnlockListeners() {
    // Verificar se está no cliente
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const unlock = async () => {
      if (this.isUnlocked) return;

      console.log('🔓 Desbloqueando áudio...');

      try {
        // Resume Howler context
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          await Howler.ctx.resume();
          console.log('✅ AudioContext desbloqueado!');
        }

        this.isUnlocked = true;

        // Se tem música pendente, toca agora
        if (this.pendingMusic) {
          console.log('🎵 Tocando música pendente:', this.pendingMusic);
          this.playMusic(this.pendingMusic);
          this.pendingMusic = null;
        }

        // Remove listeners após desbloquear
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      } catch (error) {
        console.error('❌ Erro ao desbloquear áudio:', error);
      }
    };

    // Adiciona listeners para desbloquear no primeiro clique/toque/tecla
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  // =============================================================================
  // PLAY SOUND
  // =============================================================================
  playSound(soundId: string) {
    if (!this.isInitialized) {
      console.warn('🎮 AudioService não inicializado');
      return;
    }

    const sound = this.sounds.get(soundId);
    if (!sound) {
      console.warn(`⚠️ Som não encontrado: ${soundId}`);
      return;
    }

    if (!this.isUnlocked) {
      console.log('🔒 Áudio ainda bloqueado, som será tocado após desbloquear');
      return;
    }

    try {
      console.log(`🔊 Tocando som: ${soundId}`);
      sound.volume(this.soundVolume);
      sound.play();
    } catch (error) {
      console.error(`❌ Erro ao tocar som ${soundId}:`, error);
    }
  }

  // =============================================================================
  // PLAY MUSIC
  // =============================================================================
  playMusic(musicId: string) {
    if (!this.isInitialized) {
      console.warn('🎮 AudioService não inicializado');
      return;
    }

    console.log(`🎵 Tentando tocar música: ${musicId}`);

    if (!this.isUnlocked) {
      console.log('🔒 Áudio bloqueado, música será tocada após desbloquear');
      this.pendingMusic = musicId;
      return;
    }

    // Para música atual
    if (this.currentMusic) {
      console.log('⏹️ Parando música anterior');
      try {
        this.currentMusic.stop();
      } catch (error) {
        console.error('❌ Erro ao parar música anterior:', error);
      }
    }

    const music = this.music.get(musicId);
    if (!music) {
      console.error(`❌ Música não encontrada: ${musicId}`);
      return;
    }

    try {
      console.log(`▶️ Iniciando música: ${musicId}`);
      music.volume(this.musicVolume);
      music.play();
      this.currentMusic = music;
    } catch (error) {
      console.error(`❌ Erro ao tocar música ${musicId}:`, error);
    }
  }

  // =============================================================================
  // STOP MUSIC
  // =============================================================================
  stopMusic() {
    if (this.currentMusic) {
      console.log('⏹️ Parando música');
      try {
        this.currentMusic.stop();
        this.currentMusic = null;
      } catch (error) {
        console.error('❌ Erro ao parar música:', error);
      }
    }
  }

  // =============================================================================
  // PAUSE/RESUME MUSIC
  // =============================================================================
  pauseMusic() {
    if (this.currentMusic && this.currentMusic.playing()) {
      console.log('⏸️ Pausando música');
      try {
        this.currentMusic.pause();
      } catch (error) {
        console.error('❌ Erro ao pausar música:', error);
      }
    }
  }

  resumeMusic() {
    if (this.currentMusic && !this.currentMusic.playing()) {
      console.log('▶️ Resumindo música');
      try {
        this.currentMusic.play();
      } catch (error) {
        console.error('❌ Erro ao resumir música:', error);
      }
    }
  }

  // =============================================================================
  // VOLUME CONTROLS
  // =============================================================================
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      try {
        this.currentMusic.volume(this.musicVolume);
      } catch (error) {
        console.error('❌ Erro ao ajustar volume da música:', error);
      }
    }
  }

  setSoundVolume(volume: number) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    // Atualiza volume de todos os sons
    this.sounds.forEach(sound => {
      try {
        sound.volume(this.soundVolume);
      } catch (error) {
        console.error('❌ Erro ao ajustar volume do som:', error);
      }
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Para todos os sons e músicas
   */
  stopAll() {
    console.log('🛑 Parando todos os áudios');

    // Para música atual
    this.stopMusic();

    // Para todos os sons
    this.sounds.forEach((sound, id) => {
      try {
        if (sound.playing()) {
          sound.stop();
        }
      } catch (error) {
        console.error(`❌ Erro ao parar som ${id}:`, error);
      }
    });
  }

  /**
   * Limpa recursos (para usar em cleanup)
   */
  cleanup() {
    console.log('🧹 Limpando AudioService...');

    this.stopAll();

    // Limpa mapas
    this.sounds.clear();
    this.music.clear();

    this.currentMusic = null;
    this.pendingMusic = null;
    this.isInitialized = false;
    this.isUnlocked = false;
  }

  // =============================================================================
  // GETTERS
  // =============================================================================
  get isMusicPlaying(): boolean {
    try {
      return this.currentMusic?.playing() || false;
    } catch {
      return false;
    }
  }

  get isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  get currentMusicVolume(): number {
    return this.musicVolume;
  }

  get currentSoundVolume(): number {
    return this.soundVolume;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  get availableSounds(): string[] {
    return Array.from(this.sounds.keys());
  }

  get availableMusic(): string[] {
    return Array.from(this.music.keys());
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================
const audioService = new AudioService();

// Inicializar apenas no cliente
if (typeof window !== 'undefined') {
  // Aguarda o DOM estar pronto antes de inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeAudioService();
    });
  } else {
    initializeAudioService();
  }
}

function initializeAudioService() {
  try {
    // Configuração com apenas os arquivos que realmente existem
    audioService.initialize({
      sounds: {
        button_click: '/sounds/click3.wav',
        button_secondary: '/sounds/click1.wav',
        button_hover: '/sounds/click2.wav',
      },
      music: {
        medieval_tavern01: '/music/medieval_tavern01.mp3',
        medieval_tavern02: '/music/medieval_tavern02.mp3',
        medieval_tavern03: '/music/medieval_tavern03.mp3',
      }
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar AudioService:', error);
  }
}

export default audioService;