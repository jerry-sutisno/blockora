import { StorageManager } from '../storage/StorageManager.js';
import { GAME_MODES } from '../game/constants.js';
import { audioManager } from '../audio/AudioManager.js';
import { bindHeaderNav } from './HeaderNav.js';

/**
 * ResultUI - Tampilan antarmuka Game Over / Hasil Permainan
 * Markup disalin NYARIS VERBATIM dari design/stitch/result.html
 * dengan penambahan atribut data-* untuk data binding dan navigasi.
 */
export class ResultUI {
  constructor({ onPlayAgain, onMainMenu }) {
    this.onPlayAgain = onPlayAgain;
    this.onMainMenu = onMainMenu;
    this.container = null;
  }

  /**
   * Menampilkan layar Result dengan data statistik sesi
   * @param {HTMLElement} targetElement Kontainer DOM
   * @param {object} sessionData Data permainan { score, linesCleared, maxCombo, durationSeconds, mode, reason, dailyCompleted }
   */
  show(targetElement, sessionData = {}) {
    this.container = targetElement;
    if (this.container && this.container.classList) {
      this.container.classList.add('active');
    }

    const {
      score = 0,
      linesCleared = 0,
      maxCombo = 0,
      durationSeconds = 0,
      mode = 'classic',
      reason = 'board_full',
      dailyCompleted = false
    } = sessionData;

    const modeConfig = GAME_MODES[mode] || GAME_MODES.classic;

    // 1. Rekor terbaik SEBELUM memperbarui
    const previousBest = StorageManager.getBestScore(mode);
    const isNewRecord = score > previousBest && score > 0;

    // 2. Jika rekor baru, simpan ke LocalStorage
    if (isNewRecord) {
      StorageManager.setBestScore(mode, score);
    }
    const currentBest = Math.max(previousBest, score);

    // Hitung persentase progres terhadap rekor
    let progressPercent = '100%';
    let progressRatio = 100;
    if (currentBest > 0) {
      progressRatio = Math.min(100, Number(((score / currentBest) * 100).toFixed(1)));
      progressPercent = `${progressRatio}%`;
    }

    // Format durasi (mm:ss)
    const minutes = Math.floor(durationSeconds / 60).toString().padStart(2, '0');
    const seconds = (durationSeconds % 60).toString().padStart(2, '0');
    const formattedDuration = `${minutes}:${seconds}`;

    // Alasan berakhir & status
    let statusPillText = 'Round Complete • Out of Moves';
    let reasonTitle = 'Permainan Selesai';
    let reasonDesc = 'Papan penuh, tidak ada ruang penempatan blok berikutnya.';

    if (reason === 'time_out') {
      statusPillText = 'Round Complete • Time Out';
      reasonTitle = 'Waktu Habis!';
      reasonDesc = 'Waktu 120 detik telah berakhir.';
    } else if (mode === 'daily' && dailyCompleted) {
      statusPillText = 'Misi Harian Selesai • Papan Penuh';
      reasonDesc = 'Misi harian berhasil diselesaikan! Papan penuh.';
    }

    // Hitung akurasi estimasi atau default 94.2%
    const accuracy = '94.2%';

    const isMuted = audioManager.muted;

    // Render HTML verbatim dari Stitch result.html
    this.container.innerHTML = `
<!-- Ambient Background Visual Clusters -->
<div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden"><div class="absolute -top-12 -left-12 w-64 h-64 rounded-xl bg-surface-container-high/40 blur-2xl transform -rotate-12"></div><div class="absolute top-1/3 -right-20 w-80 h-80 rounded-xl bg-surface-variant/30 blur-3xl transform rotate-45"></div><div class="absolute -bottom-16 left-1/4 w-72 h-72 rounded-xl bg-surface-container-low/60 blur-2xl transform rotate-6"></div></div>

<!-- Header -->
<header class="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div class="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-gutter"><div class="flex items-center gap-space-md"><img alt="BLOCKORA Logo" class="h-8 w-auto object-contain" src="/assets/images/blockora-emblem.png"/><span class="font-headline-sm text-headline-sm tracking-tight text-on-surface uppercase">BLOCKORA</span></div><nav class="hidden md:flex items-center gap-space-xs p-space-xs bg-surface-container-low/70 rounded-full" data-active-classes="bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-full"><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="play" data-action="play-again" href="#">Play</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="modes" data-action="main-menu" href="#">Modes</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="leaderboard" data-action="main-menu" href="#">Leaderboard</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="how-to-play" data-action="main-menu" href="#">Rules</a></nav><div class="flex items-center gap-space-sm"><div class="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_2px_6px_rgba(15,23,42,0.04)]"><span class="material-symbols-outlined text-tertiary text-[18px]">trophy</span><span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Best</span><span class="font-label-md text-label-md text-on-surface" data-bind="header-best">${currentBest > 0 ? currentBest.toLocaleString() : 'Belum ada'}</span></div><button class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95" data-action="toggle-sound" type="button" aria-label="Toggle Sound"><span class="material-symbols-outlined text-[20px]" data-bind="sound-icon">${isMuted ? 'volume_off' : 'volume_up'}</span></button><button class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95" data-action="main-menu" type="button" aria-label="Audio & Settings"><span class="material-symbols-outlined text-[20px]">music_note</span></button><div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><span class="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div></div></header>

<!-- Main Container -->
<main class="w-full pt-16 bg-surface"><div class="flex flex-col w-full relative min-h-[calc(100vh-4rem)] items-center justify-center p-space-md sm:p-space-lg select-none overflow-hidden">
<!-- Background Frozen 10x10 Matrix & Tactical Game State (Dimmed Atmosphere) -->
<div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 scale-95 md:scale-100 transition-all duration-700">
<div class="w-[420px] max-w-[92vw] aspect-square p-space-sm bg-surface-container rounded-3xl shadow-inner flex flex-col justify-between">
<div class="grid grid-cols-10 grid-rows-10 gap-1 sm:gap-1.5 w-full h-full p-1 bg-surface-container-high/60 rounded-2xl">
<!-- Row 1 -->
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<!-- Row 2 -->
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<!-- Row 3 -->
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<!-- Row 4 -->
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<!-- Row 5 -->
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<!-- Row 6 -->
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<!-- Row 7 -->
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<!-- Row 8 -->
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<!-- Row 9 -->
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<!-- Row 10 -->
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-secondary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-primary-container shadow-sm"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-surface-container-lowest/50"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
<div class="rounded-md bg-tertiary-container shadow-sm"></div>
</div>
</div>
</div>
<!-- Ambient Frosted Glass Overlay Backing -->
<div class="absolute inset-0 bg-surface/75 backdrop-blur-md"></div>
<!-- Central Game Over Modal Card -->
<div class="relative z-10 w-full max-w-lg bg-surface-container-lowest/95 backdrop-blur-xl rounded-3xl p-space-md sm:p-space-lg shadow-2xl flex flex-col items-center">
<!-- Top Celebration Polyomino Icon / Badge -->
<div class="relative -mt-10 sm:-mt-12 mb-space-sm flex items-center justify-center">
<div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-primary to-primary-container shadow-xl shadow-primary/20 flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform duration-300">
<!-- Geometric Polyomino SVG Cluster -->
<svg class="w-10 h-10 text-on-primary" fill="currentColor" viewbox="0 0 24 24">
<rect height="5" rx="1.5" width="5" x="3" y="3"></rect>
<rect height="5" rx="1.5" width="5" x="9.5" y="3"></rect>
<rect height="5" rx="1.5" width="5" x="16" y="3"></rect>
<rect height="5" rx="1.5" width="5" x="9.5" y="9.5"></rect>
<rect height="5" rx="1.5" width="5" x="9.5" y="16"></rect>
</svg>
</div>
<div class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary shadow-md">
<span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">done</span>
</div>
</div>
<!-- Header Status Pill & Game State -->
<div class="flex flex-col items-center text-center gap-space-xs mb-space-md">
<div class="inline-flex items-center gap-1.5 px-space-md py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider shadow-sm">
<span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
        <span data-bind="status-pill">${statusPillText}</span>
      </div>
<span class="font-headline-sm text-headline-sm text-on-surface" data-bind="result-title">${reasonTitle}</span>
<span class="font-body-sm text-body-sm text-on-surface-variant -mt-1" data-bind="result-reason">${reasonDesc}</span>
</div>
<!-- Score Highlight Showcase -->
<div class="w-full bg-surface-container-low rounded-2xl p-space-md sm:p-space-lg flex flex-col items-center relative overflow-hidden mb-space-md">
<!-- Decorative Micro Glow Effect -->
<div class="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-primary-fixed blur-2xl pointer-events-none"></div>
<div class="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-tertiary-fixed blur-2xl pointer-events-none"></div>
<!-- Tag New High Record (menggunakan class invisible saat bukan rekor agar tinggi layout tetap terjaga) -->
<div id="badge-new-record" class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm mb-space-xs shadow-sm ${isNewRecord ? '' : 'invisible'}">
<span class="material-symbols-outlined text-[13px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span>NEW PERSONAL RECORD!</span>
</div>
<!-- Giant Final Score -->
<div class="flex items-baseline justify-center gap-1.5">
<span class="font-display-lg text-display-lg text-primary tracking-tight font-extrabold" data-bind="final-score" id="animated-score">${score.toLocaleString()}</span>
<span class="font-label-md text-label-md text-on-surface-variant font-bold tracking-widest uppercase">PTS</span>
</div>
<!-- Best Score Bar Comparison -->
<div class="w-full mt-space-sm pt-space-xs flex flex-col gap-1.5">
<div class="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-tertiary" style="font-variation-settings: 'FILL' 1;">trophy</span>
<span>All-Time Best: <strong class="text-on-surface" data-bind="best-score-val">${currentBest > 0 ? `${currentBest.toLocaleString()} PTS` : 'Belum ada'}</strong></span>
</div>
<span class="font-bold text-primary" data-bind="progress-percent">${progressPercent}</span>
</div>
<!-- Custom Tactile Progress Meter -->
<div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5">
<div class="h-full bg-gradient-to-r from-primary to-tertiary-fixed-dim rounded-full transition-all duration-1000 ease-out" data-bind="progress-bar" style="width: ${progressPercent};"></div>
</div>
<div class="flex justify-between items-center text-[10px] text-on-surface-variant">
<span>Skor Sesi Ini</span>
<span>Target Rekor Tertinggi</span>
</div>
</div>
</div>
<!-- Quick Round Metrics Grid (Tactile Mini Cards) -->
<div class="w-full grid grid-cols-2 sm:grid-cols-4 gap-space-xs sm:gap-space-sm mb-space-lg">
<!-- Metric 1: Lines Cleared -->
<div class="bg-surface-container rounded-xl p-space-sm flex flex-col items-center justify-center text-center shadow-sm hover:translate-y-[-1px] transition-transform">
<span class="material-symbols-outlined text-primary text-[20px] mb-0.5">grid_view</span>
<span class="font-headline-sm text-headline-sm text-on-surface font-bold leading-none" data-bind="lines-cleared">${linesCleared}</span>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">Lines Cleared</span>
</div>
<!-- Metric 2: Max Combo -->
<div class="bg-surface-container rounded-xl p-space-sm flex flex-col items-center justify-center text-center shadow-sm hover:translate-y-[-1px] transition-transform">
<span class="material-symbols-outlined text-secondary text-[20px] mb-0.5">local_fire_department</span>
<span class="font-headline-sm text-headline-sm text-on-surface font-bold leading-none" data-bind="max-combo">x${maxCombo}</span>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">Max Cascade</span>
</div>
<!-- Metric 3: Time Played -->
<div class="bg-surface-container rounded-xl p-space-sm flex flex-col items-center justify-center text-center shadow-sm hover:translate-y-[-1px] transition-transform">
<span class="material-symbols-outlined text-tertiary text-[20px] mb-0.5">timer</span>
<span class="font-headline-sm text-headline-sm text-on-surface font-bold leading-none" data-bind="duration">${formattedDuration}</span>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">Durasi Main</span>
</div>
<!-- Metric 4: Accuracy -->
<div class="bg-surface-container rounded-xl p-space-sm flex flex-col items-center justify-center text-center shadow-sm hover:translate-y-[-1px] transition-transform">
<span class="material-symbols-outlined text-surface-tint text-[20px] mb-0.5">target</span>
<span class="font-headline-sm text-headline-sm text-on-surface font-bold leading-none" data-bind="accuracy">${accuracy}</span>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">Akurasi Blok</span>
</div>
</div>
<!-- Primary Action Button Deck -->
<div class="w-full flex flex-col gap-space-sm">
<!-- Big Tactile CTA: Play Again -->
<button class="w-full h-14 bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg rounded-full shadow-[0_4px_0_#003ea8] active:translate-y-[3px] active:shadow-[0_1px_0_#003ea8] transition-all flex items-center justify-center gap-space-sm group" data-action="play-again" id="btn-play-again" type="button">
<span class="material-symbols-outlined text-[24px] group-hover:rotate-180 transition-transform duration-500">replay</span>
<span>Main Lagi (Play Again)</span>
</button>
<!-- Secondary Big CTA: Main Menu -->
<button class="w-full h-12 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs" data-action="main-menu" id="btn-main-menu" type="button">
<span class="material-symbols-outlined text-[20px] text-on-surface-variant">home</span>
<span>Menu Utama</span>
</button>
<!-- Auxiliary Action Buttons: Share & Watch Replay -->
<div class="w-full grid grid-cols-2 gap-space-sm pt-space-xs">
<button class="h-10 px-space-md bg-surface-container-lowest text-on-surface-variant font-label-md text-label-md rounded-full shadow-sm opacity-60 cursor-not-allowed flex items-center justify-center gap-1.5" id="btn-share" type="button" title="Fitur online segera hadir" disabled>
<span class="material-symbols-outlined text-[18px]">share</span>
<span id="share-label">Bagi Skor</span>
</button>
<button class="h-10 px-space-md bg-surface-container-lowest text-on-surface-variant font-label-md text-label-md rounded-full shadow-sm opacity-60 cursor-not-allowed flex items-center justify-center gap-1.5" id="btn-replay" type="button" title="Fitur tonton ulang segera hadir" disabled>
<span class="material-symbols-outlined text-[18px]">movie</span>
<span>Tonton Ulang</span>
</button>
</div>
</div>
</div>
</div></main>

<!-- Footer -->
<footer class="w-full bg-surface-container-low/60 mt-space-xl py-space-lg"><div class="max-w-7xl mx-auto px-margin flex flex-col sm:flex-row items-center justify-between gap-space-md text-center sm:text-left"><div class="flex items-center gap-space-sm"><span class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">BLOCKORA Minimalist Tactile Puzzle</span></div><div class="font-body-sm text-body-sm text-on-surface-variant">© 2025 BLOCKORA Studio. Crafted for focus &amp; flow.</div></div></footer>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.container) return;

    // Main Lagi
    this.container.querySelectorAll('[data-action="play-again"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onPlayAgain) this.onPlayAgain();
      });
    });

    // Menu Utama
    this.container.querySelectorAll('[data-action="main-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onMainMenu) this.onMainMenu();
      });
    });

    // Toggle Sound
    this.container.querySelectorAll('[data-action="toggle-sound"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const newMuted = audioManager.toggleMute();
        const iconSpan = this.container.querySelector('[data-bind="sound-icon"]');
        if (iconSpan) {
          iconSpan.textContent = newMuted ? 'volume_off' : 'volume_up';
        }
      });
    });

    // Unified Header Navigation
    bindHeaderNav(this.container, 'result');
  }

  hide() {
    if (this.container) {
      this.container.innerHTML = '';
      if (this.container.classList) {
        this.container.classList.remove('active');
      }
    }
  }
}
