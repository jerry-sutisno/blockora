/**
 * PWAManager.js - Pengelola Siklus Hidup PWA, Offline Cache Ready, Install Prompt, dan Standalone Mode.
 */

export class PWAManager {
  static deferredPrompt = null;
  static isOfflineReady = false;
  static isUpdateAvailable = false;
  static _statusListeners = new Set();
  static _installListeners = new Set();

  /**
   * Inisialisasi PWA listener
   */
  static init() {
    if (typeof window === 'undefined') return;

    // 1. Tangkap event beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this._notifyInstallListeners(true);
    });

    // 2. Deteksi saat aplikasi berhasil terpasang
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this._notifyInstallListeners(false);
      console.log('BLOCKORA: PWA berhasil dipasang');
    });

    // 3. Dengarkan event registrasi Service Worker dari vite-plugin-pwa
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        // Jika ada controller aktif, berarti precache sudah siap
        if (navigator.serviceWorker.controller) {
          this.isOfflineReady = true;
          this._notifyStatusListeners();
        }

        // Pantau update baru
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Update baru sudah diunduh di belakang layar
                this.isUpdateAvailable = true;
                this.showUpdateToast();
              } else if (newWorker.state === 'activated') {
                this.isOfflineReady = true;
                this._notifyStatusListeners();
              }
            });
          }
        });
      }).catch((err) => {
        console.warn('PWAManager: SW ready check error', err);
      });
    }

    // 4. Kunci orientasi portrait jika didukung API
    this.lockPortraitOrientation();

    // 5. Tangani tombol kembali sistem Android (popstate)
    this.setupAndroidBackButton();
  }

  /**
   * Cek apakah aplikasi berjalan dalam mode Standalone (PWA terpasang)
   */
  static isStandalone() {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  /**
   * Cek apakah perangkat adalah iOS Safari yang belum standalone
   */
  static isIOSSafariPromptEligible() {
    if (typeof window === 'undefined' || this.isStandalone()) return false;
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
    return isIOS && isSafari;
  }

  /**
   * Memicu dialog install native browser
   * @returns {Promise<boolean>}
   */
  static async promptInstall() {
    if (!this.deferredPrompt) return false;
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this._notifyInstallListeners(false);
      return outcome === 'accepted';
    } catch (e) {
      console.warn('Gagal memicu install prompt', e);
      return false;
    }
  }

  /**
   * Mengunci orientasi ke portrait secara aman
   */
  static lockPortraitOrientation() {
    try {
      if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('portrait').catch(() => {
          // Abaikan jika tidak diizinkan oleh browser
        });
      }
    } catch (_) {}
  }

  /**
   * Menangani tombol Back Android agar tidak menutup aplikasi saat gameplay
   */
  static setupAndroidBackButton() {
    // Tambah initial dummy state ke history
    if (typeof history !== 'undefined') {
      history.pushState({ page: 'blockora' }, '');

      window.addEventListener('popstate', (e) => {
        // Tangani tombol back: jika sedang di game, pemicu event pause atau kembali ke menu
        const returnMenuEvent = new CustomEvent('blockora:system-back');
        window.dispatchEvent(returnMenuEvent);
        // Dorong state kembali agar tetap di app
        history.pushState({ page: 'blockora' }, '');
      });
    }
  }

  /**
   * Menampilkan toast kecil bila versi baru tersedia tanpa memotong permainan
   */
  static showUpdateToast() {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('pwa-update-toast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #0b1c30;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      z-index: 9999;
      animation: popIn 0.25s ease-out;
    `;

    toast.innerHTML = `
      <span>Versi baru tersedia</span>
      <button id="btn-reload-pwa" type="button" style="background: var(--brand-primary); color: white; border: none; padding: 4px 10px; border-radius: 9999px; font-weight: 800; cursor: pointer; font-size: 11px;">
        Muat Ulang
      </button>
    `;

    document.body.appendChild(toast);

    toast.querySelector('#btn-reload-pwa')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  static onStatusChange(callback) {
    this._statusListeners.add(callback);
    callback(this.isOfflineReady);
    return () => this._statusListeners.delete(callback);
  }

  static onInstallAvailable(callback) {
    this._installListeners.add(callback);
    callback(Boolean(this.deferredPrompt));
    return () => this._installListeners.delete(callback);
  }

  static _notifyStatusListeners() {
    this._statusListeners.forEach(cb => cb(this.isOfflineReady));
  }

  static _notifyInstallListeners(canInstall) {
    this._installListeners.forEach(cb => cb(canInstall));
  }
}
