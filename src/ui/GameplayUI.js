/**
 * GameplayUI.js - Layar Permainan (Gameplay Screen) untuk BLOCKORA.
 *
 * Implementasi "Wiring Only" berdasarkan markup asli Stitch: design/stitch/gameplay.html.
 * Menggunakan Tailwind v3 lokal, font Plus Jakarta Sans, dan Material Symbols Outlined self-host.
 * Mengintegrasikan kartu papan (Phaser Canvas), Active Shape Deck, Live Mission,
 * Streak Multiplier, Zen Ambience, Peringkat Lokal, dan Architect Tip.
 */

import { StorageManager } from '../storage/StorageManager.js';
import { StatisticsManager } from '../storage/StatisticsManager.js';
import { audioManager } from '../audio/AudioManager.js';
import { HapticManager } from '../utils/HapticManager.js';
import { TACTILE_TIPS, BLOCK_COLORS, SHAPES } from '../game/constants.js';
import { bindHeaderNav } from './HeaderNav.js';

function getShapeName(shapeId) {
  if (!shapeId) return 'Block';
  if (shapeId.startsWith('dot')) return 'Single Fit';
  if (shapeId.startsWith('line_2')) return 'Line-2';
  if (shapeId.startsWith('line_3')) return 'Line-3';
  if (shapeId.startsWith('line_4')) return 'Line-4';
  if (shapeId.startsWith('line_5')) return 'Line-5';
  if (shapeId.startsWith('square_2')) return 'Square-2';
  if (shapeId.startsWith('square_3')) return 'Square-3';
  if (shapeId.startsWith('corner') || shapeId.startsWith('l_')) return 'L-Piece';
  if (shapeId.startsWith('t_')) return 'T-Piece';
  if (shapeId.startsWith('z_') || shapeId.startsWith('s_')) return 'Z-Piece';
  return 'Block';
}

function getColorBgClass(colorId) {
  switch (colorId) {
    case 1: return 'bg-primary-container';
    case 2: return 'bg-secondary-container';
    case 3: return 'bg-tertiary-container';
    case 4: return 'bg-amber-500';
    case 5: return 'bg-violet-500';
    default: return 'bg-primary-container';
  }
}

export class GameplayUI {
  /**
   * @param {Object} options
   * @param {Function} options.onBack
   * @param {Function} options.onRestart
   * @param {Function} options.onPause
   */
  constructor({ onBack, onRestart, onPause } = {}) {
    this.onBack = onBack || (() => {});
    this.onRestart = onRestart || (() => {});
    this.onPause = onPause || (() => {});

    this.container = null;
    this.mode = 'classic';
    this.dateKey = null;

    this.isMockMode = false;
    this.mockData = null;

    this.currentScore = 0;
    this.currentCombo = 0;
    this.emptyCellsCount = 100;
    this.deckSlots = [null, null, null];
    this.activeDragSlot = null;

    this.dragGhostEl = null;
    this.onMoveHandler = null;
    this.onUpHandler = null;
    this.gameScene = null;

    // State optimasi drag 60 FPS
    this.isDraggingActive = false;
    this.activeDragBlock = null;
    this.activeDragSlot = null;
    this.dragHalfCols = 0;
    this.dragHalfRows = 0;
    this.lastHoverRow = null;
    this.lastHoverCol = null;

    this.boardLeft = 0;
    this.boardTop = 0;
    this.boardWidth = 0;
    this.boardHeight = 0;
    this.cachedCellStep = 0;

    this.latestPointerX = 0;
    this.latestPointerY = 0;
    this.latestPointerIsTouch = false;

    this.onDragFrame = this.handleDragFrameTick.bind(this);
    this._onPointerMoveBound = this.handleDragMove.bind(this);
    this._onPointerUpBound = this.handleDragUp.bind(this);
  }

  /**
   * Tampilkan layar Gameplay
   * @param {HTMLElement} targetElement
   * @param {Object} [options={}]
   */
  async show(targetElement, options = {}) {
    this.container = targetElement;
    this.isMockMode = Boolean(options && (options.isMock || options.mockData || options.roomText || options.headerBest !== undefined));
    this.mockData = this.isMockMode ? (options.mockData || options) : null;
    this.mode = options?.mode || 'classic';
    this.dateKey = options?.dateKey || null;

    if (this.isMockMode && this.mockData) {
      this.currentScore = this.mockData.score ?? 14820;
      this.currentCombo = this.mockData.combo ?? 3;
    } else {
      this.currentScore = 0;
      this.currentCombo = 0;
      this.emptyCellsCount = 100;
      this.deckSlots = [null, null, null];
    }

    this.render();
    this.container.classList.add('active');
  }

  hide() {
    this.cleanDragListeners();
    if (this.container) {
      this.container.classList.remove('active');
      this.container.innerHTML = '';
    }
  }

  setGameScene(scene) {
    this.gameScene = scene;
    if (this.container) {
      this.attachGameScene(scene);
    }
  }

  render() {
    if (!this.container) return;

    const isMock = this.isMockMode && this.mockData;

    // Header info
    const bestClassic = StorageManager.getBestScore('classic');
    const bestTime = StorageManager.getBestScore('time');
    const bestDaily = StorageManager.getBestScore('daily');
    const allBest = Math.max(bestClassic, bestTime, bestDaily);
    const headerBest = isMock && this.mockData.headerBest !== undefined ? this.mockData.headerBest : allBest;

    // Mode label & session number
    let modeText = 'CLASSIC CASCADE';
    if (this.mode === 'time') modeText = 'TIME ATTACK';
    else if (this.mode === 'daily') modeText = 'DAILY CHALLENGE';
    if (isMock && this.mockData.modeText) modeText = this.mockData.modeText;

    const sessionNum = isMock && this.mockData.roomText ? this.mockData.roomText : `SESI #${StorageManager.getTotalGamesPlayed() + 1}`;
    const timerDisplay = isMock && this.mockData.timerDisplay ? this.mockData.timerDisplay : (this.mode === 'time' ? '02:00' : '00:00');

    // Score & combo
    const scoreFormatted = (isMock && this.mockData.score !== undefined ? this.mockData.score : this.currentScore).toLocaleString('id-ID');
    const comboLevel = isMock && this.mockData.combo !== undefined ? this.mockData.combo : this.currentCombo;
    const comboBadgeText = isMock && this.mockData.comboBadgeText ? this.mockData.comboBadgeText : `x${comboLevel} COMBO!`;

    // Live Mission (Left Panel)
    let missionTitle = 'Clear 3 Rows at Once';
    let missionDesc = 'Align horizontal or vertical strips to activate cascade shockwave.';
    let missionReward = '+1,200 PTS';
    let missionProgText = 'Current: 2/3 rows';
    let missionPercent = 66;

    if (!isMock) {
      if (this.mode === 'daily') {
        missionTitle = 'Misi Harian';
        missionDesc = 'Selesaikan 3 target untuk menyelesaikan tantangan hari ini.';
        missionReward = '+500 PTS';
        missionProgText = '0/3 Target';
        missionPercent = 0;
      } else {
        const targetRecord = this.mode === 'time' ? bestTime : bestClassic;
        if (targetRecord > 0) {
          missionTitle = 'Kalahkan Rekor Pribadi';
          missionDesc = `Capai skor melampaui ${targetRecord.toLocaleString('id-ID')} poin.`;
          missionReward = 'REKOR BARU';
          const pct = Math.min(100, Math.round((this.currentScore / targetRecord) * 100));
          missionProgText = `${this.currentScore.toLocaleString('id-ID')} / ${targetRecord.toLocaleString('id-ID')}`;
          missionPercent = pct;
        } else {
          missionTitle = 'Cetak Rekor Pertama';
          missionDesc = 'Raih skor setinggi mungkin untuk mencatat rekor pribadimu.';
          missionReward = 'REKOR BARU';
          missionProgText = `${this.currentScore.toLocaleString('id-ID')} Poin`;
          missionPercent = this.currentScore > 0 ? 100 : 0;
        }
      }
    } else {
      if (this.mockData.missionTitle) missionTitle = this.mockData.missionTitle;
      if (this.mockData.missionDesc) missionDesc = this.mockData.missionDesc;
      if (this.mockData.missionReward) missionReward = this.mockData.missionReward;
      if (this.mockData.missionProgText) missionProgText = this.mockData.missionProgText;
      if (this.mockData.missionPercent !== undefined) missionPercent = this.mockData.missionPercent;
    }

    // Zen Ambience
    const isBgmMuted = audioManager?.isBgmMuted ?? false;
    const isSfxMuted = audioManager?.isSfxMuted ?? false;
    const zenTitle = isMock && this.mockData.zenTitle ? this.mockData.zenTitle : 'Ambient Generatif';
    const zenSub = isMock && this.mockData.zenSub ? this.mockData.zenSub : (isBgmMuted ? 'Musik Hening' : 'Fokus & Alir');

    // Haptics setting
    const hapticMode = HapticManager.getMode();
    const hapticLabel = hapticMode === 'off' ? 'Nonaktif' : (hapticMode.charAt(0).toUpperCase() + hapticMode.slice(1));

    // Architect tip
    const randomTip = TACTILE_TIPS[0];
    const tipText = isMock && this.mockData.tipText ? this.mockData.tipText : randomTip;

    // Deck slots markup
    const deckMarkup = this.buildDeckSlotsMarkup(isMock);

    // Empty cells count
    const emptyCells = isMock && this.mockData.emptyCells !== undefined ? this.mockData.emptyCells : this.emptyCellsCount;

    // Peringkat Lokal (Right Panel)
    const localRankMarkup = this.buildLocalRankMarkup(isMock);

    this.container.innerHTML = `
      <div class="bg-surface text-on-surface font-body-md text-body-md min-h-screen relative selection:bg-primary-fixed selection:text-on-primary-fixed overflow-x-hidden">
        <!-- Ambient Blur Glows (Hanya aktif di desktop untuk menghemat GPU/baterai HP) -->
        <div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden hidden lg:block">
          <div class="absolute -top-12 -left-12 w-64 h-64 rounded-xl bg-surface-container-high/40 blur-2xl transform -rotate-12"></div>
          <div class="absolute top-1/3 -right-20 w-80 h-80 rounded-xl bg-surface-variant/30 blur-3xl transform rotate-45"></div>
          <div class="absolute -bottom-16 left-1/4 w-72 h-72 rounded-xl bg-surface-container-low/60 blur-2xl transform rotate-6"></div>
        </div>

        <!-- Sticky Header Navigasi -->
        <header class="fixed top-0 w-full z-50 bg-surface lg:bg-surface/85 lg:backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div class="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-gutter">
            <div class="flex items-center gap-space-md">
              <img alt="BLOCKORA Logo" class="h-8 w-auto object-contain" src="/assets/icons/icon-192.png"/>
              <span class="font-headline-sm text-headline-sm tracking-tight text-on-surface uppercase">BLOCKORA</span>
            </div>
            <nav class="hidden md:flex items-center gap-space-xs p-space-xs bg-surface-container-low/70 rounded-full" data-active-classes="bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-full">
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg bg-surface-container-high text-on-surface rounded-full transition-colors" data-path="play" href="#">Play</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="modes" href="#">Modes</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="leaderboard" href="#">Leaderboard</a>
              <a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="how-to-play" href="#">Rules</a>
            </nav>
            <div class="flex items-center gap-space-sm">
              <div class="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
                <span class="material-symbols-outlined text-tertiary text-[18px]">trophy</span>
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Best</span>
                <span class="font-label-md text-label-md text-on-surface" data-bind="header-best">${headerBest > 0 ? headerBest.toLocaleString('id-ID') : 'Belum ada'}</span>
              </div>
              <button id="btn-toggle-sfx-header" class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95 cursor-pointer" type="button" aria-label="Toggle SFX">
                <span class="material-symbols-outlined text-[20px]">${isSfxMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
              <button id="btn-toggle-bgm-header" class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95 cursor-pointer" type="button" aria-label="Toggle BGM">
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
            <div class="max-w-7xl mx-auto w-full px-margin py-space-md">
              
              <!-- Top HUD / Mode and Controls Bar -->
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
                <div class="flex items-center gap-space-sm flex-wrap">
                  <button id="btn-gameplay-back" class="w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_12px_rgba(15,23,42,0.06),0_2px_0_rgba(15,23,42,0.08)] hover:bg-surface-container flex items-center justify-center transition-all active:translate-y-0.5 active:shadow-[0_1px_2px_rgba(15,23,42,0.06)] cursor-pointer" type="button" aria-label="Kembali ke Menu">
                    <span class="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                  <div class="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_4px_12px_rgba(15,23,42,0.05),0_2px_0_rgba(15,23,42,0.06)]">
                    <span class="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
                    <span class="font-label-sm text-label-sm uppercase tracking-wider text-tertiary" id="gameplay-mode-label">${modeText}</span>
                    <span class="font-label-md text-label-md text-on-surface-variant ml-space-xs" id="gameplay-room-label">${sessionNum}</span>
                  </div>
                  <div class="flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-high/60 rounded-full">
                    <span class="material-symbols-outlined text-primary text-[18px]">timer</span>
                    <span class="font-label-lg text-label-lg text-on-surface" id="countdown-timer">${timerDisplay}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between sm:justify-end gap-space-md">
                  <!-- Main Score Counter Display -->
                  <div class="flex items-baseline gap-space-sm">
                    <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Score</span>
                    <span class="font-display-lg text-display-lg text-primary tracking-tight font-extrabold" id="main-score">${scoreFormatted}</span>
                    <span id="gameplay-combo-badge" class="px-space-sm py-0.5 bg-secondary text-on-secondary rounded-full font-label-sm text-label-sm ${comboLevel >= 2 ? 'animate-bounce shadow-sm' : 'opacity-0'}">${comboBadgeText}</span>
                  </div>
                  <div class="flex items-center gap-space-xs">
                    <button id="btn-gameplay-pause" class="w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_12px_rgba(15,23,42,0.06),0_2px_0_rgba(15,23,42,0.08)] hover:bg-surface-container flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer" type="button" aria-label="Pause">
                      <span class="material-symbols-outlined text-[20px]">pause</span>
                    </button>
                    <button id="btn-gameplay-restart" class="w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_12px_rgba(15,23,42,0.06),0_2px_0_rgba(15,23,42,0.08)] hover:bg-surface-container flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer" type="button" aria-label="Restart">
                      <span class="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Main Game Desktop Layout (3-Column Architecture) -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                
                <!-- LEFT SIDEBAR: Quest, Streak, Combo Gauge (Hidden di HP, aktif di desktop lg:) -->
                <div class="hidden lg:flex lg:col-span-3 flex-col gap-space-md order-2 lg:order-1">
                  <!-- Objective Card -->
                  <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-[0_4px_16px_rgba(15,23,42,0.04),0_2px_0_rgba(15,23,42,0.04)] relative overflow-hidden">
                    <div class="absolute -right-4 -top-4 w-20 h-20 bg-surface-variant/40 rounded-full blur-xl pointer-events-none"></div>
                    <div class="flex items-center justify-between mb-space-sm">
                      <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Live Mission</span>
                      <span class="font-label-md text-label-md text-tertiary font-bold" id="mission-reward-chip">${missionReward}</span>
                    </div>
                    <p class="font-headline-sm text-headline-sm text-on-surface mb-space-xs" id="mission-title">${missionTitle}</p>
                    <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-md" id="mission-desc">${missionDesc}</p>
                    <!-- Mission Progress Track -->
                    <div class="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden relative">
                      <div id="mission-progress-bar" class="bg-gradient-to-r from-tertiary to-primary-container h-full rounded-full transition-all duration-500 shadow-sm" style="width: ${missionPercent}%;"></div>
                    </div>
                    <div class="flex justify-between items-center mt-space-xs">
                      <span class="font-label-sm text-label-sm text-on-surface-variant" id="mission-progress-text">${missionProgText}</span>
                      <span class="font-label-sm text-label-sm text-primary font-bold" id="mission-progress-percent">${missionPercent}%</span>
                    </div>
                  </div>

                  <!-- Combo Streak Meter Card -->
                  <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-[0_4px_16px_rgba(15,23,42,0.04),0_2px_0_rgba(15,23,42,0.04)]">
                    <div class="flex items-center justify-between mb-space-sm">
                      <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Streak Multiplier</span>
                      <div class="flex items-center gap-space-xs text-secondary font-headline-sm">
                        <span class="material-symbols-outlined text-[18px]">local_fire_department</span>
                        <span id="streak-multiplier-label">x${Math.max(1, comboLevel)}</span>
                      </div>
                    </div>
                    <div class="grid grid-cols-5 gap-space-xs my-space-sm" id="streak-multiplier-boxes">
                      ${this.buildStreakBoxes(comboLevel)}
                    </div>
                    <p class="font-body-sm text-body-sm text-on-surface-variant mt-space-xs" id="streak-tip-text">
                      ${comboLevel >= 3 ? 'Pertahankan penempatan beruntun untuk bonus maksimal!' : 'Tempatkan balok terencana untuk melipatgandakan poin combo.'}
                    </p>
                  </div>

                  <!-- Visual Art Thumbnail Pill -->
                  <div class="bg-surface-container-low rounded-lg p-space-md flex items-center gap-space-md shadow-sm">
                    <img class="w-14 h-14 rounded-md object-cover shadow-inner flex-shrink-0" src="/assets/icons/icon-192.png" alt="Zen Ambience"/>
                    <div class="min-w-0">
                      <span class="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">Zen Ambience</span>
                      <span class="font-headline-sm text-headline-sm text-on-surface block truncate" id="zen-ambience-title">${zenTitle}</span>
                      <span class="font-body-sm text-body-sm text-tertiary" id="zen-ambience-subtitle">${zenSub}</span>
                    </div>
                  </div>
                </div>

                <!-- CENTER: 10x10 Puzzle Grid Canvas & Deck -->
                <div class="w-full lg:col-span-6 flex flex-col items-center order-1 lg:order-2">
                  <!-- Puzzle Grid Surround Frame -->
                  <div class="w-full max-w-[500px] bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm lg:shadow-[0_16px_36px_rgba(15,23,42,0.06),0_2px_0_rgba(15,23,42,0.06)] relative">
                    <!-- Board Surface Recessed Well -->
                    <div class="bg-surface-container p-space-xs rounded-lg shadow-[inset_0_2px_5px_rgba(15,23,42,0.08),inset_0_0_0_1px_rgba(15,23,42,0.04)]">
                      <!-- 10x10 Tile Grid Wadah Kanvas Phaser -->
                      <div class="aspect-square w-full select-none relative overflow-hidden rounded-md flex items-center justify-center" id="blockora-board">
                        <!-- Phaser Canvas / Grid sits here -->
                        ${isMock ? this.buildMockupBoardGrid() : ''}
                      </div>
                    </div>
                    <!-- Bottom Grid Sub-Meta Status -->
                    <div class="flex items-center justify-between mt-space-md pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
                      <span class="flex items-center gap-space-xs">
                        <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        <span id="empty-cells-count">${emptyCells} Empty Cells Available</span>
                      </span>
                      <span class="uppercase tracking-wider">Drag to place</span>
                    </div>
                  </div>

                  <!-- Draggable Block Tray / Dock Section -->
                  <div class="w-full max-w-[500px] mt-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm lg:shadow-[0_8px_24px_rgba(15,23,42,0.05),0_2px_0_rgba(15,23,42,0.06)]">
                    <div class="flex items-center justify-between mb-space-sm">
                      <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Active Shape Deck</span>
                      <!-- Quick Assist Boosters -->
                      <div class="flex items-center gap-space-xs">
                        <button disabled class="px-space-sm py-1 rounded-full bg-surface-container-low text-on-surface-variant/40 flex items-center gap-1 text-label-sm font-label-sm opacity-60 cursor-not-allowed" title="Segera" type="button">
                          <span class="material-symbols-outlined text-[14px]">rotate_right</span>
                          <span>Rotate</span>
                        </button>
                        <button disabled class="px-space-sm py-1 rounded-full bg-surface-container-low text-on-surface-variant/40 flex items-center gap-1 text-label-sm font-label-sm opacity-60 cursor-not-allowed" title="Segera" type="button">
                          <span class="material-symbols-outlined text-[14px]">sync</span>
                          <span>Swap <strong class="font-bold">(0)</strong></span>
                        </button>
                      </div>
                    </div>
                    <!-- 3-Block Spawner Slots -->
                    <div class="grid grid-cols-3 gap-space-sm items-center justify-items-center min-h-[108px] bg-surface-container-low/70 rounded-lg p-space-sm" id="gameplay-deck-slots">
                      ${deckMarkup}
                    </div>
                    <!-- Bottom Action Buttons: Undo & Zen Rest -->
                    <div class="flex items-center justify-between mt-space-sm pt-space-xs">
                      <button disabled class="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant/40 opacity-60 cursor-not-allowed" type="button">
                        <span class="material-symbols-outlined text-[18px]">undo</span>
                        <span>Undo Last (Segera)</span>
                      </button>
                      <div class="flex items-center gap-space-xs">
                        <span class="w-2 h-2 rounded-full ${hapticMode !== 'off' ? 'bg-tertiary' : 'bg-outline'}"></span>
                        <span class="font-label-sm text-label-sm text-on-surface-variant">Haptics: ${hapticLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- RIGHT SIDEBAR: Live Leaderboard, Tips, Zen Audio (Hidden di HP, aktif di desktop lg:) -->
                <div class="hidden lg:flex lg:col-span-3 flex-col gap-space-md order-3">
                  <!-- High Score Benchmark Card -->
                  <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-[0_4px_16px_rgba(15,23,42,0.04),0_2px_0_rgba(15,23,42,0.04)]">
                    <div class="flex items-center justify-between mb-space-sm">
                      <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">${isMock ? 'Global Standings' : 'Peringkat Lokal'}</span>
                      <span class="px-2 py-0.5 rounded-full ${isMock ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'} font-label-sm text-label-sm font-bold">${isMock ? 'TOP 5%' : 'LOKAL'}</span>
                    </div>
                    <div class="flex items-baseline gap-space-xs mb-space-sm">
                      <span class="font-display-lg-mobile text-display-lg-mobile font-bold text-on-surface" id="local-rank-number">${isMock ? '#8' : '#1'}</span>
                      <span class="font-body-sm text-body-sm text-on-surface-variant" id="local-rank-total">${isMock ? 'of 14,290 players' : 'Rekor Tersimpan'}</span>
                    </div>
                    <!-- Leaderboard Micro-Ranking List -->
                    <div class="flex flex-col gap-space-xs pt-space-xs" id="local-ranking-list">
                      ${localRankMarkup}
                    </div>
                  </div>

                  <!-- Strategy Insight Tip Card -->
                  <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-[0_4px_16px_rgba(15,23,42,0.04),0_2px_0_rgba(15,23,42,0.04)] relative">
                    <div class="flex items-center gap-space-xs text-primary mb-space-xs">
                      <span class="material-symbols-outlined text-[18px]">lightbulb</span>
                      <span class="font-label-sm text-label-sm uppercase tracking-wider font-bold">Architect Tip</span>
                    </div>
                    <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed" id="architect-tip-text">
                      ${tipText}
                    </p>
                  </div>

                  <!-- Sound & Ambient Sensory Deck -->
                  <div class="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-sm shadow-sm">
                    <div class="flex items-center justify-between">
                      <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Acoustic Balance</span>
                      <span class="material-symbols-outlined text-on-surface-variant text-[18px]">graphic_eq</span>
                    </div>
                    <div class="flex items-center justify-between gap-space-sm">
                      <button id="btn-toggle-sfx-acoustic" class="flex-1 py-1.5 px-space-xs bg-surface-container-lowest rounded-full text-center font-label-sm text-label-sm text-on-surface shadow-sm hover:bg-surface-container transition-colors cursor-pointer" type="button">
                        Chimes
                      </button>
                      <button disabled class="flex-1 py-1.5 px-space-xs bg-surface-container rounded-full text-center font-label-sm text-label-sm text-on-surface-variant/40 opacity-60 cursor-not-allowed" title="Segera" type="button">
                        Matte Wood
                      </button>
                      <button disabled class="flex-1 py-1.5 px-space-xs bg-surface-container rounded-full text-center font-label-sm text-label-sm text-on-surface-variant/40 opacity-60 cursor-not-allowed" title="Segera" type="button">
                        Rain Echo
                      </button>
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
    if (!isMock && this.gameScene) {
      this.attachGameScene(this.gameScene);
    }
  }

  buildStreakBoxes(comboLevel) {
    let markup = '';
    for (let i = 1; i <= 5; i++) {
      const isMax = i === 5;
      const label = isMax ? 'MAX' : String(i);
      const isLit = comboLevel >= i;
      const isHighlight = comboLevel === i;

      if (isLit) {
        markup += `
          <div class="h-8 rounded-md bg-secondary flex items-center justify-center text-on-secondary shadow-sm ${isHighlight ? 'ring-2 ring-secondary-fixed' : ''}">
            <span class="font-label-sm text-label-sm font-bold">${label}</span>
          </div>
        `;
      } else {
        markup += `
          <div class="h-8 rounded-md bg-surface-container flex items-center justify-center text-on-surface-variant/40">
            <span class="font-label-sm text-label-sm">${label}</span>
          </div>
        `;
      }
    }
    return markup;
  }

  buildDeckSlotsMarkup(isMock) {
    if (isMock) {
      // Mockup exact 3 slots from Stitch
      return `
        <!-- Shape Slot 1: L-Tromino in Mint/Tertiary -->
        <div class="w-full h-full flex flex-col items-center justify-center p-space-xs rounded-md hover:bg-surface-container-lowest transition-all cursor-grab active:cursor-grabbing hover:scale-105 group select-none">
          <div class="grid grid-cols-2 grid-rows-2 gap-1 w-12 h-12">
            <div class="bg-tertiary-container rounded-sm shadow-[0_2px_4px_rgba(0,125,85,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
            <div class="opacity-0"></div>
            <div class="bg-tertiary-container rounded-sm shadow-[0_2px_4px_rgba(0,125,85,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
            <div class="bg-tertiary-container rounded-sm shadow-[0_2px_4px_rgba(0,125,85,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
          </div>
          <span class="font-label-sm text-label-sm text-on-surface-variant/70 mt-1 group-hover:text-primary transition-colors">L-Piece</span>
        </div>
        <!-- Shape Slot 2: Single 1-Tile in Cobalt Blue -->
        <div class="w-full h-full flex flex-col items-center justify-center p-space-xs rounded-md hover:bg-surface-container-lowest transition-all cursor-grab active:cursor-grabbing hover:scale-105 group ring-1 ring-primary/20 select-none">
          <div class="flex items-center justify-center w-12 h-12">
            <div class="w-6 h-6 bg-primary-container rounded-sm shadow-[0_3px_8px_rgba(37,99,235,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] animate-bounce"></div>
          </div>
          <span class="font-label-sm text-label-sm text-primary font-bold mt-1">Single Fit</span>
        </div>
        <!-- Shape Slot 3: 3x1 Horizontal Strip in Coral/Crimson -->
        <div class="w-full h-full flex flex-col items-center justify-center p-space-xs rounded-md hover:bg-surface-container-lowest transition-all cursor-grab active:cursor-grabbing hover:scale-105 group select-none">
          <div class="grid grid-cols-3 gap-1 w-14 h-5 my-3.5">
            <div class="bg-secondary-container rounded-sm shadow-[0_2px_4px_rgba(220,44,79,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
            <div class="bg-secondary-container rounded-sm shadow-[0_2px_4px_rgba(220,44,79,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
            <div class="bg-secondary-container rounded-sm shadow-[0_2px_4px_rgba(220,44,79,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)]"></div>
          </div>
          <span class="font-label-sm text-label-sm text-on-surface-variant/70 mt-1 group-hover:text-secondary transition-colors">Line-3</span>
        </div>
      `;
    }

    // Live mode slots
    return this.deckSlots.map((slot, idx) => {
      if (!slot || slot.used) {
        return `
          <div data-slot="${idx}" class="w-full h-full flex flex-col items-center justify-center p-space-xs rounded-md opacity-25 select-none border border-dashed border-outline/30 min-h-[96px]">
            <span class="material-symbols-outlined text-[20px] text-outline">check</span>
          </div>
        `;
      }

      const colorClass = getColorBgClass(slot.color?.id);
      const name = getShapeName(slot.shapeId);
      const coords = slot.coords || [[0, 0]];
      const preview = renderShapePreview(coords, colorClass);

      return `
        <div data-slot="${idx}" class="w-full h-full flex flex-col items-center justify-center p-space-xs rounded-md hover:bg-surface-container-lowest transition-all cursor-grab active:cursor-grabbing hover:scale-105 group select-none touch-none min-h-[96px]">
          ${preview}
          <span class="font-label-sm text-label-sm text-on-surface-variant/70 mt-1 group-hover:text-primary transition-colors">${name}</span>
        </div>
      `;
    }).join('');
  }

  buildLocalRankMarkup(isMock) {
    if (isMock) {
      return `
        <div class="flex items-center justify-between py-1 px-space-xs rounded bg-surface-container-low text-on-surface">
          <div class="flex items-center gap-space-xs min-w-0">
            <span class="font-label-sm text-label-sm text-on-surface-variant w-4">6</span>
            <span class="font-label-md text-label-md truncate">AuraVibe</span>
          </div>
          <span class="font-label-md text-label-md font-semibold">18,440</span>
        </div>
        <div class="flex items-center justify-between py-1 px-space-xs rounded bg-surface-container-low text-on-surface">
          <div class="flex items-center gap-space-xs min-w-0">
            <span class="font-label-sm text-label-sm text-on-surface-variant w-4">7</span>
            <span class="font-label-md text-label-md truncate">Solitude_99</span>
          </div>
          <span class="font-label-md text-label-md font-semibold">16,190</span>
        </div>
        <div class="flex items-center justify-between py-1.5 px-space-xs rounded bg-primary-container text-on-primary shadow-sm">
          <div class="flex items-center gap-space-xs min-w-0">
            <span class="font-label-sm text-label-sm text-on-primary/80 w-4 font-bold">8</span>
            <span class="font-label-md text-label-md font-bold truncate">You (Guest)</span>
          </div>
          <span class="font-label-md text-label-md font-bold">14,820</span>
        </div>
        <div class="flex items-center justify-between py-1 px-space-xs rounded bg-surface-container-low text-on-surface">
          <div class="flex items-center gap-space-xs min-w-0">
            <span class="font-label-sm text-label-sm text-on-surface-variant w-4">9</span>
            <span class="font-label-md text-label-md truncate">Kairo_Zen</span>
          </div>
          <span class="font-label-md text-label-md font-semibold">13,950</span>
        </div>
      `;
    }

    // Live local standings
    const curScore = this.currentScore;
    const bestModeScore = StorageManager.getBestScore(this.mode);
    return `
      <div class="flex items-center justify-between py-1.5 px-space-xs rounded bg-primary-container text-on-primary shadow-sm">
        <div class="flex items-center gap-space-xs min-w-0">
          <span class="font-label-sm text-label-sm text-on-primary/80 w-4 font-bold">#1</span>
          <span class="font-label-md text-label-md font-bold truncate">Sesi Kamu</span>
        </div>
        <span class="font-label-md text-label-md font-bold">${curScore.toLocaleString('id-ID')}</span>
      </div>
      <div class="flex items-center justify-between py-1 px-space-xs rounded bg-surface-container-low text-on-surface-variant">
        <div class="flex items-center gap-space-xs min-w-0">
          <span class="font-label-sm text-label-sm text-on-surface-variant w-4">-</span>
          <span class="font-label-md text-label-md truncate">Rekor Terbaik</span>
        </div>
        <span class="font-label-md text-label-md font-semibold">${bestModeScore > 0 ? bestModeScore.toLocaleString('id-ID') : 'Belum ada'}</span>
      </div>
    `;
  }

  buildMockupBoardGrid() {
    const cells = [];
    for (let i = 0; i < 100; i++) {
      cells.push(`<div class="aspect-square bg-surface-container-low rounded-sm shadow-inner transition-colors duration-150"></div>`);
    }
    return `
      <div class="grid grid-cols-10 gap-1 sm:gap-1.5 aspect-square w-full select-none">
        ${cells.join('')}
      </div>
    `;
  }

  attachGameScene(scene) {
    this.gameScene = scene;
    const boardMount = this.container?.querySelector('#blockora-board') || document.getElementById('blockora-board');
    if (!boardMount) return;

    if (scene.game && scene.game.canvas) {
      scene.game.canvas.style.display = 'block';
      scene.game.canvas.style.width = '100%';
      scene.game.canvas.style.height = '100%';
      scene.game.canvas.style.maxWidth = '100%';
      scene.game.canvas.style.maxHeight = '100%';
      scene.game.canvas.style.margin = '0 auto';
      scene.game.canvas.style.borderRadius = '0.375rem';
      scene.game.canvas.style.touchAction = 'none';
      scene.game.canvas.style.pointerEvents = 'auto';

      if (scene.game.canvas.parentElement !== boardMount) {
        boardMount.appendChild(scene.game.canvas);
      }
    }
  }

  bindEvents() {
    if (!this.container) return;

    // Back button (pause / confirm)
    const backBtn = this.container.querySelector('#btn-gameplay-back');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.onBack();
      });
    }

    // Pause button
    const pauseBtn = this.container.querySelector('#btn-gameplay-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.onPause();
      });
    }

    // Restart button
    const restartBtn = this.container.querySelector('#btn-gameplay-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.onRestart();
      });
    }

    // Header SFX & BGM toggle
    const sfxBtn = this.container.querySelector('#btn-toggle-sfx-header');
    if (sfxBtn) {
      sfxBtn.addEventListener('click', () => {
        audioManager.toggleSfxMute();
        const icon = sfxBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = audioManager.isSfxMuted ? 'volume_off' : 'volume_up';
      });
    }

    const bgmBtn = this.container.querySelector('#btn-toggle-bgm-header');
    if (bgmBtn) {
      bgmBtn.addEventListener('click', () => {
        audioManager.toggleBgmMute();
        const icon = bgmBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = audioManager.isBgmMuted ? 'music_off' : 'music_note';
      });
    }

    // Acoustic Balance SFX toggle button
    const acousticSfx = this.container.querySelector('#btn-toggle-sfx-acoustic');
    if (acousticSfx) {
      acousticSfx.addEventListener('click', () => {
        audioManager.toggleSfxMute();
        const icon = sfxBtn?.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = audioManager.isSfxMuted ? 'volume_off' : 'volume_up';
      });
    }

    // Unified Header Navigation
    bindHeaderNav(this.container, 'game');

    // Inisialisasi pointer drag dari HTML Deck ke Board Canvas
    this.initDeckDragInteraction();
  }

  initDeckDragInteraction() {
    const slotElements = this.container?.querySelectorAll('#gameplay-deck-slots [data-slot]');
    if (!slotElements) return;

    slotElements.forEach(slotEl => {
      slotEl.addEventListener('pointerdown', (e) => {
        const slotIdx = Number(slotEl.getAttribute('data-slot'));
        this.handleSlotPointerDown(e, slotIdx);
      });
    });
  }

  handleSlotPointerDown(e, slotIdx) {
    if (this.deckSlots[slotIdx]?.used) return;
    const block = this.deckSlots[slotIdx];
    if (!block) return;

    e.preventDefault();
    this.activeDragSlot = slotIdx;
    this.activeDragBlock = block;
    this.isDraggingActive = true;
    document.body.classList.add('is-dragging-block');

    // Pre-kalkulasi geometri balok sekali saja tanpa map/spread/closure
    const coords = block.coords || block.shape || [[0, 0]];
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (let i = 0; i < coords.length; i++) {
      const r = coords[i][0];
      const c = coords[i][1];
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }
    this.dragHalfCols = Math.floor((maxC - minC + 1) / 2);
    this.dragHalfRows = Math.floor((maxR - minR + 1) / 2);
    this.lastHoverRow = null;
    this.lastHoverCol = null;

    // Cache posisi & dimensi papan sekali saja saat mulai drag (mencegah layout thrashing)
    const boardMount = this.container?.querySelector('#blockora-board') || document.getElementById('blockora-board');
    if (boardMount) {
      const bRect = boardMount.getBoundingClientRect();
      this.boardLeft = bRect.left;
      this.boardTop = bRect.top;
      this.boardWidth = bRect.width;
      this.boardHeight = bRect.height;
      this.cachedCellStep = bRect.width / 10;
    }

    const isTouch = e.pointerType === 'touch';
    this.latestPointerIsTouch = isTouch;
    this.latestPointerX = e.clientX;
    this.latestPointerY = e.clientY;
    const offsetY = isTouch ? 48 : 24;

    // Pakai ulang (reuse) floating ghost element tanpa alokasi DOM baru
    if (!this.dragGhostEl) {
      const ghost = document.createElement('div');
      ghost.id = 'blockora-floating-drag';
      ghost.style.position = 'fixed';
      ghost.style.left = '0px';
      ghost.style.top = '0px';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '9999';
      ghost.style.willChange = 'transform';
      document.body.appendChild(ghost);
      this.dragGhostEl = ghost;
    }

    const colorClass = getColorBgClass(block.color?.id);
    const preview = renderShapePreview(coords, colorClass);
    this.dragGhostEl.innerHTML = preview;
    this.dragGhostEl.style.display = 'block';
    this.dragGhostEl.style.transform = `translate3d(${e.clientX - 24}px, ${e.clientY - offsetY}px, 0) scale(1.15)`;

    audioManager.playPickup();

    window.addEventListener('pointermove', this._onPointerMoveBound, { passive: true });
    window.addEventListener('pointerup', this._onPointerUpBound);
    window.addEventListener('pointercancel', this._onPointerUpBound);
  }

  handleDragMove(e) {
    if (!this.isDraggingActive) return;
    this.latestPointerX = e.clientX;
    this.latestPointerY = e.clientY;
    this.latestPointerIsTouch = e.pointerType === 'touch';

    // Throttle rendering pointer ke frame browser via requestAnimationFrame
    if (!this.dragRafId) {
      this.dragRafId = requestAnimationFrame(this.onDragFrame);
    }
  }

  handleDragFrameTick() {
    this.dragRafId = null;
    if (!this.isDraggingActive || !this.dragGhostEl) return;

    const clientX = this.latestPointerX;
    const clientY = this.latestPointerY;
    const offsetY = this.latestPointerIsTouch ? 48 : 24;

    // 1. Geser ghost langsung tanpa lerp/tween
    this.dragGhostEl.style.transform = `translate3d(${clientX - 24}px, ${clientY - offsetY}px, 0) scale(1.15)`;

    // 2. Cek apakah kursor berada di atas papan Phaser menggunakan koordinat yang di-cache
    if (this.gameScene && this.boardWidth > 0 && this.activeDragBlock) {
      const x = clientX - this.boardLeft;
      const y = clientY - offsetY - this.boardTop;

      if (x >= 0 && x <= this.boardWidth && y >= 0 && y <= this.boardHeight) {
        const cursorCol = (x / this.cachedCellStep) | 0;
        const cursorRow = (y / this.cachedCellStep) | 0;
        const col = cursorCol - this.dragHalfCols;
        const row = cursorRow - this.dragHalfRows;

        // Optimasi A: Hanya jalankan setHoverPreview jika sel target BERUBAH
        if (row !== this.lastHoverRow || col !== this.lastHoverCol) {
          this.lastHoverRow = row;
          this.lastHoverCol = col;
          this.gameScene.setHoverPreview(this.activeDragBlock, row, col);
        }
      } else {
        if (this.lastHoverRow !== null || this.lastHoverCol !== null) {
          this.lastHoverRow = null;
          this.lastHoverCol = null;
          this.gameScene.clearHoverPreview();
        }
      }
    }
  }

  handleDragUp(e) {
    if (!this.isDraggingActive) return;
    this.isDraggingActive = false;

    let placed = false;
    const block = this.activeDragBlock;
    const slotIdx = this.activeDragSlot;

    if (this.gameScene && this.boardWidth > 0 && block) {
      const isTouch = e ? (e.pointerType === 'touch') : this.latestPointerIsTouch;
      const offsetY = isTouch ? 48 : 24;
      const clientX = e ? e.clientX : this.latestPointerX;
      const clientY = e ? e.clientY : this.latestPointerY;

      const x = clientX - this.boardLeft;
      const y = clientY - offsetY - this.boardTop;

      if (x >= 0 && x <= this.boardWidth && y >= 0 && y <= this.boardHeight) {
        const cursorCol = (x / this.cachedCellStep) | 0;
        const cursorRow = (y / this.cachedCellStep) | 0;
        const col = cursorCol - this.dragHalfCols;
        const row = cursorRow - this.dragHalfRows;

        if (this.gameScene.tryPlaceBlockFromUI(slotIdx, block, row, col)) {
          placed = true;
        }
      }
      this.gameScene.clearHoverPreview();
    }

    if (!placed) {
      if (typeof audioManager.playInvalid === 'function') {
        audioManager.playInvalid();
      }
    }

    this.cleanDragListeners();
  }

  cleanDragListeners() {
    if (this.dragRafId) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = null;
    }
    window.removeEventListener('pointermove', this._onPointerMoveBound);
    window.removeEventListener('pointerup', this._onPointerUpBound);
    window.removeEventListener('pointercancel', this._onPointerUpBound);

    if (this.dragGhostEl) {
      this.dragGhostEl.style.display = 'none';
    }
    if (this.gameScene) {
      this.gameScene.clearHoverPreview();
    }
    this.isDraggingActive = false;
    this.activeDragBlock = null;
    this.activeDragSlot = null;
    this.lastHoverRow = null;
    this.lastHoverCol = null;
    document.body.classList.remove('is-dragging-block');
  }

  // Update dinamis dari GameScene (Selective DOM Writes)
  updateLiveState({ score, combo, emptyCells, timerStr }) {
    // Tunda update DOM jika sedang menggeser balok untuk mencegah frame drop
    if (this.isDraggingActive) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    if (score !== undefined && score !== this._lastScore) {
      this.currentScore = score;
      this._lastScore = score;
      const scoreEl = this.container?.querySelector('#main-score');
      if (scoreEl) scoreEl.textContent = this.currentScore.toLocaleString('id-ID');

      if (isDesktop && !this.isMockMode) {
        const rankListEl = this.container?.querySelector('#local-ranking-list');
        if (rankListEl) rankListEl.innerHTML = this.buildLocalRankMarkup(false);
      }
    }

    if (timerStr && timerStr !== this._lastTimerStr) {
      this._lastTimerStr = timerStr;
      const timerEl = this.container?.querySelector('#countdown-timer');
      if (timerEl) timerEl.textContent = timerStr;
    }

    if (emptyCells !== undefined && emptyCells !== this._lastEmptyCells) {
      this.emptyCellsCount = emptyCells;
      this._lastEmptyCells = emptyCells;
      const emptyEl = this.container?.querySelector('#empty-cells-count');
      if (emptyEl) emptyEl.textContent = `${this.emptyCellsCount} Empty Cells Available`;
    }

    if (combo !== undefined && combo !== this._lastCombo) {
      this.currentCombo = combo;
      this._lastCombo = combo;

      const comboBadge = this.container?.querySelector('#gameplay-combo-badge');
      if (comboBadge) {
        if (this.currentCombo >= 2) {
          comboBadge.textContent = `x${this.currentCombo} COMBO!`;
          comboBadge.classList.remove('opacity-0');
          comboBadge.classList.add('animate-bounce');
        } else {
          comboBadge.classList.add('opacity-0');
          comboBadge.classList.remove('animate-bounce');
        }
      }

      if (isDesktop) {
        const streakLabel = this.container?.querySelector('#streak-multiplier-label');
        if (streakLabel) streakLabel.textContent = `x${Math.max(1, this.currentCombo)}`;

        const streakBoxesEl = this.container?.querySelector('#streak-multiplier-boxes');
        if (streakBoxesEl) streakBoxesEl.innerHTML = this.buildStreakBoxes(this.currentCombo);
      }
    }
  }

  updateDeck(slots) {
    this.deckSlots = slots || [null, null, null];
    const deckContainer = this.container?.querySelector('#gameplay-deck-slots');
    if (deckContainer && !this.isMockMode) {
      deckContainer.innerHTML = this.buildDeckSlotsMarkup(false);
      this.initDeckDragInteraction();
    }
  }
}

function renderShapePreview(shapeCoords, colorClass) {
  const maxR = Math.max(...shapeCoords.map(([r]) => r)) + 1;
  const maxC = Math.max(...shapeCoords.map(([, c]) => c)) + 1;
  const cellSize = Math.min(16, Math.max(8, Math.floor(48 / Math.max(maxR, maxC))));
  const gridCells = [];

  for (let r = 0; r < maxR; r++) {
    for (let c = 0; c < maxC; c++) {
      const hasCell = shapeCoords.some(([sr, sc]) => sr === r && sc === c);
      if (hasCell) {
        gridCells.push(`<div class="${colorClass} rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.6)]" style="width: ${cellSize}px; height: ${cellSize}px;"></div>`);
      } else {
        gridCells.push(`<div class="opacity-0" style="width: ${cellSize}px; height: ${cellSize}px;"></div>`);
      }
    }
  }
  return `
    <div class="flex items-center justify-center w-14 h-14">
      <div class="grid gap-1 items-center justify-center" style="grid-template-columns: repeat(${maxC}, ${cellSize}px);">
        ${gridCells.join('')}
      </div>
    </div>
  `;
}
