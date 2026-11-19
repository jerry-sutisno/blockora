import { StorageManager } from '../storage/StorageManager.js';
import { StatisticsManager } from '../storage/StatisticsManager.js';
import { StatsAggregator } from '../storage/StatsAggregator.js';
import { audioManager } from '../audio/AudioManager.js';
import { todayKey, getWeekDates } from '../utils/DateHelper.js';
import { bindHeaderNav } from './HeaderNav.js';

/**
 * MenuUI - Mengelola antarmuka Main Menu
 * Markup disalin NYARIS VERBATIM dari design/stitch/main-menu.html
 * dengan penambahan atribut data-* untuk data binding dan navigasi.
 */
export class MenuUI {
  constructor({ onSelectMode, onOpenDaily, onOpenStats, onOpenSettings, onOpenLeaderboard }) {
    this.onSelectMode = onSelectMode;
    this.onOpenDaily = onOpenDaily;
    this.onOpenStats = onOpenStats;
    this.onOpenSettings = onOpenSettings;
    this.onOpenLeaderboard = onOpenLeaderboard;
    this.container = null;
  }

  async show(targetElement) {
    if (targetElement) this.container = targetElement;
    if (this.container) {
      this.container.classList.add('active');
      await this.render(this.container);
    }
  }

  hide() {
    if (this.container) {
      this.container.classList.remove('active');
    }
  }

  async render(targetElement, mockData = null) {
    if (targetElement) this.container = targetElement;

    const isMock = Boolean(mockData && (typeof import.meta !== 'undefined' && import.meta.env?.DEV));

    // Baca data sinkron
    const classicBest = isMock && mockData?.classicBest !== undefined ? mockData.classicBest : StorageManager.getBestScore('classic');
    const timeBest = isMock && mockData?.timeBest !== undefined ? mockData.timeBest : StorageManager.getBestScore('time');
    const todayStr = isMock && mockData?.todayStr ? mockData.todayStr : todayKey();
    const streak = isMock && mockData?.streak !== undefined ? mockData.streak : StorageManager.calculateStreak(todayStr);
    const overallBest = Math.max(classicBest, timeBest);

    // Ambil top 3 skor untuk mini leaderboard
    let topScores = [];
    try {
      const allHistory = await StatisticsManager.getAllGames();
      const stats = StatsAggregator.aggregate(allHistory);
      topScores = stats.leaderboard || [];
    } catch {
      topScores = [];
    }

    const rank1Score = isMock ? 24850 : (topScores[0]?.score || 0);
    const rank1Name = isMock ? 'Aria_Vanguard' : (topScores[0]?.mode ? `Mode ${topScores[0].mode.toUpperCase()}` : 'Pemain');
    const rank2Score = isMock ? 8420 : (topScores[1]?.score || 0);
    const rank2Name = isMock ? 'KaelenNordic' : (topScores[1]?.mode ? `Mode ${topScores[1].mode.toUpperCase()}` : 'Pemain');
    const rank3Score = isMock ? 24850 : (topScores[2]?.score || 0);

    // Cek status audio
    const isMuted = audioManager.muted;

    this.container.innerHTML = `
<!-- Ambient Background Visual Clusters -->
<div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden"><div class="absolute -top-12 -left-12 w-64 h-64 rounded-xl bg-surface-container-high/40 blur-2xl transform -rotate-12"></div><div class="absolute top-1/3 -right-20 w-80 h-80 rounded-xl bg-surface-variant/30 blur-3xl transform rotate-45"></div><div class="absolute -bottom-16 left-1/4 w-72 h-72 rounded-xl bg-surface-container-low/60 blur-2xl transform rotate-6"></div></div>

<!-- Header -->
<header class="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div class="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-gutter"><div class="flex items-center gap-space-md"><img alt="BLOCKORA Logo" class="h-8 w-auto object-contain" src="/assets/images/blockora-emblem.png"/><span class="font-headline-sm text-headline-sm tracking-tight text-on-surface uppercase">BLOCKORA</span></div><nav class="hidden md:flex items-center gap-space-xs p-space-xs bg-surface-container-low/70 rounded-full" data-active-classes="bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-full"><a aria-current="page" class="px-space-md py-space-xs transition-colors bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-full" data-path="play" data-action="play-classic" href="#">Play</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="modes" data-action="scroll-modes" href="#modes-section">Modes</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="leaderboard" data-action="open-leaderboard" href="#">Leaderboard</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="how-to-play" data-action="scroll-rules" href="#rules-section">Rules</a></nav><div class="flex items-center gap-space-sm"><div class="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_2px_6px_rgba(15,23,42,0.04)]"><span class="material-symbols-outlined text-tertiary text-[18px]">trophy</span><span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Best</span><span class="font-label-md text-label-md text-on-surface" data-bind="header-best">${overallBest > 0 ? overallBest.toLocaleString() : (isMock ? '24,850' : 'Belum ada')}</span></div><button class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95" data-action="toggle-sound" type="button" aria-label="Toggle Sound"><span class="material-symbols-outlined text-[20px]" data-bind="sound-icon">${isMuted ? 'volume_off' : 'volume_up'}</span></button><button class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95" data-action="open-settings" type="button" aria-label="Audio & Settings"><span class="material-symbols-outlined text-[20px]">music_note</span></button><div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><span class="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div></div></header>

<!-- Main -->
<main class="w-full pt-16 bg-surface"><div class="flex flex-col w-full">
<div class="relative w-full max-w-7xl mx-auto px-margin py-space-md sm:py-space-xl overflow-hidden">
<!-- Ambient Isometric Background Visual Clusters -->
<div class="absolute -top-10 right-4 sm:right-16 w-64 h-64 pointer-events-none opacity-40 -z-10 select-none">
<div class="relative w-full h-full animate-[pulse_6s_ease-in-out_infinite]">
<div class="absolute top-2 right-4 w-16 h-16 rounded-xl bg-primary shadow-lg transform rotate-12 -skew-y-6"></div>
<div class="absolute top-14 right-20 w-14 h-14 rounded-xl bg-secondary-container shadow-md transform -rotate-6 skew-x-3"></div>
<div class="absolute top-24 right-6 w-16 h-16 rounded-xl bg-tertiary-fixed shadow-md transform rotate-45"></div>
</div>
</div>
<div class="absolute bottom-10 -left-12 w-72 h-72 pointer-events-none opacity-30 -z-10 select-none">
<div class="relative w-full h-full">
<div class="absolute bottom-6 left-12 w-20 h-20 rounded-xl bg-surface-container-highest shadow-inner transform -rotate-12"></div>
<div class="absolute bottom-20 left-28 w-14 h-14 rounded-xl bg-primary-fixed shadow transform rotate-6"></div>
</div>
</div>
<!-- Main Grid Layout: Interactive Hero & Play Deck + Companion Focus Widget -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-start">
<!-- Left / Primary Column: Hero + Game Modes Deck -->
<div class="lg:col-span-7 flex flex-col gap-space-lg">
<!-- Hero Header Block -->
<div class="flex flex-col items-start bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-lg shadow-sm">
<div class="w-full flex items-center justify-between pb-space-sm">
<div class="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface">
<span class="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-tertiary">Season 04 Active</span>
</div>
<div class="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
<span class="material-symbols-outlined text-[16px]">touch_app</span>
<span>Tactile Arcade</span>
</div>
</div>
<!-- Hero Image & Identity -->
<div class="my-space-sm flex flex-col sm:flex-row items-center sm:items-start gap-space-md w-full">
<div class="w-full max-w-[280px] sm:max-w-[340px] drop-shadow-sm select-none">
<img alt="BLOCKORA Tactile Blocks Emblem" class="w-full h-auto object-contain transition-transform hover:scale-[1.02] duration-300" src="/assets/images/blockora-emblem.png"/>
</div>
<div class="flex flex-col justify-center sm:pt-space-md text-center sm:text-left">
<span class="font-label-sm text-label-sm tracking-widest text-primary font-bold uppercase">Minimalist Geometry</span>
<h1 class="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                BLOCKORA
              </h1>
<p class="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                Place. Match. Clear. Repeat.
              </p>
<div class="mt-space-sm flex items-center justify-center sm:justify-start gap-space-xs">
<span class="px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">v2.4 Pro</span>
<span class="px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">60 FPS Flow</span>
</div>
</div>
</div>
</div>
<!-- Mode Selectors: High-Tactile Buttons -->
<div id="modes-section" class="flex flex-col gap-space-sm">
<div class="flex items-center justify-between px-space-xs">
<span class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Select Puzzle Mode / Pilih Mode</span>
<span class="font-label-sm text-label-sm text-primary">3 Modes Ready</span>
</div>
<!-- 1. Classic Mode (Primary CTA) -->
<button class="group w-full text-left relative overflow-hidden bg-primary-container text-on-primary p-space-md sm:p-space-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-sm" data-action="play-classic" style="box-shadow: 0 4px 0 #1d4ed8;" type="button">
<div class="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-on-primary/10 blur-xl pointer-events-none"></div>
<div class="flex items-center justify-between relative z-10">
<div class="flex items-start gap-space-md min-w-0">
<div class="w-14 h-14 rounded-DEFAULT bg-on-primary/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-[32px] text-on-primary" style="font-variation-settings: 'FILL' 1;">play_circle</span>
</div>
<div class="flex flex-col min-w-0">
<div class="flex items-center gap-space-sm">
<span class="font-headline-md text-headline-md tracking-tight text-on-primary">Classic Mode</span>
<span class="px-space-xs py-0.5 rounded bg-on-primary text-primary font-label-sm text-label-sm font-extrabold uppercase">Main CTA</span>
</div>
<p class="font-body-md text-body-md text-on-primary/90 mt-0.5 truncate">
                    Endless relaxing block placement. Zen tactile state.
                  </p>
<div class="mt-space-xs flex items-center gap-space-sm">
<span class="inline-flex items-center gap-1 font-label-sm text-label-sm bg-on-primary/20 px-space-sm py-0.5 rounded-full">
<span class="material-symbols-outlined text-[14px]">military_tech</span> <span data-bind="classic-best">Best: ${classicBest > 0 ? classicBest.toLocaleString() : (isMock ? '24,850' : 'Belum ada')}</span>
                    </span>
<span class="font-body-sm text-body-sm text-on-primary/80">No time limit</span>
</div>
</div>
</div>
<div class="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-on-primary/20 flex-shrink-0 group-hover:translate-x-1 transition-transform">
<span class="material-symbols-outlined text-on-primary text-[24px]">arrow_forward</span>
</div>
</div>
</button>
<!-- 2. Time Challenge -->
<button class="group w-full text-left relative overflow-hidden bg-surface-container-lowest text-on-surface p-space-md sm:p-space-lg rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0.5" data-action="play-time" type="button">
<div class="flex items-center justify-between">
<div class="flex items-start gap-space-md min-w-0">
<div class="w-14 h-14 rounded-DEFAULT bg-secondary-fixed flex items-center justify-center flex-shrink-0 text-secondary group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-[30px]" style="font-variation-settings: 'FILL' 1;">timer</span>
</div>
<div class="flex flex-col min-w-0">
<div class="flex items-center gap-space-sm">
<span class="font-headline-sm text-headline-sm tracking-tight text-on-surface">Time Challenge</span>
<span class="px-space-xs py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">2 MIN</span>
</div>
<p class="font-body-md text-body-md text-on-surface-variant mt-0.5 truncate">
                    Fast-paced cascade blitz. Clear full rows before the buzzer.
                  </p>
<div class="mt-space-xs flex items-center gap-space-sm">
<span class="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container px-space-sm py-0.5 rounded-full text-on-surface">
<span class="material-symbols-outlined text-secondary text-[14px]">bolt</span> <span data-bind="time-best">Today's Top: ${timeBest > 0 ? timeBest.toLocaleString() : (isMock ? '8,420' : 'Belum ada')}</span>
                    </span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Multipliers on</span>
</div>
</div>
</div>
<div class="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-surface-container flex-shrink-0 group-hover:translate-x-1 transition-transform">
<span class="material-symbols-outlined text-on-surface-variant text-[24px]">chevron_right</span>
</div>
</div>
</button>
<!-- 3. Daily Challenge -->
<button class="group w-full text-left relative overflow-hidden bg-surface-container-lowest text-on-surface p-space-md sm:p-space-lg rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0.5" data-action="play-daily" type="button">
<div class="flex items-center justify-between">
<div class="flex items-start gap-space-md min-w-0">
<div class="w-14 h-14 rounded-DEFAULT bg-tertiary-fixed flex items-center justify-center flex-shrink-0 text-tertiary group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-[30px]" style="font-variation-settings: 'FILL' 1;">calendar_today</span>
</div>
<div class="flex flex-col min-w-0">
<div class="flex items-center gap-space-sm">
<span class="font-headline-sm text-headline-sm tracking-tight text-on-surface">Daily Challenge</span>
<span class="px-space-xs py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-bold uppercase">New</span>
</div>
<p class="font-body-md text-body-md text-on-surface-variant mt-0.5 truncate">
                    Puzzle #${todayStr.replace(/-/g, '').slice(4)} • Handcrafted spatial arrangement.
                  </p>
<div class="mt-space-xs flex items-center gap-space-sm">
<span class="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container px-space-sm py-0.5 rounded-full text-on-surface">
<span class="material-symbols-outlined text-tertiary text-[14px]">stars</span> 3 Trophies Remaining
                    </span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Resets 00:00 UTC</span>
</div>
</div>
</div>
<div class="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-surface-container flex-shrink-0 group-hover:translate-x-1 transition-transform">
<span class="material-symbols-outlined text-on-surface-variant text-[24px]">chevron_right</span>
</div>
</div>
</button>
</div>
<!-- Auxiliary Action Buttons (Stats & Settings) -->
<div class="grid grid-cols-2 gap-space-sm pt-space-xs">
<button class="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-lg shadow-sm hover:bg-surface-container-low transition-colors text-left" data-action="open-stats" type="button">
<div class="flex items-center gap-space-sm min-w-0">
<div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 text-primary">
<span class="material-symbols-outlined text-[20px]">insights</span>
</div>
<div class="flex flex-col min-w-0">
<span class="font-label-lg text-label-lg text-on-surface truncate">Statistics</span>
<span class="font-body-sm text-body-sm text-on-surface-variant truncate">Streaks & Logs</span>
</div>
</div>
<span class="material-symbols-outlined text-on-surface-variant text-[18px]">open_in_new</span>
</button>
<button class="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-lg shadow-sm hover:bg-surface-container-low transition-colors text-left" data-action="open-settings" type="button">
<div class="flex items-center gap-space-sm min-w-0">
<div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 text-on-surface">
<span class="material-symbols-outlined text-[20px]">tune</span>
</div>
<div class="flex flex-col min-w-0">
<span class="font-label-lg text-label-lg text-on-surface truncate">Settings</span>
<span class="font-body-sm text-body-sm text-on-surface-variant truncate">Audio & Theme</span>
</div>
</div>
<span class="material-symbols-outlined text-on-surface-variant text-[18px]">settings</span>
</button>
</div>
</div>
<!-- Right Column: Interactive Quick-View Widget / Flow Companion -->
<div class="lg:col-span-5 flex flex-col gap-space-md mt-space-md lg:mt-0">
<!-- Daily Streak & Level Status Card -->
<div class="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<span class="w-9 h-9 rounded-full bg-error-container text-error flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
</span>
<div>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Daily Streak</span>
<div class="font-headline-sm text-headline-sm text-on-surface font-extrabold" data-bind="streak-text">${streak > 0 ? `${streak} Days Running` : (isMock ? '7 Days Running' : '0 Days Running')}</div>
</div>
</div>
<span class="px-space-sm py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">${streak > 0 ? 'Top 5%' : 'Mulai Hari Ini'}</span>
</div>
<!-- Streak Calendar Dots -->
<div class="grid grid-cols-7 gap-1.5 pt-space-xs">
<div class="flex flex-col items-center gap-1">
<span class="font-label-sm text-label-sm text-on-surface-variant">M</span>
<div class="w-7 h-7 rounded-full ${streak >= 7 || isMock ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant/40'} flex items-center justify-center shadow-xs">
<span class="material-symbols-outlined text-[14px]">${streak >= 7 || isMock ? 'check' : 'remove'}</span>
</div>
</div>
<div class="flex flex-col items-center gap-1">
<span class="font-label-sm text-label-sm text-on-surface-variant">T</span>
<div class="w-7 h-7 rounded-full ${streak >= 6 || isMock ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant/40'} flex items-center justify-center shadow-xs">
<span class="material-symbols-outlined text-[14px]">${streak >= 6 || isMock ? 'check' : 'remove'}</span>
</div>
</div>
<div class="flex flex-col items-center gap-1">
<span class="font-label-sm text-label-sm text-on-surface-variant">W</span>
<div class="w-7 h-7 rounded-full ${streak >= 5 || isMock ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant/40'} flex items-center justify-center shadow-xs">
<span class="material-symbols-outlined text-[14px]">${streak >= 5 || isMock ? 'check' : 'remove'}</span>
</div>
</div>
<div class="flex flex-col items-center gap-1">
<span class="font-label-sm text-label-sm text-on-surface-variant">T</span>
<div class="w-7 h-7 rounded-full ${streak >= 4 || isMock ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant/40'} flex items-center justify-center shadow-xs">
<span class="material-symbols-outlined text-[14px]">${streak >= 4 || isMock ? 'check' : 'remove'}</span>
</div>
</div>
<div class="flex flex-col items-center gap-1">
<span class="font-label-sm text-label-sm text-on-surface-variant">F</span>
<div class="w-7 h-7 rounded-full ${streak >= 3 || isMock ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant/40'} flex items-center justify-center shadow-xs">
<span class="material-symbols-outlined text-[14px]">${streak >= 3 || isMock ? 'check' : 'remove'}</span>
</div>
</div>
<div class="flex flex-col items-center gap-1">
<span class="font-label-sm text-label-sm text-on-surface-variant">S</span>
<div class="w-7 h-7 rounded-full ${streak >= 2 || isMock ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant/40'} flex items-center justify-center shadow-xs">
<span class="material-symbols-outlined text-[14px]">${streak >= 2 || isMock ? 'check' : 'remove'}</span>
</div>
</div>
<div class="flex flex-col items-center gap-1">
<span class="font-label-sm text-label-sm text-primary font-bold">S</span>
<div class="w-7 h-7 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center font-bold font-label-sm text-label-sm shadow-xs animate-pulse">
                Today
              </div>
</div>
</div>
</div>
<!-- Tactile Interactive 'How to Play' Board Micro-Preview -->
<div id="rules-section" class="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-sm">
<div class="flex items-center justify-between">
<span class="font-headline-sm text-headline-sm text-on-surface">Tactile Canvas Rules</span>
<span class="font-label-sm text-label-sm text-on-surface-variant">3x3 Drop Matrix</span>
</div>
<p class="font-body-sm text-body-sm text-on-surface-variant">
            Fit geometric Polyominoes into the grid. Fill complete rows or columns to trigger the spatial clear wave.
          </p>
<!-- Interactive Micro Grid Canvas simulation -->
<div class="w-full bg-surface-container-low p-space-md rounded-DEFAULT flex flex-col items-center justify-center my-space-xs select-none">
<div class="grid grid-cols-4 gap-2 w-48 h-48 bg-surface-container p-2 rounded-xl" id="demoGrid">
<!-- Cell placeholders representing physical board -->
<div class="bg-surface-container-lowest rounded-md transition-all duration-300"></div>
<div class="bg-primary rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-primary rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-surface-container-lowest rounded-md transition-all duration-300"></div>
<div class="bg-secondary-container rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-secondary-container rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-primary rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-surface-container-lowest rounded-md transition-all duration-300"></div>
<div class="bg-tertiary-fixed-dim rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-surface-container-lowest rounded-md transition-all duration-300"></div>
<div class="bg-primary rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-tertiary-container rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-tertiary-fixed-dim rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-tertiary-fixed-dim rounded-md shadow-sm transition-all duration-300"></div>
<div class="bg-surface-container-lowest rounded-md transition-all duration-300"></div>
<div class="bg-tertiary-container rounded-md shadow-sm transition-all duration-300"></div>
</div>
<div class="mt-space-sm flex items-center gap-space-sm">
<span class="w-2 h-2 rounded-full bg-primary"></span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Tap blocks in gameplay to fit without rotation</span>
</div>
</div>
<div class="flex items-center justify-between pt-space-xs">
<a class="font-label-md text-label-md text-primary hover:underline flex items-center gap-1" data-action="open-stats" href="#">
              Read Master Strategy Guide <span class="material-symbols-outlined text-[16px]">arrow_right_alt</span>
</a>
<span class="font-label-sm text-label-sm text-on-surface-variant font-mono">GRID: 10×10</span>
</div>
</div>
<!-- Mini Leaderboard Snapshot -->
<div class="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-sm">
<div class="flex items-center justify-between pb-space-xs">
<div class="flex items-center gap-space-xs">
<span class="material-symbols-outlined text-tertiary text-[20px]">leaderboard</span>
<span class="font-headline-sm text-headline-sm text-on-surface">Rekor Lokal (Papan Peringkat)</span>
</div>
<a class="font-label-sm text-label-sm text-primary hover:underline" data-action="open-leaderboard" href="#">Lihat Semua</a>
</div>
${topScores.length === 0 && !isMock ? `
<div class="py-space-lg px-space-md text-center text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low/40 rounded-lg">
  Belum ada rekor tersimpan.<br/>Mainkan game untuk mencatat rekor pertamamu!
</div>
` : `
<div class="flex flex-col gap-space-xs">
<!-- Rank 1 -->
<div class="flex items-center justify-between p-space-xs rounded bg-surface-container-low/70">
<div class="flex items-center gap-space-sm">
<span class="w-6 h-6 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center justify-center font-bold">1</span>
<span class="font-label-md text-label-md text-on-surface truncate" data-bind="rank1-name">${rank1Name}</span>
</div>
<span class="font-label-md text-label-md text-on-surface font-mono" data-bind="rank1-score">${rank1Score.toLocaleString()}</span>
</div>
<!-- Rank 2 -->
<div class="flex items-center justify-between p-space-xs rounded bg-surface-container-low/40">
<div class="flex items-center gap-space-sm">
<span class="w-6 h-6 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center justify-center font-bold">2</span>
<span class="font-label-md text-label-md text-on-surface truncate" data-bind="rank2-name">${rank2Name}</span>
</div>
<span class="font-label-md text-label-md text-on-surface font-mono" data-bind="rank2-score">${rank2Score.toLocaleString()}</span>
</div>
<!-- Rank 3 (Player Highlight) -->
<div class="flex items-center justify-between p-space-xs rounded bg-primary-fixed/50">
<div class="flex items-center gap-space-sm">
<span class="w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">3</span>
<span class="font-label-md text-label-md text-on-surface font-extrabold truncate">${isMock ? 'You (Local Champ)' : 'Sesi Kamu'}</span>
</div>
<span class="font-label-md text-label-md text-primary font-mono font-bold" data-bind="rank3-score">${rank3Score.toLocaleString()}</span>
</div>
</div>
`}
</div>
</div>
</div>
<!-- Haptic / Quick Settings Bottom Bar -->
<div class="mt-space-lg w-full bg-surface-container-low/70 rounded-full px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md text-on-surface-variant">
<div class="flex items-center gap-space-md">
<span class="flex items-center gap-1 font-body-sm text-body-sm">
<span class="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
          Local Save Synchronized
        </span>
<span class="hidden md:inline font-body-sm text-body-sm">•</span>
<span class="hidden md:inline font-body-sm text-body-sm">Haptic Feedback: Crisp</span>
</div>
<div class="flex items-center gap-space-sm">
<span class="font-label-sm text-label-sm uppercase tracking-wider">Audio Ambience:</span>
<button class="px-space-sm py-0.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-xs hover:bg-surface-container-high" data-action="toggle-sound" type="button">
          Chillwave Focus
        </button>
</div>
</div>
</div>
</div></main>

<!-- Footer -->
<footer class="w-full bg-surface-container-low/60 mt-space-xl py-space-lg"><div class="max-w-7xl mx-auto px-margin flex flex-col sm:flex-row items-center justify-between gap-space-md text-center sm:text-left"><div class="flex items-center gap-space-sm"><span class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">BLOCKORA Minimalist Tactile Puzzle</span></div><div class="font-body-sm text-body-sm text-on-surface-variant">© 2025 BLOCKORA Studio. Crafted for focus & flow.</div></div></footer>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.container) return;

    // Classic Mode
    this.container.querySelectorAll('[data-action="play-classic"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onSelectMode) this.onSelectMode('classic');
      });
    });

    // Time Challenge
    this.container.querySelectorAll('[data-action="play-time"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onSelectMode) this.onSelectMode('time');
      });
    });

    // Daily Challenge
    this.container.querySelectorAll('[data-action="play-daily"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onOpenDaily) this.onOpenDaily();
      });
    });

    // Statistics
    this.container.querySelectorAll('[data-action="open-stats"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onOpenStats) this.onOpenStats();
      });
    });

    // Settings
    this.container.querySelectorAll('[data-action="open-settings"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onOpenSettings) this.onOpenSettings();
      });
    });

    // Leaderboard
    this.container.querySelectorAll('[data-action="open-leaderboard"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onOpenLeaderboard) this.onOpenLeaderboard();
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

    // Scroll helpers
    const scrollModes = this.container.querySelector('[data-action="scroll-modes"]');
    if (scrollModes) {
      scrollModes.addEventListener('click', (e) => {
        e.preventDefault();
        const target = this.container.querySelector('#modes-section');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const scrollRules = this.container.querySelector('[data-action="scroll-rules"]');
    if (scrollRules) {
      scrollRules.addEventListener('click', (e) => {
        e.preventDefault();
        const target = this.container.querySelector('#rules-section');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Unified Header Navigation
    bindHeaderNav(this.container, 'menu');
  }
}
