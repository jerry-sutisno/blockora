import { audioManager } from '../audio/AudioManager.js';

/**
 * Modal - Pengelola modal dialog antarmuka BLOCKORA (Pause Dialog, Konfirmasi).
 * Menggunakan styling Tailwind v3 selaras dengan sistem desain Stitch.
 */
export class Modal {
  constructor({ onResume, onRestart, onMainMenu } = {}) {
    this.onResume = onResume || (() => {});
    this.onRestart = onRestart || (() => {});
    this.onMainMenu = onMainMenu || (() => {});
    this.container = null;
    this.keyHandler = null;
  }

  /**
   * Menampilkan dialog Pause
   * @param {HTMLElement} targetElement Kontainer DOM modal (#modal-container)
   */
  showPause(targetElement) {
    this.container = targetElement;
    this.container.innerHTML = `
      <div id="modal-backdrop" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
        <div class="bg-surface-container-lowest text-on-surface rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center text-center gap-4 relative animate-in fade-in zoom-in-95 duration-150" role="dialog" aria-modal="true" aria-labelledby="modal-pause-title">
          
          <!-- Icon Header -->
          <div class="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary shadow-sm">
            <span class="material-symbols-outlined text-[28px]">pause</span>
          </div>

          <!-- Title & Description -->
          <div class="flex flex-col gap-1">
            <h2 id="modal-pause-title" class="font-headline-sm text-headline-sm font-bold text-on-surface m-0">
              Permainan Dijeda
            </h2>
            <p class="font-body-sm text-body-sm text-on-surface-variant m-0">
              Istirahat sejenak, progres tersimpan aman.
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="w-full flex flex-col gap-2 mt-2">
            <button id="btn-pause-resume" class="w-full py-3 px-4 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer" type="button">
              Lanjut Bermain
            </button>
            <button id="btn-pause-restart" class="w-full py-2.5 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all active:scale-[0.98] cursor-pointer" type="button">
              Mulai Ulang (Restart)
            </button>
            <button id="btn-pause-menu" class="w-full py-2.5 px-4 rounded-full bg-transparent hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-all cursor-pointer" type="button">
              Menu Utama
            </button>
          </div>

        </div>
      </div>
    `;

    // Pasang listener klik backdrop (menutup modal & resume)
    const backdrop = this.container.querySelector('#modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          audioManager.playUIClick();
          this.hide();
          this.onResume();
        }
      });
    }

    // Pasang listener tombol
    const resumeBtn = this.container.querySelector('#btn-pause-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        audioManager.playUIClick();
        this.hide();
        this.onResume();
      });
    }

    const restartBtn = this.container.querySelector('#btn-pause-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        audioManager.playUIClick();
        this.hide();
        this.onRestart();
      });
    }

    const menuBtn = this.container.querySelector('#btn-pause-menu');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        audioManager.playUIClick();
        this.hide();
        this.onMainMenu();
      });
    }

    // Pasang listener tombol keyboard Escape
    this.cleanKeyHandler();
    this.keyHandler = (e) => {
      if (e.key === 'Escape') {
        audioManager.playUIClick();
        this.hide();
        this.onResume();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    this.container.classList.add('active');
  }

  cleanKeyHandler() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  hide() {
    this.cleanKeyHandler();
    if (this.container) {
      this.container.classList.remove('active');
      this.container.innerHTML = '';
    }
  }
}
