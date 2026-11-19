/**
 * AudioManager.js - Pengelola Audio Web Audio API Murni (Synthesized SFX + Generative Ambient BGM).
 * Menghasilkan efek suara taktil (kayu/kaca/chime) tanpa file audio eksternal dan tanpa library.
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
    this.bgmGain = null;
    this.compressor = null;

    // State preferensi
    const settings = StorageManager.getSettings();
    this.sfxEnabled = settings.sfxEnabled;
    this.sfxVolume = settings.sfxVolume / 100; // 0.0 s/d 1.0
    this.bgmEnabled = settings.bgmEnabled;
    this.bgmVolume = settings.bgmVolume / 100;

    // Ambient BGM State
    this.bgmOscillators = [];
    this.isBgmPlaying = false;
    this.isTabHidden = false;

    this._setupAutoUnlock();
    this._setupVisibilityListener();
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

  /**
   * Menangani event perpindahan tab (visibilitychange) agar suara berhenti saat tab diminimalkan
   */
  _setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isTabHidden = true;
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        this.isTabHidden = false;
        if (this.ctx && this.ctx.state === 'suspended' && this.isUnlocked) {
          this.ctx.resume().catch(() => {});
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
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // 3. SFX Bus Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVolume : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // 4. BGM Bus Gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume * 0.35 : 0, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.isUnlocked = true;

      // Mulai ambient BGM jika aktif
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

  setBgmEnabled(enabled) {
    this.bgmEnabled = Boolean(enabled);
    if (this.bgmGain && this.ctx) {
      const target = this.bgmEnabled ? this.bgmVolume * 0.35 : 0;
      this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      if (this.bgmEnabled && !this.isBgmPlaying) {
        this.startBGM();
      }
    }
  }

  setBgmVolume(percent) {
    this.bgmVolume = Math.max(0, Math.min(100, Number(percent))) / 100;
    if (this.bgmGain && this.ctx && this.bgmEnabled) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVolume * 0.35, this.ctx.currentTime, 0.05);
    }
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
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.07);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.015);
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

    // Body resonator kayu (frekuensi rendah decay cepat)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.08);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    // Click attack taktil (kaca/resin tipis)
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();

    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(750, t);
    clickOsc.frequency.exponentialRampToValueAtTime(320, t + 0.02);

    clickGain.gain.setValueAtTime(0.12, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
    clickOsc.start(t);
    clickOsc.stop(t + 0.02);

    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    clickOsc.onended = () => { clickOsc.disconnect(); clickGain.disconnect(); };
  }

  /**
   * SFX: Penempatan balok tidak valid / drop batal (nada rendah tumpul)
   */
  playInvalid() {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(105, t + 0.1);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  /**
   * SFX: Penghapusan baris/kolom penuh (nada naik arpeggio bertingkat)
   * @param {number} linesCleared Jumlah baris yang terhapus
   */
  playClear(linesCleared = 1) {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const freqs = getClearPitchSequence(linesCleared);
    const stepDuration = 0.06;

    freqs.forEach((freq, i) => {
      const noteTime = t + (i * stepDuration);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.22, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /**
   * SFX: Combo berturut-turut (chime kristal naik nada mengikuti level)
   * @param {number} comboLevel 
   */
  playCombo(comboLevel = 2) {
    if (!this._canPlaySFX()) return;

    const t = this.ctx.currentTime;
    const baseFreq = getComboPitch(comboLevel);

    // Nada fundamental + overtone oktaf untuk timbre chime
    [baseFreq, baseFreq * 2].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const amp = idx === 0 ? 0.2 : 0.08;
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.28);
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
    const step = 0.09;

    notes.forEach((freq, i) => {
      const noteTime = t + (i * step);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.24);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.24);
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
    const step = 0.08;

    notes.forEach((freq, i) => {
      const noteTime = t + (i * step);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
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
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.03);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.03);
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

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.025);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.025);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // =========================================================================
  // Ambient Generatif BGM (Pad Pentatonik Hangat, Hemat CPU)
  // =========================================================================

  /**
   * Memulai loop musik ambient generatif
   */
  startBGM() {
    if (!this.ctx || !this.isUnlocked || this.isBgmPlaying || !this.bgmEnabled) return;

    try {
      this.stopBGM();

      // Buat filter lowpass untuk suara pad yang lembut hangat
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, this.ctx.currentTime);

      // LFO sangat lambat (0.08Hz) untuk dinamika hembusan halus
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(90, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Dua nada pentatonik lembut (C3 130.81Hz & G3 196.00Hz) dengan detune
      const freqs = [130.81, 196.00];
      const oscs = [];

      freqs.forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.detune.setValueAtTime(Math.random() * 8 - 4, this.ctx.currentTime);
        osc.connect(filter);
        osc.start();
        oscs.push(osc);
      });

      lfo.start();
      filter.connect(this.bgmGain);

      this.bgmOscillators = [...oscs, lfo];
      this.isBgmPlaying = true;
    } catch (e) {
      console.warn('AudioManager: Gagal memulai BGM', e);
    }
  }

  /**
   * Menghentikan musik ambient BGM
   */
  stopBGM() {
    if (!this.isBgmPlaying) return;

    this.bgmOscillators.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (_) {}
    });

    this.bgmOscillators = [];
    this.isBgmPlaying = false;
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

// Singleton instance
export const audioManager = new AudioManager();
