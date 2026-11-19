/**
 * HapticManager.js - Pengelola Umpan Balik Getaran Taktil (Haptics) untuk BLOCKORA.
 * Membungkus navigator.vibrate dengan aman, memeriksa preferensi pengguna,
 * mendukung preset 'crisp', 'solid', 'dynamic', dan 'off'.
 */

import { StorageManager } from '../storage/StorageManager.js';

class HapticManager {
  /**
   * Cek apakah API vibrate didukung perangkat
   */
  static isSupported() {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  /**
   * Mengambil mode getaran saat ini ('crisp' | 'solid' | 'dynamic' | 'off')
   */
  static getMode() {
    if (!this.isSupported()) return 'off';
    try {
      const mode = localStorage.getItem('blockora.settings.haptic_mode');
      if (mode) return mode;
      // Fallback ke legacy boolean jika ada
      const legacy = localStorage.getItem('blockora.settings.haptic_enabled');
      if (legacy === 'false') return 'off';
      return 'crisp'; // default BLOCKORA
    } catch (_) {
      return 'crisp';
    }
  }

  /**
   * Menyimpan mode getaran baru
   */
  static setMode(mode) {
    try {
      localStorage.setItem('blockora.settings.haptic_mode', mode);
      localStorage.setItem('blockora.settings.haptic_enabled', mode !== 'off' ? 'true' : 'false');
    } catch (_) {}
  }

  /**
   * Memeriksa apakah haptic aktif
   */
  static isEnabled() {
    return this.isSupported() && this.getMode() !== 'off';
  }

  /**
   * Memicu pola getaran tertentu
   * @param {number|Array<number>} pattern 
   */
  static trigger(pattern) {
    if (!this.isEnabled()) return;
    try {
      navigator.vibrate(pattern);
    } catch (_) {
      // Abaikan error tanpa mengganggu gameplay
    }
  }

  /**
   * Memicu getaran uji (test) sesuai mode yang dipilih
   */
  static test(mode = null) {
    if (!this.isSupported()) return;
    const activeMode = mode || this.getMode();
    if (activeMode === 'off') return;

    if (activeMode === 'crisp') {
      this.trigger([25]);
    } else if (activeMode === 'solid') {
      this.trigger([60]);
    } else if (activeMode === 'dynamic') {
      this.trigger([20, 30, 50]);
    }
  }

  // Preset getaran taktil permainan
  static place() {
    const mode = this.getMode();
    if (mode === 'crisp') this.trigger(12);
    else if (mode === 'solid') this.trigger(30);
    else if (mode === 'dynamic') this.trigger(15);
  }

  static clear() {
    const mode = this.getMode();
    if (mode === 'crisp') this.trigger(25);
    else if (mode === 'solid') this.trigger(55);
    else if (mode === 'dynamic') this.trigger([20, 25, 30]);
  }

  static combo(level = 1) {
    const mode = this.getMode();
    if (mode === 'crisp') this.trigger([15, 30, 18]);
    else if (mode === 'solid') this.trigger([35, 25, 45]);
    else if (mode === 'dynamic') {
      const dur = Math.min(100, 20 + level * 15);
      this.trigger([15, 20, dur]);
    }
  }

  static invalid() {
    this.trigger([12, 40, 12]);
  }

  static gameOver() {
    this.trigger([40, 60, 40]);
  }
}

export { HapticManager };
