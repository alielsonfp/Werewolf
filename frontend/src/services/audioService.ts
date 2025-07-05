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

  // =============================================================================
  // INITIALIZE
  // =============================================================================
  initialize(config: AudioServiceConfig) {
    // Verificar se está no cliente (browser)
    if (typeof window === 'undefined') {
      console.log('🎮 AudioService: Ignorando inicialização no servidor (SSR)');
      return;
    }

    console.log('🎮 Inicializando AudioService...');

    // Carregar sons
    Object.entries(config.sounds).forEach(([id, path]) => {
      const sound = new Howl({
        src: [path],
        volume: this.soundVolume,
        preload: true,
        onload: () => console.log(`✅ Som carregado: ${id}`),
        onloaderror: () => console.error(`❌ Erro ao carregar som: ${id}`),
      });
      this.sounds.set(id, sound);
    });

    // Carregar músicas
    Object.entries(config.music).forEach(([id, path]) => {
      const music = new Howl({
        src: [path],
        volume: this.musicVolume,
        loop: true,
        html5: true, // Importante para arquivos grandes
        preload: true,
        onload: () => console.log(`✅ Música carregada: ${id}`),
        onloaderror: () => console.error(`❌ Erro ao carregar música: ${id}`),
      });
      this.music.set(id, music);
    });

    // Tentar desbloquear áudio em qualquer clique
    this.setupUnlockListeners();
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
      } catch (error) {
        console.error('❌ Erro ao desbloquear áudio:', error);
      }
    };

    // Adiciona listeners para desbloquear no primeiro clique/toque
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  // =============================================================================
  // PLAY SOUND
  // =============================================================================
  playSound(soundId: string) {
    const sound = this.sounds.get(soundId);
    if (!sound) {
      console.warn(`⚠️ Som não encontrado: ${soundId}`);
      return;
    }

    if (!this.isUnlocked) {
      console.log('🔒 Áudio ainda bloqueado, som será tocado após desbloquear');
      return;
    }

    console.log(`🔊 Tocando som: ${soundId}`);
    sound.volume(this.soundVolume);
    sound.play();
  }

  // =============================================================================
  // PLAY MUSIC
  // =============================================================================
  playMusic(musicId: string) {
    console.log(`🎵 Tentando tocar música: ${musicId}`);

    if (!this.isUnlocked) {
      console.log('🔒 Áudio bloqueado, música será tocada após desbloquear');
      this.pendingMusic = musicId;
      return;
    }

    // Para música atual
    if (this.currentMusic) {
      console.log('⏹️ Parando música anterior');
      this.currentMusic.stop();
    }

    const music = this.music.get(musicId);
    if (!music) {
      console.error(`❌ Música não encontrada: ${musicId}`);
      return;
    }

    console.log(`▶️ Iniciando música: ${musicId}`);
    music.volume(this.musicVolume);
    music.play();
    this.currentMusic = music;
  }

  // =============================================================================
  // STOP MUSIC
  // =============================================================================
  stopMusic() {
    if (this.currentMusic) {
      console.log('⏹️ Parando música');
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  // =============================================================================
  // VOLUME CONTROLS
  // =============================================================================
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume(this.musicVolume);
    }
  }

  setSoundVolume(volume: number) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
  }

  // =============================================================================
  // GETTERS
  // =============================================================================
  get isMusicPlaying(): boolean {
    return this.currentMusic?.playing() || false;
  }

  get isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================
const audioService = new AudioService();

// Inicializar apenas no cliente
if (typeof window !== 'undefined') {
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
}

export default audioService;