/**
 * AudioManager.js - Pengelola Audio Web Audio API Murni (Warm Synthesized SFX + Ambient BGM Player).
 * Menghasilkan efek suara taktil (kayu/chime/resin) yang lembut dan hangat tanpa frekuensi menusuk.
 * Menghormati kebijakan autoplay browser, visibilitychange, dan pengaturan volume real-time.
 */

import { getComboPitch, getClearPitchSequence } from './AudioPitchHelper.js';
import { StorageManager } from '../storage/StorageManager.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isUnlocked = false;

    // Node Master & Routing
    this.masterGain = null;
    this.sfxGain = null;
    this.sfxFilter = null;
    this.compressor = null;

    // State preferensi
    const settings = StorageManager.getSettings();
    this.sfxEnabled = settings.sfxEnabled ?? true;
    this.sfxVolume = (settings.sfxVolume ?? 80) / 100; // 0.0 s/d 1.0
    this.bgmEnabled = settings.bgmEnabled ?? false; // Default MATI
    this.bgmVolume = (settings.bgmVolume ?? 30) / 100; // Default 30%

    // Ambient BGM State (Audio file / fallback)
    this.bgmAudio = null;
    this.isBgmPlaying = false;
    this.isTabHidden = false;

    this._setupAutoUnlock();
    this._setupVisibilityListener();
  }

  get isBgmMuted() {
    return !this.bgmEnabled || this.bgmVolume === 0;
  }

  get isSfxMuted() {
    return !this.sfxEnabled || this.sfxVolume === 0;
  }

  /**
   * Menginisialisasi AudioContext saat interaksi pengguna pertama kali
   */
  _setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.initContext();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  unlockAudio() {
    this.initContext();
  }

  /**
   * Menangani event perpindahan tab (visibilitychange) agar audio berhenti total saat tab tidak aktif
   */
  _setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isTabHidden = true;
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
        if (this.bgmAudio && this.isBgmPlaying) {
          try {
            this.bgmAudio.pause();
          } catch (_) {}
        }
      } else {
        this.isTabHidden = false;
        if (this.ctx && this.ctx.state === 'suspended' && this.isUnlocked) {
          this.ctx.resume().catch(() => {});
        }
        if (this.bgmAudio && this.bgmEnabled && this.isBgmPlaying) {
          try {
            this.bgmAudio.play().catch(() => {});
          } catch (_) {}
        }
      }
    });
  }

  /**
   * Inisialisasi AudioContext, Master Limiter Compressor, dan Bus Gain
   */
  initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();

      // 1. Dynamics Compressor sebagai brickwall limiter anti-clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // 2. Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // 3. SFX Low-Pass Filter (2200 Hz) - Menghilangkan frekuensi tinggi yang menusuk
      this.sfxFilter = this.ctx.createBiquadFilter();
      this.sfxFilter.type = 'lowpass';
      this.sfxFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
      this.sfxFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxFilter.connect(this.masterGain);

      // 4. SFX Bus Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVolume : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.sfxFilter);

      this.isUnlocked = true;

      if (this.bgmEnabled) {
        this.startBGM();
      }
    } catch (e) {
      console.warn('AudioManager: Tidak dapat menginisialisasi AudioContext', e);
    }
  }

  // =========================================================================
  // Pengaturan Volume & Toggle Real-Time
  // =========================================================================

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0, this.ctx.currentTime, 0.05);
    }
  }

  setSfxVolume(percent) {
    this.sfxVolume = Math.max(0, Math.min(100, Number(percent))) / 100;
    if (this.sfxGain && this.ctx && this.sfxEnabled) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  toggleSfxMute() {
    this.setSfxEnabled(!this.sfxEnabled);
    StorageManager.saveSetting('sfx_enabled', this.sfxEnabled);
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = Boolean(enabled);
    if (this.bgmAudio) {
      if (this.bgmEnabled && !this.isBgmPlaying) {
        this.startBGM();
      } else if (!this.bgmEnabled && this.isBgmPlaying) {
        this.stopBGM();
      }
    } else if (this.bgmEnabled) {
      this.startBGM();
    }
  }

  setBgmVolume(percent) {
    this.bgmVolume = Math.max(0, Math.min(100, Number(percent))) / 100;
    if (this.bgmAudio) {
      this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmVolume * 0.3));
    }
  }

  toggleBgmMute() {
    this.setBgmEnabled(!this.bgmEnabled);
    StorageManager.saveSetting('bgm_enabled', this.bgmEnabled);
  }

  // =========================================================================
  // Sintesis SFX Prosedural (Warm, Tactile, Wooden/Glass)
  // =========================================================================

  /**
   * SFX: Pickup balok dari tray (nada lembut naik singkat)
   */
  playPickup() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.07);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  /**
   * SFX: Taruh balok ke papan (bunyi "tok" kayu/resin taktil lembut)
   */
  playPlace() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;

    // Resonator kayu hangat
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.07);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    // Click lembut taktil
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();

    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(600, t);
    clickOsc.frequency.exponentialRampToValueAtTime(280, t + 0.02);

    clickGain.gain.setValueAtTime(0.08, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
    clickOsc.start(t);
    clickOsc.stop(t + 0.02);

    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    clickOsc.onended = () => { clickOsc.disconnect(); clickGain.disconnect(); };
  }

  /**
   * SFX: Penempatan balok tidak valid / drop batal
   */
  playInvalid() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.09);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  /**
   * SFX: Penghapusan baris/kolom penuh (nada naik arpeggio bertingkat)
   */
  playClear(linesCleared = 1) {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const freqs = getClearPitchSequence(linesCleared);
    const stepDuration = 0.055;

    freqs.forEach((freq, i) => {
      const noteTime = t + (i * stepDuration);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.16, noteTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.18);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /**
   * SFX: Combo berturut-turut (chime kristal naik nada mengikuti level)
   */
  playCombo(comboLevel = 2) {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const baseFreq = getComboPitch(comboLevel);

    [baseFreq, baseFreq * 2].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const amp = idx === 0 ? 0.15 : 0.06;
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /**
   * SFX: Game Over (tangga nada turun melankolis lembut)
   */
  playGameOver() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const notes = [329.63, 293.66, 261.63, 220.00]; // E4, D4, C4, A3
    const step = 0.08;

    notes.forEach((freq, i) => {
      const noteTime = t + (i * step);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.14, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.2);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /**
   * SFX: Rekor Baru Terpecahkan (arpeggio ceria manis)
   */
  playRecordBroken() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const step = 0.07;

    notes.forEach((freq, i) => {
      const noteTime = t + (i * step);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.16, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.2);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /**
   * SFX: Klik UI / Tombol (klik mikro minimalis)
   */
  playUIClick() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.025);

    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.025);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playUiClick() {
    this.playUIClick();
  }

  /**
   * SFX: Detik waktu kritis (tik halus saat sisa waktu <= 10 detik)
   */
  playTimerTick() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.02);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // =========================================================================
  // Ambient BGM (Audio File Player / Fallback Hening)
  // =========================================================================

  /**
   * Memulai BGM dari file audio /assets/audio/bgm.mp3 jika tersedia
   */
  startBGM() {
    if (!this.bgmEnabled || this.isBgmPlaying || this.isTabHidden) return;

    try {
      if (!this.bgmAudio && typeof Audio !== 'undefined') {
        this.bgmAudio = new Audio('/assets/audio/bgm.mp3');
        this.bgmAudio.loop = true;
        this.bgmAudio.preload = 'auto';
        this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmVolume * 0.3));

        this.bgmAudio.addEventListener('error', () => {
          // File tidak ditemukan atau error decoding: fallback hening tanpa crash
          this.isBgmPlaying = false;
        });
      }

      if (this.bgmAudio) {
        this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmVolume * 0.3));
        const p = this.bgmAudio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this.isBgmPlaying = true;
          }).catch(() => {
            this.isBgmPlaying = false;
          });
        }
      }
    } catch (_) {
      this.isBgmPlaying = false;
    }
  }

  /**
   * Menghentikan musik ambient BGM sepenuhnya (0 CPU)
   */
  stopBGM() {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch (_) {}
    }
    this.isBgmPlaying = false;
  }

  /**
   * Menjeda musik ambient BGM sementara saat pause dialog terbuka
   */
  pauseBGM() {
    if (this.bgmAudio && this.isBgmPlaying) {
      try {
        this.bgmAudio.pause();
      } catch (_) {}
    }
  }

  /**
   * Melanjutkan musik ambient BGM setelah resume game
   */
  resumeBGM() {
    if (this.bgmAudio && this.bgmEnabled && !this.isTabHidden) {
      try {
        const p = this.bgmAudio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this.isBgmPlaying = true;
          }).catch(() => {});
        }
      } catch (_) {}
    }
  }

  /**
   * Memeriksa apakah SFX siap diputar
   */
  _canPlaySFX() {
    return Boolean(
      this.ctx &&
      this.isUnlocked &&
      this.sfxEnabled &&
      this.sfxVolume > 0 &&
      !this.isTabHidden &&
      this.ctx.state === 'running'
    );
  }
}

export const audioManager = new AudioManager();
