/**
 * DailyUI.js - Layar Tantangan Harian (Daily Challenge Screen) untuk BLOCKORA.
 *
 * Implementasi "Wiring Only" berdasarkan markup asli Stitch: design/stitch/daily.html.
 * Menggunakan Tailwind v3 lokal, font Plus Jakarta Sans, dan Material Symbols Outlined self-host.
 * Mengikat data nyata dari DailyChallenge, StorageManager, dan AudioManager.
 * Mendukung navigasi kalender bulanan, seleksi hari, countdown reset lokal, dan mode latihan.
 */

import { StorageManager } from '../storage/StorageManager.js';
import { generateDailyConfig } from '../game/DailyChallenge.js';
import { audioManager } from '../audio/AudioManager.js';
import { TACTILE_TIPS } from '../game/constants.js';
import { bindHeaderNav } from './HeaderNav.js';
import {
  todayKey,
  getMonthDays,
  formatIndonesianDate,
  formatMonthYear,
  daysBetween,
  parseDateKey
} from '../utils/DateHelper.js';

function getEditionNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startOfYear = new Date(y, 0, 1);
  const current = new Date(y, m - 1, d);
  return Math.floor((current.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getSeasonText(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  if (m >= 3 && m <= 5) return `Musim Semi ${y}`;
  if (m >= 6 && m <= 8) return `Musim Panas ${y}`;
  if (m >= 9 && m <= 11) return `Musim Gugur ${y}`;
  return `Musim Dingin ${y}`;
}

function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(totalSec) {
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export class DailyUI {
  /**
   * @param {Object} options
   * @param {Function} options.onBack Callback navigasi kembali ke Menu Utama
   * @param {Function} options.onStartChallenge Callback memulai tantangan harian (dateKey)
   */
  constructor({ onBack, onStartChallenge } = {}) {
    this.onBack = onBack || (() => {});
    this.onStartChallenge = onStartChallenge || (() => {});
    this.container = null;

    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.selectedDateKey = todayKey();

    this.timerInterval = null;
    this.isMockMode = false;
    this.mockData = null;
  }

  /**
   * Render layar Daily Challenge ke elemen target
   * @param {HTMLElement} targetElement
   * @param {Object} [mockData=null]
   */
  async show(targetElement, mockData = null) {
    this.container = targetElement;
    if (mockData) {
      this.isMockMode = true;
      this.mockData = mockData;
      if (mockData.dateKey) this.selectedDateKey = mockData.dateKey;
      if (mockData.year !== undefined) this.currentYear = mockData.year;
      if (mockData.month !== undefined) this.currentMonth = mockData.month;
    } else {
      this.isMockMode = false;
      this.mockData = null;
    }
    this.render();
    this.container.classList.add('active');
    this.startCountdownTimer();
  }

  hide() {
    this.stopCountdownTimer();
    if (this.container) {
      this.container.classList.remove('active');
      this.container.innerHTML = '';
    }
  }

  startCountdownTimer() {
    this.stopCountdownTimer();
    if (this.isMockMode && this.mockData?.countdown) {
      return; // Jangan override countdown mock
    }
    const updateCountdown = () => {
      const el = this.container?.querySelector('#countdown-timer');
      if (el) {
        el.textContent = formatCountdown(getSecondsUntilMidnight());
      }
    };
    updateCountdown();
    this.timerInterval = setInterval(updateCountdown, 1000);
  }

  stopCountdownTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  render() {
    if (!this.container) return;

    const isMock = this.isMockMode && this.mockData;
    const todayStr = isMock ? (this.mockData.todayStr || this.selectedDateKey) : todayKey();
    const streak = isMock && this.mockData.streak !== undefined ? this.mockData.streak : StorageManager.calculateStreak(todayStr);
    const monthCal = getMonthDays(this.currentYear, this.currentMonth);
    const allRecords = isMock && this.mockData.allRecords ? this.mockData.allRecords : StorageManager.getAllDailyRecords();

    // Data bulan aktif
    let completedInMonth = 0;
    let missedInMonth = 0;
    let lockedInMonth = 0;

    monthCal.days.forEach(day => {
      const rec = allRecords[day.dateKey];
      const diff = daysBetween(todayStr, day.dateKey);
      if (rec && rec.completed) {
        completedInMonth++;
      } else if (diff < 0) {
        missedInMonth++;
      } else if (diff > 0) {
        lockedInMonth++;
      }
    });

    const isCurrentMonth = (new Date().getFullYear() === this.currentYear && new Date().getMonth() === this.currentMonth);
    const elapsedDays = isCurrentMonth ? new Date().getDate() : (daysBetween(todayStr, `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-01`) < 0 ? monthCal.totalDays : 0);
    const percentMonth = isMock && this.mockData.percentMonth !== undefined ? this.mockData.percentMonth : (elapsedDays > 0 ? Math.round((completedInMonth / elapsedDays) * 100) : 0);
    const milestoneTarget = elapsedDays > 0 ? elapsedDays : monthCal.totalDays;
    const milestoneRatio = isMock && this.mockData.milestoneRatio ? this.mockData.milestoneRatio : `${completedInMonth} / ${milestoneTarget}`;

    // Data misi untuk selectedDateKey
    const selectedRecord = (isMock && this.mockData.selectedRecord) ? this.mockData.selectedRecord : (allRecords[this.selectedDateKey] || { completed: false, bestScore: 0, targetsDone: 0 });
    const missionConfig = (isMock && this.mockData.missionConfig) ? this.mockData.missionConfig : generateDailyConfig(this.selectedDateKey);
    const isToday = this.selectedDateKey === todayStr;
    const isFuture = daysBetween(todayStr, this.selectedDateKey) > 0;
    const isCompleted = selectedRecord.completed || (selectedRecord.targetsDone >= 3);

    // Header data
    const bestClassic = StorageManager.getBestScore('classic');
    const bestDaily = StorageManager.getBestScore('daily');
    const displayBest = isMock && this.mockData.bestScore !== undefined ? this.mockData.bestScore : Math.max(bestClassic, bestDaily);

    // Tips taktil deterministik harian
    const daySeed = parseDateKey(this.selectedDateKey).getDate();
    const tipIndex = daySeed % TACTILE_TIPS.length;
    const dailyTip = isMock && this.mockData.tipText ? this.mockData.tipText : TACTILE_TIPS[tipIndex];

    const isSfxMuted = audioManager?.isSfxMuted ?? false;
    const isBgmMuted = audioManager?.isBgmMuted ?? false;

    // Edition & Season
    const editionNum = isMock && this.mockData.editionNum ? this.mockData.editionNum : getEditionNumber(this.selectedDateKey);
    const seasonText = isMock && this.mockData.seasonText ? this.mockData.seasonText : getSeasonText(this.selectedDateKey);

    // Bangun markup kalender
    const calendarMarkup = this.buildCalendarMarkup({
      monthCal,
      todayStr,
      allRecords,
      selectedDateKey: this.selectedDateKey
    });

    // Bangun markup target misi
    const targetsMarkup = this.buildTargetsMarkup({
      targets: missionConfig.targets,
      selectedRecord,
      isCompleted
    });

    // Jumlah target tercapai
    const targetsDone = isCompleted ? 3 : (isMock && this.mockData.targetsDone !== undefined ? this.mockData.targetsDone : Math.min(3, selectedRecord.targetsDone || 0));
    const progressPercent = Math.round((targetsDone / 3) * 100);

    const countdownDisplay = isMock && this.mockData.countdown ? this.mockData.countdown : formatCountdown(getSecondsUntilMidnight());
    const ctaText = isMock && this.mockData.ctaText ? this.mockData.ctaText : (targetsDone > 0 ? 'Lanjutkan Tantangan Hari Ini' : 'Mulai Tantangan Hari Ini');
    const ctaSub = isMock && this.mockData.ctaSub ? this.mockData.ctaSub : (targetsDone === 2 ? 'Target Terakhir' : `${3 - targetsDone} Target Tersisa`);

    const statTitle = isMock && this.mockData.statTitle ? this.mockData.statTitle : 'Rekor Hari Ini';
    const statBold = isMock && this.mockData.statBold ? this.mockData.statBold : (selectedRecord.bestScore > 0 ? `${selectedRecord.bestScore.toLocaleString('id-ID')} Poin` : 'Belum Dimainkan');
    const statDesc = isMock && this.mockData.statDesc ? this.mockData.statDesc : (selectedRecord.bestScore > 0 ? `diraih pada tantangan ${isToday ? 'hari ini' : formatIndonesianDate(this.selectedDateKey)}.` : '— selesaikan misi untuk mencetak rekor.');

    const legendCompletedCount = isMock && this.mockData.legendCompleted !== undefined ? this.mockData.legendCompleted : completedInMonth;
    const legendTodayDay = isMock && this.mockData.legendToday !== undefined ? this.mockData.legendToday : parseDateKey(todayStr).getDate();
    const legendMissedCount = isMock && this.mockData.legendMissed !== undefined ? this.mockData.legendMissed : missedInMonth;
    const legendLockedCount = isMock && this.mockData.legendLocked !== undefined ? this.mockData.legendLocked : lockedInMonth;

    this.container.innerHTML = `
      <div class="bg-surface text-on-surface font-body-md text-body-md min-h-screen relative selection:bg-primary-fixed selection:text-on-primary-fixed overflow-x-hidden">
        <!-- Background Ambient Glow Orbs -->
        <div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div class="absolute -top-12 -left-12 w-64 h-64 rounded-xl bg-surface-container-high/40 blur-2xl transform -rotate-12"></div>
          <div class="absolute top-1/3 -right-20 w-80 h-80 rounded-xl bg-surface-variant/30 blur-3xl transform rotate-45"></div>
          <div class="absolute -bottom-16 left-1/4 w-72 h-72 rounded-xl bg-surface-container-low/60 blur-2xl transform rotate-6"></div>
        </div>

        <!-- Sticky Header Navigasi -->
        <header class="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div class="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-gutter">
            <div class="flex items-center gap-space-md shrink-0">
              <img alt="BLOCKORA Logo" class="h-8 w-auto object-contain" src="/assets/icons/icon-192.png"/>
              <span class="font-headline-sm text-headline-sm tracking-tight text-on-surface uppercase">BLOCKORA</span>
            </div>
            <nav class="hidden lg:flex items-center gap-space-xs p-space-xs bg-surface-container-low/70 rounded-full" data-active-classes="bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-full">
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="blockora-gameplay-screen" href="#">Play</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="blockora-main-menu" href="#">Modes</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg bg-surface-container-high text-on-surface rounded-full transition-colors" data-path="blockora-daily-challenge" href="#">Daily Challenge</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="leaderboard" href="#">Leaderboard</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="blockora-statistics" href="#">Statistics</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="blockora-settings" href="#">Settings</a>
            </nav>
            <div class="flex items-center gap-space-sm shrink-0">
              <div class="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
                <span class="material-symbols-outlined text-tertiary text-[18px]">trophy</span>
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Best</span>
                <span class="font-label-md text-label-md text-on-surface" data-bind="header-best">${displayBest > 0 ? displayBest.toLocaleString('id-ID') : 'Belum ada'}</span>
              </div>
              <button id="daily-btn-header-sfx" class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95 cursor-pointer" type="button" aria-label="Toggle SFX">
                <span class="material-symbols-outlined text-[20px]">${isSfxMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
              <button id="daily-btn-header-bgm" class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95 cursor-pointer" type="button" aria-label="Toggle BGM">
                <span class="material-symbols-outlined text-[20px]">${isBgmMuted ? 'music_off' : 'music_note'}</span>
              </button>
              <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <main class="w-full pt-16 bg-surface">
          <div class="flex flex-col w-full">
            <div class="w-full max-w-7xl mx-auto px-margin py-space-md sm:py-space-lg flex flex-col gap-space-lg">
              
              <!-- Top Bar: Navigasi & Countdown -->
              <div class="flex flex-wrap items-center justify-between gap-gutter">
                <div class="flex items-center gap-space-sm">
                  <a id="btn-daily-back" class="group flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest hover:bg-surface-container-high transition-all active:scale-95 shadow-[0_2px_8px_rgba(15,23,42,0.04)] cursor-pointer" data-path="blockora-main-menu" href="#">
                    <span class="material-symbols-outlined text-on-surface-variant group-hover:-translate-x-0.5 transition-transform text-[18px]">arrow_back</span>
                    <span class="font-label-lg text-label-lg text-on-surface">Kembali ke Menu Utama</span>
                  </a>
                  <div class="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-high rounded-full">
                    <span class="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
                    <span class="font-label-md text-label-md text-on-surface-variant">Tantangan Aktif: <strong class="text-on-surface">${formatIndonesianDate(todayStr)}</strong></span>
                  </div>
                </div>
                <div class="flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                  <span class="material-symbols-outlined text-secondary text-[18px]">hourglass_top</span>
                  <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Reset Dalam</span>
                  <span class="font-label-lg text-label-lg text-secondary font-mono tracking-tight" id="countdown-timer">${countdownDisplay}</span>
                </div>
              </div>

              <!-- Editorial Header Section -->
              <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
                <div class="max-w-3xl space-y-space-xs">
                  <div class="flex items-center gap-space-xs">
                    <span class="px-space-sm py-0.5 bg-primary-fixed text-on-primary-fixed rounded-full font-label-sm text-label-sm uppercase tracking-wider">${seasonText}</span>
                    <span class="text-outline-variant font-label-sm">•</span>
                    <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Edisi #${editionNum}</span>
                  </div>
                  <h1 class="font-display-lg text-display-lg tracking-tight text-on-surface">Tantangan Harian</h1>
                  <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                    Selesaikan susunan teka-teki taktil unik setiap hari untuk membangun streak dan membuka lencana kalender eksklusif.
                  </p>
                </div>
                <!-- Live Global Streak Summary Chip -->
                <div class="flex items-center gap-space-md p-space-md bg-surface-container-lowest rounded-lg shadow-[0_4px_16px_rgba(15,23,42,0.04)] self-start lg:self-auto">
                  <div class="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                    <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
                  </div>
                  <div>
                    <div class="font-headline-md text-headline-md text-on-surface leading-none">${streak} Hari</div>
                    <div class="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Streak Aktif Tak Terputus</div>
                  </div>
                </div>
              </div>

              <!-- Main Content Dual-Column Layout -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                
                <!-- LEFT COLUMN: Tactile Calendar Matrix (5 Cols) -->
                <div class="lg:col-span-5 flex flex-col gap-space-md">
                  <div class="bg-surface-container-lowest rounded-lg p-space-lg shadow-[0_4px_24px_rgba(15,23,42,0.04)] flex flex-col gap-space-md">
                    <!-- Month Control Header -->
                    <div class="flex items-center justify-between pb-space-sm">
                      <div>
                        <h2 class="font-headline-md text-headline-md text-on-surface">${formatMonthYear(this.currentYear, this.currentMonth)}</h2>
                        <span class="font-label-sm text-label-sm text-tertiary-container font-semibold uppercase tracking-wider">${percentMonth}% Selesai Bulan Ini</span>
                      </div>
                      <div class="flex items-center gap-space-xs">
                        <button id="cal-prev-btn" aria-label="Bulan sebelumnya" class="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors active:scale-90 cursor-pointer" type="button">
                          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button id="cal-next-btn" aria-label="Bulan berikutnya" class="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors active:scale-90 cursor-pointer" type="button">
                          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      </div>
                    </div>
                    <!-- Calendar Days of Week Header -->
                    <div class="grid grid-cols-7 text-center gap-1">
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Min</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Sen</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Sel</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Rab</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Kam</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Jum</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Sab</span>
                    </div>
                    <!-- Tactile Calendar Tiles Grid -->
                    <div class="grid grid-cols-7 gap-1.5 p-1 bg-surface-container-low/60 rounded-xl" style="box-shadow: inset 0 2px 4px rgba(15,23,42,0.04);">
                      ${calendarMarkup}
                    </div>
                    <!-- Calendar Visual Legend -->
                    <div class="flex flex-wrap items-center justify-between gap-space-xs pt-space-xs">
                      <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-full bg-tertiary-container"></span>
                        <span class="font-label-sm text-label-sm text-on-surface-variant">Selesai (${legendCompletedCount})</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-full bg-primary-container"></span>
                        <span class="font-label-sm text-label-sm text-on-surface font-bold">Hari Ini (${legendTodayDay})</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-full bg-outline-variant"></span>
                        <span class="font-label-sm text-label-sm text-on-surface-variant">Terlewat (${legendMissedCount})</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-full bg-surface-container"></span>
                        <span class="font-label-sm text-label-sm text-on-surface-variant">Terkunci (${legendLockedCount})</span>
                      </div>
                    </div>
                  </div>
                  <!-- Monthly Milestone Badge Banner -->
                  <div class="bg-surface-container-high/60 rounded-lg p-space-md flex items-center justify-between gap-space-md">
                    <div class="flex items-center gap-space-sm">
                      <div class="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                        <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">military_tech</span>
                      </div>
                      <div>
                        <div class="font-headline-sm text-headline-sm text-on-surface">Piala Kalender ${monthCal.monthName}</div>
                        <div class="font-body-sm text-body-sm text-on-surface-variant">Selesaikan tantangan untuk membuka lencana master.</div>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="font-headline-sm text-headline-sm text-primary">${milestoneRatio}</span>
                    </div>
                  </div>
                </div>

                <!-- RIGHT COLUMN: Today's Mission & Progression Deck (7 Cols) -->
                <div class="lg:col-span-7 flex flex-col gap-space-lg">
                  <!-- Mission Master Card -->
                  <div class="bg-surface-container-lowest rounded-lg p-space-lg shadow-[0_8px_32px_rgba(15,23,42,0.06)] flex flex-col gap-space-lg relative overflow-hidden">
                    <!-- Decorative blur -->
                    <div class="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none"></div>
                    <!-- Mission Header & Status Badge -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm">
                      <div class="space-y-1">
                        <div class="flex items-center gap-space-xs">
                          <span class="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                          <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Tantangan Harian #${editionNum}</span>
                        </div>
                        <h2 class="font-headline-lg text-headline-lg text-on-surface">${missionConfig.themeName}</h2>
                      </div>
                      <div class="flex items-center gap-space-xs self-start sm:self-auto">
                        ${isCompleted ? `
                          <span class="px-space-md py-space-xs rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <span class="w-2 h-2 rounded-full bg-tertiary-container"></span>
                            Selesai (3/3)
                          </span>
                        ` : `
                          <span class="px-space-md py-space-xs rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <span class="w-2 h-2 rounded-full bg-secondary"></span>
                            Belum Selesai (${targetsDone}/3)
                          </span>
                        `}
                      </div>
                    </div>
                    <!-- Cumulative Progress Bar -->
                    <div class="space-y-space-xs">
                      <div class="flex justify-between items-baseline">
                        <span class="font-label-md text-label-md text-on-surface-variant">Kemajuan ${isToday ? 'Hari Ini' : formatIndonesianDate(this.selectedDateKey)}</span>
                        <span class="font-label-lg text-label-lg text-primary">${targetsDone} dari 3 Target Selesai (${progressPercent}%)</span>
                      </div>
                      <div class="w-full h-3 rounded-full bg-surface-container-high overflow-hidden relative">
                        <div class="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-700 ease-out" style="width: ${progressPercent}%;"></div>
                      </div>
                    </div>
                    <!-- Three Distinct Tactile Mission Tasks -->
                    <div class="flex flex-col gap-space-sm">
                      ${targetsMarkup}
                    </div>
                    <!-- Reward Spotlight Box -->
                    <div class="p-space-md rounded-2xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md">
                      <div class="flex items-center gap-space-md">
                        <!-- Physical Tactile Block Skin Preview -->
                        <div class="w-16 h-16 rounded-2xl bg-surface-container-lowest p-2 shadow-[0_4px_12px_rgba(15,23,42,0.06)] flex items-center justify-center relative shrink-0">
                          <div class="grid grid-cols-2 gap-1 w-full h-full">
                            <div class="rounded-md bg-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
                            <div class="rounded-md bg-secondary shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
                            <div class="rounded-md bg-tertiary-fixed-dim shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
                            <div class="rounded-md bg-primary-container shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
                          </div>
                          <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-container text-on-secondary flex items-center justify-center shadow-sm">
                            <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
                          </div>
                        </div>
                        <div class="space-y-0.5 text-center sm:text-left">
                          <div class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Hadiah Penyelesaian Hari Ini</div>
                          <div class="font-headline-sm text-headline-sm text-on-surface">Skin Eksklusif: "Prism Arctic"</div>
                          <div class="font-body-sm text-body-sm text-on-surface-variant">+250 Poin Streak &amp; Lencana Emas Kalender</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
                        <span class="material-symbols-outlined text-outline text-[18px]">lock</span>
                        <span class="font-label-md text-label-md text-on-surface-variant font-semibold">Segera</span>
                      </div>
                    </div>
                    <!-- Primary Interactive CTA Button with Physical Tactile Bevel -->
                    <div class="pt-space-xs">
                      ${isFuture ? `
                        <button disabled class="w-full h-14 rounded-full bg-surface-container-high text-on-surface-variant font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-space-sm opacity-50 cursor-not-allowed">
                          <span class="material-symbols-outlined text-[24px]">lock</span>
                          <span>Tantangan Terkunci</span>
                        </button>
                      ` : isCompleted ? `
                        <button id="btn-start-daily" class="w-full h-14 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_0_#1d4ed8] active:translate-y-[3px] active:shadow-[0_1px_0_#1d4ed8] transition-all cursor-pointer">
                          <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">replay</span>
                          <span>Main Latihan</span>
                          <span class="ml-space-xs px-2.5 py-0.5 rounded-full bg-white/20 font-label-sm text-label-sm tracking-normal normal-case">Tuntas</span>
                        </button>
                        <p class="text-center font-body-sm text-body-sm text-on-surface-variant mt-2">
                          *Misi harian telah selesai. Main latihan tidak mengubah streak atau rekor harian.
                        </p>
                      ` : `
                        <button id="btn-start-daily" class="w-full h-14 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_0_#1d4ed8] active:translate-y-[3px] active:shadow-[0_1px_0_#1d4ed8] transition-all cursor-pointer">
                          <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                          <span>${ctaText}</span>
                          <span class="ml-space-xs px-2.5 py-0.5 rounded-full bg-white/20 font-label-sm text-label-sm tracking-normal normal-case">${ctaSub}</span>
                        </button>
                      `}
                    </div>
                  </div>

                  <!-- Additional Mini Tips & Community Activity Bento Strip -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex items-start gap-space-sm">
                      <div class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                        <span class="material-symbols-outlined text-[20px]">lightbulb</span>
                      </div>
                      <div class="space-y-0.5">
                        <div class="font-headline-sm text-headline-sm text-on-surface">Tips Taktil</div>
                        <p class="font-body-sm text-body-sm text-on-surface-variant">
                          ${dailyTip}
                        </p>
                      </div>
                    </div>
                    <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex items-start gap-space-sm">
                      <div class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-tertiary-container shrink-0">
                        <span class="material-symbols-outlined text-[20px]">trophy</span>
                      </div>
                      <div class="space-y-0.5">
                        <div class="font-headline-sm text-headline-sm text-on-surface">${statTitle}</div>
                        <p class="font-body-sm text-body-sm text-on-surface-variant">
                          <strong class="text-on-surface font-semibold">${statBold}</strong> ${statDesc}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </main>

        <!-- Footer -->
        <footer class="w-full bg-surface-container-low/60 mt-space-xl py-space-lg">
          <div class="max-w-7xl mx-auto px-margin flex flex-col sm:flex-row items-center justify-between gap-space-md text-center sm:text-left">
            <div class="flex items-center gap-space-sm">
              <span class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">BLOCKORA Minimalist Tactile Puzzle</span>
            </div>
            <div class="font-body-sm text-body-sm text-on-surface-variant">© 2025 BLOCKORA Studio. Crafted for focus &amp; flow.</div>
          </div>
        </footer>
      </div>
    `;

    this.bindEvents();
  }

  buildCalendarMarkup({ monthCal, todayStr, allRecords, selectedDateKey }) {
    let markup = '';

    // Hitung offset hari sebelum tanggal 1
    const prevMonthDaysCount = new Date(this.currentYear, this.currentMonth, 0).getDate();
    const firstDayIndex = monthCal.firstDayOfWeek; // 0: Min, 1: Sen, dst.

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevNum = prevMonthDaysCount - i;
      markup += `<div class="aspect-square opacity-20 flex items-center justify-center font-label-md text-label-md text-on-surface-variant">${prevNum}</div>`;
    }

    // Hari-hari dalam bulan aktif
    monthCal.days.forEach(day => {
      const rec = allRecords[day.dateKey];
      const diff = daysBetween(todayStr, day.dateKey);
      const isDayToday = diff === 0;
      const isDayFuture = diff > 0;
      const isDayCompleted = rec && rec.completed;
      const isSelected = day.dateKey === selectedDateKey;

      if (isDayToday) {
        markup += `
          <button type="button" data-date="${day.dateKey}" class="aspect-square rounded-full bg-primary-container text-on-primary flex flex-col items-center justify-center relative shadow-[0_8px_16px_rgba(37,99,235,0.35)] scale-110 z-10 ring-4 ring-primary-fixed cursor-pointer transition-transform hover:scale-115">
            <span class="font-label-lg text-label-lg font-extrabold">${day.dayNumber}</span>
            ${isDayCompleted ? `
              <span class="material-symbols-outlined text-surface-bright text-[12px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            ` : `
              <span class="w-1.5 h-1.5 rounded-full bg-surface-bright animate-ping"></span>
            `}
          </button>
        `;
      } else if (isDayCompleted) {
        markup += `
          <button type="button" data-date="${day.dateKey}" class="aspect-square rounded-full bg-surface-container-lowest flex flex-col items-center justify-center relative shadow-[0_2px_4px_rgba(15,23,42,0.04)] group cursor-pointer hover:scale-105 transition-transform ${isSelected ? 'ring-2 ring-primary' : ''}">
            <span class="font-label-sm text-label-sm text-on-surface-variant">${day.dayNumber}</span>
            <span class="material-symbols-outlined text-tertiary-container text-[12px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          </button>
        `;
      } else if (isDayFuture) {
        markup += `
          <div class="aspect-square rounded-full bg-surface-container-low/70 flex flex-col items-center justify-center opacity-40">
            <span class="font-label-sm text-label-sm text-on-surface-variant">${day.dayNumber}</span>
            <span class="material-symbols-outlined text-[10px]">lock</span>
          </div>
        `;
      } else {
        // Terlewat / belum selesai
        markup += `
          <button type="button" data-date="${day.dateKey}" class="aspect-square rounded-full bg-surface-container flex flex-col items-center justify-center opacity-60 cursor-pointer hover:opacity-100 transition-opacity ${isSelected ? 'ring-2 ring-primary' : ''}">
            <span class="font-label-sm text-label-sm text-on-surface-variant">${day.dayNumber}</span>
            <span class="material-symbols-outlined text-outline text-[12px]">remove</span>
          </button>
        `;
      }
    });

    // Trailing blanks to complete 35 or 42 slots (standard 7 columns)
    const totalRendered = firstDayIndex + monthCal.totalDays;
    const totalSlots = totalRendered > 35 ? 42 : 35;
    const trailingSlots = totalSlots - totalRendered;

    for (let i = 1; i <= trailingSlots; i++) {
      markup += `<div class="aspect-square opacity-20 flex items-center justify-center font-label-md text-label-md text-on-surface-variant">${i}</div>`;
    }

    return markup;
  }

  buildTargetsMarkup({ targets, selectedRecord, isCompleted }) {
    return targets.map((t, idx) => {
      let done = isCompleted;
      if (!done && selectedRecord.targetsDone > idx) {
        done = true;
      }

      // Deskripsi edukatif sesuai tipe
      let desc = t.description || '';
      if (!desc) {
        if (t.type === 'score') {
          desc = `Kumpulkan minimal ${t.target.toLocaleString('id-ID')} poin dari penempatan balok dan penghapusan baris.`;
        } else if (t.type === 'lines') {
          desc = `Hancurkan total ${t.target} baris atau kolom horizontal maupun vertikal.`;
        } else if (t.type === 'combo') {
          desc = `Pertahankan kombo penghapusan garis beruntun hingga mencapai minimal x${t.target}.`;
        } else if (t.type === 'multi_line') {
          desc = `Hapus 2 baris atau lebih sekaligus dalam satu langkah penempatan sebanyak ${t.target} kali.`;
        }
      }

      const currentValText = t.currentValText || (done ? `${t.target} / ${t.target} Selesai` : `0 / ${t.target} Aktif`);

      if (done) {
        return `
          <div class="p-space-md rounded-2xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors flex items-center justify-between gap-space-md">
            <div class="flex items-start gap-space-md">
              <div class="w-9 h-9 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">check</span>
              </div>
              <div class="space-y-0.5">
                <div class="font-headline-sm text-headline-sm text-on-surface line-through decoration-tertiary-container decoration-2 opacity-80">
                  ${t.label}
                </div>
                <p class="font-body-sm text-body-sm text-on-surface-variant">
                  ${desc}
                </p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="font-label-md text-label-md text-tertiary-container font-bold">${currentValText}</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="p-space-md rounded-2xl bg-surface-container-high/40 hover:bg-surface-container-high/70 transition-colors flex items-center justify-between gap-space-md ring-2 ring-primary/20">
          <div class="flex items-start gap-space-md">
            <div class="w-9 h-9 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_4px_rgba(15,23,42,0.06)]">
              <span class="material-symbols-outlined text-[20px]">radio_button_unchecked</span>
            </div>
            <div class="space-y-0.5">
              <div class="font-headline-sm text-headline-sm text-on-surface font-bold">
                ${t.label}
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant">
                ${desc}
              </p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="font-label-md text-label-md text-secondary font-bold">${currentValText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  bindEvents() {
    if (!this.container) return;

    // Tombol Kembali
    const backBtn = this.container.querySelector('#btn-daily-back');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.onBack();
      });
    }

    // Navigasi link navbar
    const navLinks = this.container.querySelectorAll('nav a[data-path]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.getAttribute('data-path');
        if (path === 'blockora-main-menu') {
          this.onBack();
        }
      });
    });

    // Navigasi Bulan Kalender
    const prevBtn = this.container.querySelector('#cal-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentMonth--;
        if (this.currentMonth < 0) {
          this.currentMonth = 11;
          this.currentYear--;
        }
        this.render();
      });
    }

    const nextBtn = this.container.querySelector('#cal-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentMonth++;
        if (this.currentMonth > 11) {
          this.currentMonth = 0;
          this.currentYear++;
        }
        this.render();
      });
    }

    // Klik Tanggal Kalender
    const dateButtons = this.container.querySelectorAll('button[data-date]');
    dateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.getAttribute('data-date');
        if (date && date !== this.selectedDateKey) {
          this.selectedDateKey = date;
          this.render();
        }
      });
    });

    // Tombol Mulai / Lanjutkan / Main Latihan
    const startBtn = this.container.querySelector('#btn-start-daily');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.onStartChallenge(this.selectedDateKey);
      });
    }

    // Audio SFX & BGM toggle in header
    const sfxBtn = this.container.querySelector('#daily-btn-header-sfx');
    if (sfxBtn) {
      sfxBtn.addEventListener('click', () => {
        audioManager.toggleSfxMute();
        const icon = sfxBtn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = audioManager.isSfxMuted ? 'volume_off' : 'volume_up';
        }
      });
    }

    const bgmBtn = this.container.querySelector('#daily-btn-header-bgm');
    if (bgmBtn) {
      bgmBtn.addEventListener('click', () => {
        audioManager.toggleBgmMute();
        const icon = bgmBtn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = audioManager.isBgmMuted ? 'music_off' : 'music_note';
        }
      });
    }

    // Unified Header Navigation
    bindHeaderNav(this.container, 'daily');
  }
}
