/**
 * TimerSystem.js - Sistem pengelola waktu mundur untuk Time Challenge (JS Murni).
 * Menghitung waktu mundur berdasarkan deltaMs, mendukung pause/resume,
 * serta pencegahan bug background tab (visibilitychange).
 */

export class TimerSystem {
  /**
   * @param {number} [durationSeconds=120] Durasi hitung mundur dalam detik
   * @param {Object} [options]
   * @param {Function} [options.onTick] Callback setiap kali waktu berkurang (sisaDetik, formatted)
   * @param {Function} [options.onFinish] Callback saat waktu habis
   */
  constructor(durationSeconds = 120, options = {}) {
    this.totalDurationMs = Math.max(0, durationSeconds * 1000);
    this.remainingMs = this.totalDurationMs;
    this.isRunning = false;
    this.isStarted = false;
    this.onTick = options.onTick || null;
    this.onFinish = options.onFinish || null;
    this._visibilityHandler = null;

    this._setupVisibilityListener();
  }

  /**
   * Menangani event perpindahan tab agar timer tidak glitch / desync.
   * Saat tab disembunyikan, timer otomatis dijeda.
   */
  _setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      this._visibilityHandler = () => {
        if (document.hidden) {
          if (this.isRunning) {
            this.pause();
            this._wasPausedByVisibility = true;
          }
        } else {
          if (this._wasPausedByVisibility) {
            this._wasPausedByVisibility = false;
            this.resume();
          }
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }
  }

  /**
   * Memulai hitungan mundur
   */
  start() {
    this.isStarted = true;
    this.isRunning = true;
    if (this.onTick) {
      this.onTick(this.getRemainingSeconds(), this.getFormattedTime());
    }
  }

  /**
   * Menghentikan sementara timer
   */
  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
  }

  /**
   * Melanjutkan kembali timer
   */
  resume() {
    if (!this.isStarted || this.isFinished()) return;
    this.isRunning = true;
  }

  /**
   * Memperbarui sisa waktu berdasarkan delta waktu (milidetik).
   * Biasanya dipanggil di `scene.update(time, delta)` Phaser.
   * @param {number} deltaMs
   * @returns {boolean} True jika waktu baru saja habis pada tick ini
   */
  tick(deltaMs) {
    if (!this.isRunning || this.remainingMs <= 0) {
      return false;
    }

    const prevSeconds = Math.ceil(this.remainingMs / 1000);
    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    const newSeconds = Math.ceil(this.remainingMs / 1000);

    if (newSeconds !== prevSeconds && this.onTick) {
      this.onTick(newSeconds, this.getFormattedTime());
    }

    if (this.remainingMs === 0) {
      this.isRunning = false;
      if (this.onFinish) {
        this.onFinish();
      }
      return true;
    }

    return false;
  }

  /**
   * @returns {number} Sisa waktu dalam detik (dibulatkan ke atas)
   */
  getRemainingSeconds() {
    return Math.ceil(this.remainingMs / 1000);
  }

  /**
   * Format waktu mm:ss (mis. "02:00", "00:45", "00:09")
   * @returns {string}
   */
  getFormattedTime() {
    const totalSec = this.getRemainingSeconds();
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Cek apakah waktu sudah habis
   * @returns {boolean}
   */
  isFinished() {
    return this.remainingMs <= 0;
  }

  /**
   * Cek apakah sisa waktu kritis (kurang dari atau sama dengan 10 detik)
   * Digunakan untuk visual alert di HUD.
   * @returns {boolean}
   */
  isCritical() {
    return this.isRunning && this.getRemainingSeconds() <= 10;
  }

  /**
   * Reset timer ke durasi awal
   * @param {number} [newDurationSeconds]
   */
  reset(newDurationSeconds) {
    if (newDurationSeconds !== undefined) {
      this.totalDurationMs = Math.max(0, newDurationSeconds * 1000);
    }
    this.remainingMs = this.totalDurationMs;
    this.isRunning = false;
    this.isStarted = false;
    this._wasPausedByVisibility = false;
  }

  /**
   * Bersihkan event listener
   */
  destroy() {
    this.isRunning = false;
    if (typeof document !== 'undefined' && this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }
}
