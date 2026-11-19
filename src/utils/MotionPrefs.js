/**
 * MotionPrefs.js - Utilitas terpusat untuk mendeteksi dan mengelola preferensi Reduce Motion.
 * Menggabungkan media query OS `prefers-reduced-motion` dengan preferensi pengguna di Settings.
 */

export class MotionPrefs {
  static KEY = 'blockora.settings.reduce_motion';
  static isReduced = false;
  static _listeners = new Set();

  /**
   * Mengambil status apakah reduce motion aktif berdasarkan setting dan OS media query
   * @param {Object} [env]
   * @param {string|null} [env.storedValue]
   * @param {boolean} [env.systemPrefersReduced]
   * @returns {boolean}
   */
  static resolveReducedMotion({ storedValue = null, systemPrefersReduced = false } = {}) {
    // Jika pemain memilih secara eksplisit di Settings:
    if (storedValue === 'true') return true;
    if (storedValue === 'false') return false;

    // Jika belum diset, default ikuti preferensi sistem operasi
    return Boolean(systemPrefersReduced);
  }

  /**
   * Inisialisasi awal di lingkungan browser
   */
  static init() {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const systemPrefers = mediaQuery ? mediaQuery.matches : false;
    let stored = null;

    try {
      stored = localStorage.getItem(this.KEY);
    } catch (e) {
      // Abaikan jika localStorage tidak bisa diakses
    }

    this.isReduced = this.resolveReducedMotion({
      storedValue: stored,
      systemPrefersReduced: systemPrefers
    });

    this.applyToDOM();

    // Dengarkan perubahan media query sistem
    if (mediaQuery && mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', (e) => {
        try {
          stored = localStorage.getItem(this.KEY);
        } catch (_) {}

        // Hanya ikuti sistem jika belum ada override pengguna
        if (stored === null) {
          this.setReducedMotion(e.matches, false);
        }
      });
    }
  }

  /**
   * Mengatur preferensi reduce motion
   * @param {boolean} reduced 
   * @param {boolean} [saveToStorage=true]
   */
  static setReducedMotion(reduced, saveToStorage = true) {
    this.isReduced = Boolean(reduced);
    if (saveToStorage && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.KEY, String(this.isReduced));
      } catch (e) {
        console.warn('Gagal menyimpan reduce_motion', e);
      }
    }
    this.applyToDOM();
    this._listeners.forEach(cb => cb(this.isReduced));
  }

  static applyToDOM() {
    if (typeof document !== 'undefined' && document.body) {
      if (this.isReduced) {
        document.body.classList.add('reduced-motion');
      } else {
        document.body.classList.remove('reduced-motion');
      }
    }
  }

  static onChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }
}
