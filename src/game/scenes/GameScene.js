import Phaser from 'phaser';
import { BoardSystem } from '../systems/BoardSystem.js';
import { BlockSystem } from '../systems/BlockSystem.js';
import { ClearSystem } from '../systems/ClearSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { DragSystem } from '../systems/DragSystem.js';
import { TimerSystem } from '../systems/TimerSystem.js';
import { generateDailyConfig, DailyTracker } from '../DailyChallenge.js';
import { getDailyRng } from '../../utils/Random.js';
import { todayKey } from '../../utils/DateHelper.js';
import { StorageManager } from '../../storage/StorageManager.js';
import { StatisticsManager } from '../../storage/StatisticsManager.js';
import { audioManager } from '../../audio/AudioManager.js';
import { HapticManager } from '../../utils/HapticManager.js';
import { MotionPrefs } from '../../utils/MotionPrefs.js';
import { BOARD_SIZE, TRAY_SLOTS, THEME_COLORS, BLOCK_COLORS, GAME_MODES, ANIMATION_TIMINGS } from '../constants.js';

/**
 * GameScene - Layar Permainan Utama BLOCKORA (Tahap 4: Multi-Mode Permainan)
 * Mendukung mode Classic, Time Challenge (120s timer), dan Daily Challenge (seeded PRNG & target tracker).
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // Mode aktif
    this.mode = 'classic';
    this.dateKey = todayKey();

    // Sistem logika murni
    this.boardSystem = new BoardSystem(BOARD_SIZE);
    this.blockSystem = new BlockSystem();
    this.scoreSystem = new ScoreSystem();
    this.timerSystem = null;
    this.dailyTracker = null;
    this.dailyRng = null;
    this.dragSystem = null;

    // Visual grid & preview
    this.boardCellViews = [];
    this.previewGraphics = null;

    // Visual tray
    this.traySlots = [];
    this.trayBlockContainers = [];

    // HUD Text Objects
    this.scoreText = null;
    this.comboBadge = null;
    this.comboBadgeText = null;
    this.modeBadgeText = null;
    this.timerContainer = null;
    this.timerText = null;
    this.dailyMissionChip = null;
    this.dailyMissionText = null;

    // Status permainan
    this.isLocked = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.hasMadeFirstMove = false;
    this.durationSeconds = 0;
    this.timerEvent = null;

    // Parameter layout grid
    this.boardOriginX = 0;
    this.boardOriginY = 0;
    this.cellSize = 56;
    this.cellGap = 6;
    this.cellRadius = 8;
  }

  /**
   * Menerima parameter saat scene diluncurkan
   * @param {Object} [data]
   * @param {string} [data.mode='classic']
   * @param {string} [data.dateKey]
   */
  init(data = {}) {
    this.mode = data.mode || 'classic';
    this.dateKey = data.dateKey || todayKey();
  }

  create() {
    const { width, height } = this.scale;

    // 1. Background Kanvas
    this.add.rectangle(width / 2, height / 2, width, height, width <= 500 ? THEME_COLORS.boardWell : THEME_COLORS.background);

    // 2. Render HUD Atas (hanya untuk mode standalone/lebar > 500)
    if (width > 500) {
      this.createHUD(width);
    }

    // 3. Render Papan 10x10
    this.createCellTextures();
    this.setupBoard(width, height);

    // 4. Inisialisasi Pool Sprite Preview Ghost (Maksimal 9 sel untuk polyomino 3x3)
    this.previewGraphics = this.add.graphics();
    this.previewGraphics.setDepth(5);
    this.previewSprites = [];
    for (let i = 0; i < 9; i++) {
      const s = this.add.image(0, 0, 'preview_valid').setOrigin(0, 0).setDepth(5).setVisible(false);
      this.previewSprites.push(s);
    }

    // 5. Inisialisasi DragSystem (hanya untuk mode standalone/lebar > 500)
    if (width > 500) {
      this.dragSystem = new DragSystem(this, {
        boardSystem: this.boardSystem,
        blockSystem: this.blockSystem,
        boardOriginX: this.boardOriginX,
        boardOriginY: this.boardOriginY,
        cellSize: this.cellSize,
        cellGap: this.cellGap,
        onBlockPlaced: (data) => this.handleBlockPlaced(data),
        onDragStateChange: (state) => this.handleDragStateChange(state)
      });

      // 6. Setup Tray 3 Slot
      this.setupTray(width, height);

      // 7. Event Input Global
      this.input.on('pointermove', (pointer) => {
        if (!this.isLocked && !this.isPaused && !this.isGameOver) {
          this.dragSystem.onPointerMove(pointer);
        }
      });

      this.input.on('pointerup', (pointer) => {
        if (!this.isLocked && !this.isPaused && !this.isGameOver) {
          this.dragSystem.onPointerUp(pointer);
        }
      });

      this.input.on('pointercancel', () => this.dragSystem.cancelDrag());
    }

    // 8. Timer Durasi Sesi Bermain Umum
    if (this.timerEvent) this.timerEvent.destroy();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.isPaused && !this.isGameOver && this.hasMadeFirstMove) {
          this.durationSeconds++;
          this.syncGameplayUI();
        }
      },
      loop: true
    });

    // 9. Mulai Permainan sesuai Mode
    this.restartGame();
  }

  /**
   * Siklus update engine Phaser (untuk tick TimerSystem di Time Challenge)
   */
  update(time, delta) {
    if (this.mode === 'time' && this.timerSystem && !this.isPaused && !this.isGameOver) {
      this.timerSystem.tick(delta);
    }
  }

  /**
   * Merender Elemen HUD Atas sesuai Stitch
   */
  createHUD(width) {
    const topBarY = 46;

    // Tombol Kembali ke Menu
    const backBtnBg = this.add.rectangle(68, topBarY, 84, 38, 0xffffff)
      .setStrokeStyle(1.5, 0xdbe1ff)
      .setInteractive({ useHandCursor: true });

    this.add.text(68, topBarY, '← Menu', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#0b1c30'
    }).setOrigin(0.5);

    backBtnBg.on('pointerdown', () => backBtnBg.setScale(0.96));
    backBtnBg.on('pointerup', () => {
      backBtnBg.setScale(1.0);
      window.dispatchEvent(new CustomEvent('blockora:return-menu'));
    });
    backBtnBg.on('pointerout', () => backBtnBg.setScale(1.0));

    // Badge Mode (Classic / 120 Detik / Harian)
    const modeConfig = GAME_MODES[this.mode] || GAME_MODES.classic;
    const modeBadge = this.add.rectangle(width / 2, topBarY, 126, 32, 0xe5eeff);
    this.modeBadgeText = this.add.text(width / 2, topBarY, modeConfig.badge, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#004ac6',
      letterSpacing: 1
    }).setOrigin(0.5);

    // Tombol Pause (⏸)
    const pauseBtnBg = this.add.circle(width - 86, topBarY, 19, 0xffffff)
      .setStrokeStyle(1.5, 0xdbe1ff)
      .setInteractive({ useHandCursor: true });

    this.add.text(width - 86, topBarY, '⏸', {
      fontSize: '14px',
      color: '#0b1c30'
    }).setOrigin(0.5);

    pauseBtnBg.on('pointerdown', () => pauseBtnBg.setScale(0.95));
    pauseBtnBg.on('pointerup', () => {
      pauseBtnBg.setScale(1.0);
      this.pauseGame();
    });
    pauseBtnBg.on('pointerout', () => pauseBtnBg.setScale(1.0));

    // Tombol Restart (🔄)
    const restartBtnBg = this.add.circle(width - 38, topBarY, 19, 0xffffff)
      .setStrokeStyle(1.5, 0xdbe1ff)
      .setInteractive({ useHandCursor: true });

    this.add.text(width - 38, topBarY, '🔄', {
      fontSize: '14px',
      color: '#0b1c30'
    }).setOrigin(0.5);

    restartBtnBg.on('pointerdown', () => restartBtnBg.setScale(0.95));
    restartBtnBg.on('pointerup', () => {
      restartBtnBg.setScale(1.0);
      this.restartGame();
    });
    restartBtnBg.on('pointerout', () => restartBtnBg.setScale(1.0));

    // Area Tampilan Skor Besar
    const scoreY = 104;

    this.add.text(width / 2, scoreY - 20, 'SCORE', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#737686',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width / 2, scoreY + 4, '0', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#2563eb',
      letterSpacing: -1
    }).setOrigin(0.5);

    // Chip Timer Khusus Time Challenge (vektor jam minimalis Stitch)
    this.timerContainer = this.add.container(width / 2, scoreY + 36);
    const timerBg = this.add.rectangle(0, 0, 108, 28, 0xeff4ff)
      .setStrokeStyle(1.2, 0xdbe1ff);
    
    // Ikon Timer Vector
    const timerIcon = this.add.graphics();
    timerIcon.lineStyle(1.6, 0x004ac6, 1);
    timerIcon.strokeCircle(-32, 0, 6.5);
    timerIcon.beginPath();
    timerIcon.moveTo(-32, -4);
    timerIcon.lineTo(-32, 0);
    timerIcon.lineTo(-29, 0);
    timerIcon.strokePath();

    this.timerText = this.add.text(6, 0, '02:00', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#004ac6',
      letterSpacing: 0.5
    }).setOrigin(0.5);
    this.timerContainer.add([timerBg, timerIcon, this.timerText]);
    this.timerContainer.setVisible(this.mode === 'time');

    // Chip Target Khusus Daily Challenge (vektor target bullseye Stitch)
    this.dailyMissionChip = this.add.container(width / 2, scoreY + 36);
    const dailyBg = this.add.rectangle(0, 0, 160, 28, 0xeef5ec)
      .setStrokeStyle(1.2, 0xbedcbd);
    
    // Ikon Target Vector
    const dailyIcon = this.add.graphics();
    dailyIcon.lineStyle(1.5, 0x2e7d32, 1);
    dailyIcon.strokeCircle(-58, 0, 6.5);
    dailyIcon.fillStyle(0x2e7d32, 1);
    dailyIcon.fillCircle(-58, 0, 2.5);

    this.dailyMissionText = this.add.text(8, 0, 'MISI: 0/3 SELESAI', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#2e7d32',
      letterSpacing: 0.5
    }).setOrigin(0.5);
    this.dailyMissionChip.add([dailyBg, dailyIcon, this.dailyMissionText]);
    this.dailyMissionChip.setVisible(this.mode === 'daily');

    // Badge Combo Multiplier (hanya tampil saat combo >= 2)
    this.comboBadge = this.add.graphics();
    this.comboBadgeText = this.add.text(width / 2, scoreY + (this.mode === 'classic' ? 32 : 56), '', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.comboBadge.setVisible(false);
    this.comboBadgeText.setVisible(false);
  }

  /**
   * Pre-generasi texture sel warna dan ghost preview ke TextureManager
   */
  createCellTextures() {
    const size = 39;
    const radius = 4;

    BLOCK_COLORS.forEach(color => {
      const texKey = `cell_color_${color.id}`;
      if (this.textures.exists(texKey)) return;

      const g = this.make.graphics({ x: 0, y: 0, add: false });
      // Bayangan bawah
      g.fillStyle(0x000000, 0.15);
      g.fillRoundedRect(0, 2, size, size, radius);
      // Badan sel
      g.fillStyle(color.num, 1);
      g.fillRoundedRect(0, 0, size, size, radius);
      // Highlight atas
      g.fillStyle(0xffffff, 0.3);
      g.fillRoundedRect(1, 1, size - 2, 3, 2);

      g.generateTexture(texKey, size, size + 2);
      g.destroy();
    });

    if (!this.textures.exists('preview_valid')) {
      const gValid = this.make.graphics({ x: 0, y: 0, add: false });
      gValid.fillStyle(0x2563eb, 0.55);
      gValid.fillRoundedRect(0, 0, size, size, radius);
      gValid.lineStyle(1.5, 0xffffff, 0.85);
      gValid.strokeRoundedRect(0, 0, size, size, radius);
      gValid.generateTexture('preview_valid', size, size);
      gValid.destroy();
    }

    if (!this.textures.exists('preview_invalid')) {
      const gInvalid = this.make.graphics({ x: 0, y: 0, add: false });
      gInvalid.fillStyle(0xdc2c4f, 0.35);
      gInvalid.fillRoundedRect(0, 0, size, size, radius);
      gInvalid.generateTexture('preview_invalid', size, size);
      gInvalid.destroy();
    }
  }

  /**
   * Mengatur dan merender Papan 10x10 sesuai desain Stitch
   */
  setupBoard(width, height) {
    if (width <= 500) {
      // Wadah Kanvas Stitch (444x444)
      this.cellSize = 39;
      this.cellGap = 6;
      this.cellRadius = 4;
      this.boardOriginX = 0;
      this.boardOriginY = 0;

      this.boardCellViews = [];
      const step = this.cellSize + this.cellGap;

      // Optimasi Render Phaser: Pre-render 100 sel kosong ke SATU texture statis (1 Image quad)
      // Menghilangkan 11.014 perintah vertex tessellation dari loop render CPU setiap frame
      if (this.emptyGridGraphics) {
        this.emptyGridGraphics.destroy();
        this.emptyGridGraphics = null;
      }
      if (this.boardBgImage) {
        this.boardBgImage.destroy();
        this.boardBgImage = null;
      }

      const texKey = 'board_empty_grid_stitch';
      if (!this.textures.exists(texKey)) {
        const tempG = this.make.graphics({ x: 0, y: 0, add: false });
        tempG.fillStyle(THEME_COLORS.cellEmpty, 1);
        tempG.lineStyle(1, THEME_COLORS.cellEmptyStroke, 0.7);

        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            const cellX = this.boardOriginX + (c * step);
            const cellY = this.boardOriginY + (r * step);
            tempG.fillRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);
            tempG.strokeRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);
          }
        }
        tempG.generateTexture(texKey, 444, 444);
        tempG.destroy();
      }

      this.boardBgImage = this.add.image(0, 0, texKey).setOrigin(0, 0).setDepth(0);

      for (let r = 0; r < BOARD_SIZE; r++) {
        this.boardCellViews[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cellX = this.boardOriginX + (c * step);
          const cellY = this.boardOriginY + (r * step);

          this.boardCellViews[r][c] = {
            x: cellX,
            y: cellY,
            filledGraphics: null
          };
        }
      }
      return;
    }

    this.cellSize = 56;
    this.cellGap = 6;
    this.cellRadius = 8;

    const boardInnerSize = (this.cellSize * BOARD_SIZE) + (this.cellGap * (BOARD_SIZE - 1));
    const padding = 16;
    const boardOuterSize = boardInnerSize + (padding * 2);

    const boardCenterX = width / 2;
    const boardCenterY = 480;

    // Bingkai Luar Papan (White Floating Card)
    const boardFrame = this.add.graphics();
    boardFrame.fillStyle(THEME_COLORS.boardBg, 1);
    boardFrame.fillRoundedRect(
      boardCenterX - boardOuterSize / 2,
      boardCenterY - boardOuterSize / 2,
      boardOuterSize,
      boardOuterSize,
      20
    );
    boardFrame.lineStyle(1.5, 0xdbe1ff, 0.8);
    boardFrame.strokeRoundedRect(
      boardCenterX - boardOuterSize / 2,
      boardCenterY - boardOuterSize / 2,
      boardOuterSize,
      boardOuterSize,
      20
    );

    // Sumur Bagian Dalam Papan (Recessed Well)
    const wellGraphics = this.add.graphics();
    wellGraphics.fillStyle(THEME_COLORS.boardWell, 1);
    wellGraphics.fillRoundedRect(
      boardCenterX - boardInnerSize / 2 - 8,
      boardCenterY - boardInnerSize / 2 - 8,
      boardInnerSize + 16,
      boardInnerSize + 16,
      14
    );

    this.boardOriginX = boardCenterX - boardInnerSize / 2;
    this.boardOriginY = boardCenterY - boardInnerSize / 2;

    this.boardCellViews = [];
    const step = this.cellSize + this.cellGap;

    for (let r = 0; r < BOARD_SIZE; r++) {
      this.boardCellViews[r] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cellX = this.boardOriginX + (c * step);
        const cellY = this.boardOriginY + (r * step);

        // Gambar sel kosong
        const emptyGraphics = this.add.graphics();
        emptyGraphics.fillStyle(THEME_COLORS.cellEmpty, 1);
        emptyGraphics.fillRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);
        emptyGraphics.lineStyle(1, THEME_COLORS.cellEmptyStroke, 0.7);
        emptyGraphics.strokeRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);

        this.boardCellViews[r][c] = {
          x: cellX,
          y: cellY,
          filledGraphics: null
        };
      }
    }
  }

  /**
   * Mengatur area Tray di bawah papan (Active Shape Deck)
   */
  setupTray(width, height) {
    const trayCenterY = 965;
    const trayWidth = 646;
    const trayHeight = 220;

    // Bingkai Dok Tray
    const trayCard = this.add.graphics();
    trayCard.fillStyle(THEME_COLORS.trayBg, 1);
    trayCard.fillRoundedRect(
      width / 2 - trayWidth / 2,
      trayCenterY - trayHeight / 2,
      trayWidth,
      trayHeight,
      20
    );
    trayCard.lineStyle(1.5, 0xdbe1ff, 0.8);
    trayCard.strokeRoundedRect(
      width / 2 - trayWidth / 2,
      trayCenterY - trayHeight / 2,
      trayWidth,
      trayHeight,
      20
    );

    // Label Deck
    this.add.text(width / 2 - trayWidth / 2 + 20, trayCenterY - trayHeight / 2 + 16, 'ACTIVE SHAPES', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#737686',
      letterSpacing: 1
    });

    this.traySlots = [];
    this.trayBlockContainers = [null, null, null];

    const slotWidth = 190;
    const slotHeight = 150;
    const slotY = trayCenterY + 12;
    const slotOffsets = [-200, 0, 200];

    for (let i = 0; i < TRAY_SLOTS; i++) {
      const slotX = width / 2 + slotOffsets[i];

      const slotGraphics = this.add.graphics();
      slotGraphics.fillStyle(THEME_COLORS.traySlotBg, 0.75);
      slotGraphics.fillRoundedRect(
        slotX - slotWidth / 2,
        slotY - slotHeight / 2,
        slotWidth,
        slotHeight,
        14
      );
      slotGraphics.lineStyle(1, THEME_COLORS.traySlotStroke, 0.6);
      slotGraphics.strokeRoundedRect(
        slotX - slotWidth / 2,
        slotY - slotHeight / 2,
        slotWidth,
        slotHeight,
        14
      );

      this.traySlots.push({
        x: slotX,
        y: slotY,
        width: slotWidth,
        height: slotHeight
      });
    }
  }

  /**
   * Menghasilkan set 3 balok baru dan menampilkannya di tray
   */
  replenishTray(animate = true) {
    const rng = this.mode === 'daily' ? this.dailyRng : Math.random;
    const blocks = this.blockSystem.generateSet(rng);

    if (this.trayBlockContainers) {
      this.trayBlockContainers.forEach(c => {
        if (c && c.destroy) c.destroy();
      });
    }
    this.trayBlockContainers = [null, null, null];

    if (this.traySlots && this.traySlots.length > 0) {
      blocks.forEach((block, index) => {
        const slot = this.traySlots[index];
        if (!slot) return;
        const container = this.createBlockVisual(block);

        container.x = slot.x;
        container.y = slot.y;

        const miniScale = 0.52;
        container.setScale(miniScale);

        this.makeBlockInteractive(container, index, block);
        this.trayBlockContainers[index] = container;

        if (animate && !MotionPrefs.isReduced) {
          container.setScale(0);
          container.alpha = 0;

          this.tweens.add({
            targets: container,
            scaleX: miniScale,
            scaleY: miniScale,
            alpha: 1,
            duration: ANIMATION_TIMINGS.TRAY_ENTRY_DURATION,
            delay: index * 60,
            ease: 'Back.easeOut'
          });
        } else {
          container.setScale(miniScale);
          container.alpha = 1;
        }
      });
    }

    this.syncGameplayUI();
  }

  /**
   * Membuat Container visual balok
   */
  createBlockVisual(block) {
    const container = this.add.container(0, 0);
    const step = this.cellSize + this.cellGap;

    let minR = Infinity, maxR = -Infinity;
    let minC = Infinity, maxC = -Infinity;

    block.coords.forEach(([r, c]) => {
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    });

    const blockWidth = ((maxC - minC + 1) * this.cellSize) + ((maxC - minC) * this.cellGap);
    const blockHeight = ((maxR - minR + 1) * this.cellSize) + ((maxR - minR) * this.cellGap);

    const offsetX = -blockWidth / 2 - (minC * step);
    const offsetY = -blockHeight / 2 - (minR * step);

    container.shapeOffsetX = offsetX;
    container.shapeOffsetY = offsetY;

    block.coords.forEach(([r, c]) => {
      const cellX = offsetX + (c * step);
      const cellY = offsetY + (r * step);

      const cellGraphics = this.add.graphics();
      this.drawBlockCell(cellGraphics, cellX, cellY, this.cellSize, block.color.num, this.cellRadius);
      container.add(cellGraphics);
    });

    container.setSize(blockWidth + 24, blockHeight + 24);
    return container;
  }

  drawBlockCell(graphics, x, y, size, colorNum, radius) {
    // Bayangan/Bevel bawah taktil
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillRoundedRect(x, y + 2, size, size, radius);

    // Badan Balok
    graphics.fillStyle(colorNum, 1);
    graphics.fillRoundedRect(x, y, size, size, radius);

    // Highlight atas (efek glossy/resin)
    graphics.fillStyle(0xffffff, 0.45);
    graphics.fillRoundedRect(x + 2, y + 2, size - 4, Math.max(3, size * 0.22), Math.max(2, radius - 2));

    // Garis batas tipis
    graphics.lineStyle(1, 0xffffff, 0.35);
    graphics.strokeRoundedRect(x, y, size, size, radius);
  }

  makeBlockInteractive(container, slotIndex, block) {
    container.setInteractive({ useHandCursor: true });

    const miniScale = 0.52;

    container.on('pointerover', () => {
      if (!this.isLocked && !this.isPaused && !this.isGameOver && !this.dragSystem?.isDragging) {
        if (!MotionPrefs.isReduced) {
          this.tweens.add({
            targets: container,
            scaleX: miniScale * 1.08,
            scaleY: miniScale * 1.08,
            duration: 90,
            ease: 'Cubic.easeOut'
          });
        }
      }
    });

    container.on('pointerout', () => {
      if (!this.dragSystem?.isDragging || this.dragSystem?.originSlotIndex !== slotIndex) {
        this.tweens.add({
          targets: container,
          scaleX: miniScale,
          scaleY: miniScale,
          duration: 90,
          ease: 'Cubic.easeOut'
        });
      }
    });

    container.on('pointerdown', (pointer) => {
      if (!this.isLocked && !this.isPaused && !this.isGameOver && this.dragSystem) {
        audioManager.playPickup();
        this.dragSystem.startDrag(pointer, slotIndex, block, container);
      }
    });
  }

  handleDragStateChange(state) {
    if (!this.previewGraphics) return;
    this.previewGraphics.clear();

    if (state.type === 'revert') {
      audioManager.playInvalid();
      HapticManager.invalid();
    }

    if (state.type === 'move' && state.hasCellsOnBoard && state.block) {
      const step = this.cellSize + this.cellGap;
      const targetRow = state.row;
      const targetCol = state.col;
      const isValid = state.isValid;

      state.block.coords.forEach(([r, c]) => {
        const row = targetRow + r;
        const col = targetCol + c;

        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
          const cellX = this.boardOriginX + (col * step);
          const cellY = this.boardOriginY + (row * step);

          if (isValid) {
            this.previewGraphics.fillStyle(state.block.color.num, 0.42);
            this.previewGraphics.fillRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);
            this.previewGraphics.lineStyle(2, state.block.color.num, 0.85);
            this.previewGraphics.strokeRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);
          } else {
            this.previewGraphics.fillStyle(THEME_COLORS.previewInvalid, 0.32);
            this.previewGraphics.fillRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);
            this.previewGraphics.lineStyle(2, THEME_COLORS.previewInvalid, 0.7);
            this.previewGraphics.strokeRoundedRect(cellX, cellY, this.cellSize, this.cellSize, this.cellRadius);
          }
        }
      });
    }
  }

  /**
   * Alur penempatan balok (URUTAN WAJIB):
   * place -> ClearSystem -> animasi hapus -> ScoreSystem -> update HUD ->
   * tandai balok terpakai -> jika ketiganya habis, generate set baru -> cek game over.
   */
  handleBlockPlaced({ block, slotIndex, row, col }) {
    if (this.previewGraphics) {
      this.previewGraphics.clear();
    }

    // 1. Catat penempatan pertama dan mulai timer jika Time Challenge
    if (!this.hasMadeFirstMove) {
      this.hasMadeFirstMove = true;
      if (this.mode === 'time' && this.timerSystem && !this.timerSystem.isStarted) {
        this.timerSystem.start();
      }
    }

    // 2. Kunci input drag selama animasi pemrosesan
    this.isLocked = true;

    // Umpan balik audio & haptic penempatan balok
    audioManager.playPlace();
    HapticManager.place();

    // 3. Render sel balok baru di papan menggunakan sprite texture hemat GPU
    const colorId = block.color?.id || 1;
    const texKey = this.textures.exists(`cell_color_${colorId}`) ? `cell_color_${colorId}` : null;

    block.coords.forEach(([r, c]) => {
      const targetRow = row + r;
      const targetCol = col + c;

      const cellView = this.boardCellViews[targetRow][targetCol];
      if (cellView.filledGraphics) {
        cellView.filledGraphics.destroy();
      }

      let filledVisual;
      if (texKey && this.cellSize === 39) {
        filledVisual = this.add.image(cellView.x, cellView.y, texKey).setOrigin(0, 0).setDepth(2);
      } else {
        filledVisual = this.add.graphics();
        this.drawBlockCell(
          filledVisual,
          cellView.x,
          cellView.y,
          this.cellSize,
          block.color.num,
          this.cellRadius
        );
        filledVisual.setDepth(2);
      }

      if (!MotionPrefs.isReduced) {
        filledVisual.setScale(0.85);
        this.tweens.add({
          targets: filledVisual,
          scaleX: 1,
          scaleY: 1,
          duration: ANIMATION_TIMINGS.PLACE_BOUNCE_DURATION,
          ease: 'Back.easeOut'
        });
      } else {
        filledVisual.setScale(1);
      }

      cellView.filledGraphics = filledVisual;
    });

    // 4. Deteksi baris & kolom yang terisi penuh dengan ClearSystem
    const clearResult = ClearSystem.findCompleteLines(this.boardSystem);

    if (clearResult.linesCleared > 0) {
      // Hapus data sel di BoardSystem
      ClearSystem.clearCompleteLines(this.boardSystem);

      // Jalankan animasi penghapusan sel (durasi ~320ms)
      this.animateLineClears(clearResult, () => {
        this.finishPlacementCycle(block, slotIndex, clearResult);
      });
    } else {
      // Tidak ada garis yang terhapus
      this.finishPlacementCycle(block, slotIndex, clearResult);
    }
  }

  /**
   * Animasi penghapusan baris/kolom penuh (Flash + Shrink + Score Floater + Partikel Taktil)
   */
  animateLineClears(clearResult, onComplete) {
    const { clearedCells, linesCleared } = clearResult;

    // Suara & Haptic Clear Lines
    audioManager.playClear(linesCleared);
    HapticManager.clear();

    const graphicsToClear = [];
    let avgX = 0, avgY = 0;

    clearedCells.forEach(([r, c]) => {
      const cellView = this.boardCellViews[r][c];
      if (cellView && cellView.filledGraphics) {
        graphicsToClear.push(cellView.filledGraphics);
        avgX += cellView.x + this.cellSize / 2;
        avgY += cellView.y + this.cellSize / 2;
      }
    });

    if (clearedCells.length > 0) {
      avgX /= clearedCells.length;
      avgY /= clearedCells.length;
    }

    // Partikel ringan (jika MotionPrefs tidak reduced)
    if (!MotionPrefs.isReduced) {
      this.spawnClearParticles(avgX, avgY, clearResult);
    }

    // Tampilkan teks skor melayang singkat di dekat area clear
    const floaterText = this.add.text(avgX, avgY, `+${linesCleared * 10} LINE CLEAR!`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#2563eb',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(20);

    const floatDuration = MotionPrefs.isReduced ? 160 : ANIMATION_TIMINGS.SCORE_FLOAT_DURATION;
    this.tweens.add({
      targets: floaterText,
      y: avgY - (MotionPrefs.isReduced ? 15 : 40),
      alpha: 0,
      duration: floatDuration,
      ease: 'Cubic.easeOut',
      onComplete: () => floaterText.destroy()
    });

    // Animasi flash & shrink sel yang terhapus
    const clearDuration = MotionPrefs.isReduced ? 50 : ANIMATION_TIMINGS.CLEAR_DURATION;
    this.tweens.add({
      targets: graphicsToClear,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: clearDuration,
      ease: MotionPrefs.isReduced ? 'Linear' : 'Back.easeIn',
      onComplete: () => {
        clearedCells.forEach(([r, c]) => {
          const cellView = this.boardCellViews[r][c];
          if (cellView && cellView.filledGraphics) {
            cellView.filledGraphics.destroy();
            cellView.filledGraphics = null;
          }
        });

        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    });
  }

  /**
   * Partikel ringan berkecepatan tinggi saat garis terhapus
   */
  spawnClearParticles(originX, originY, clearResult) {
    const isMobileOrLow = typeof window !== 'undefined' && (
      window.innerWidth < 1024 ||
      (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 4)
    );

    const maxLimit = isMobileOrLow ? 10 : ANIMATION_TIMINGS.MAX_PARTICLES_PER_CLEAR;
    const particleCount = Math.min(
      maxLimit,
      clearResult.linesCleared * (isMobileOrLow ? 5 : 8)
    );
    const colors = [0x2563eb, 0x60a5fa, 0x38bdf8, 0xffffff];

    for (let i = 0; i < particleCount; i++) {
      const color = colors[i % colors.length];
      const particle = this.add.graphics();
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, Phaser.Math.Between(3, 4));
      particle.setPosition(originX, originY);
      particle.setDepth(15);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(40, isMobileOrLow ? 90 : 130);
      const targetX = originX + Math.cos(angle) * speed;
      const targetY = originY + Math.sin(angle) * speed;

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: isMobileOrLow ? 180 : Phaser.Math.Between(220, 300),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Menyelesaikan siklus setelah penempatan & animasi selesai
   */
  finishPlacementCycle(block, slotIndex, clearResult) {
    // 5. Hitung Skor & Combo lewat ScoreSystem
    const scoreResult = this.scoreSystem.processPlacement({
      placedCellsCount: block.coords.length,
      clearResult
    });

    // 6. Update Tracker Daily Challenge jika aktif
    if (this.mode === 'daily' && this.dailyTracker) {
      const prevDone = this.dailyTracker.getCompletedCount();
      const prevAllDone = this.dailyTracker.isAllCompleted();

      const changed = this.dailyTracker.update({
        score: this.scoreSystem.currentScore,
        totalLinesCleared: this.scoreSystem.totalLinesCleared,
        maxCombo: this.scoreSystem.maxCombo,
        recentLinesCleared: clearResult.linesCleared
      });

      const doneCount = this.dailyTracker.getCompletedCount();
      const allDone = this.dailyTracker.isAllCompleted();

      if (this.dailyMissionText) {
        this.dailyMissionText.setText(`MISI: ${doneCount}/3 SELESAI`);
      }

      // Notifikasi kecil saat target bertambah atau semua selesai
      if (doneCount > prevDone) {
        const notifMsg = allDone && !prevAllDone
          ? '★ SEMUA MISI SELESAI!'
          : `TARGET ${doneCount}/3 TERCAPAI!`;
        this.showToastNotification(notifMsg);
      }

      // Simpan kemajuan tantangan harian secara berkala
      StorageManager.saveDailyResult(this.dateKey, {
        completed: allDone,
        score: this.scoreSystem.currentScore,
        targetsDone: doneCount
      });
    }

    // 7. Update tampilan HUD (Skor & Combo)
    this.updateHUD(scoreResult);

    // Mainkan audio & haptic combo jika level combo bertambah
    if (scoreResult.newCombo >= 2 && scoreResult.scoreGained > 0) {
      audioManager.playCombo(scoreResult.newCombo);
      HapticManager.combo();
    }

    // 8. Tandai balok di tray telah terpakai
    this.blockSystem.markUsed(slotIndex);
    this.trayBlockContainers[slotIndex] = null;

    // 9. Jika seluruh balok di tray habis, generate set baru
    if (this.blockSystem.areAllUsed()) {
      this.replenishTray(true);
    }

    this.syncGameplayUI();

    // 10. Jika mode time dan waktu sudah habis saat animasi berlangsung, langsung trigger game over
    if (this.mode === 'time' && this.timerSystem && this.timerSystem.isFinished()) {
      this.triggerGameOver('time_out');
      return;
    }

    // 11. Cek kondisi Game Over (Papan Penuh)
    this.checkGameOverState();

    // Buka kembali kunci input drag (jika belum game over)
    if (!this.isGameOver) {
      this.isLocked = false;
    }
  }

  /**
   * Memperbarui tampilan skor dan combo di HUD
   */
  updateHUD(scoreResult) {
    if (this.scoreText) {
      this.scoreText.setText(this.scoreSystem.currentScore.toLocaleString());
    }

    const combo = this.scoreSystem.currentCombo;
    if (combo >= 2 && this.comboBadge && this.comboBadgeText) {
      this.comboBadge.clear();
      const badgeWidth = 92;
      const badgeHeight = 22;
      const badgeX = this.scale.width / 2;
      const badgeY = 138 + (this.mode === 'classic' ? 0 : 22);

      this.comboBadge.fillStyle(0xdc2c4f, 1);
      this.comboBadge.fillRoundedRect(badgeX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, 11);
      this.comboBadge.setVisible(true);

      this.comboBadgeText.setText(`x${combo} COMBO!`);
      this.comboBadgeText.setPosition(badgeX, badgeY);
      this.comboBadgeText.setVisible(true);

      this.tweens.add({
        targets: [this.comboBadge, this.comboBadgeText],
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 80,
        yoyo: true
      });
    } else {
      if (this.comboBadge) this.comboBadge.setVisible(false);
      if (this.comboBadgeText) this.comboBadgeText.setVisible(false);
    }
  }

  /**
   * Memeriksa kondisi Game Over karena papan penuh
   */
  checkGameOverState() {
    const availableBlocks = this.blockSystem.getAvailableBlocks();
    if (availableBlocks.length === 0) return;

    const hasAnyValidMove = availableBlocks.some(block => {
      return this.boardSystem.canPlaceAnywhere(block.coords);
    });

    if (!hasAnyValidMove) {
      this.triggerGameOver('board_full');
    }
  }

  /**
   * Memicu Game Over secara konsisten
   * @param {'board_full'|'time_out'} reason
   */
  triggerGameOver(reason = 'board_full') {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isLocked = true;

    // Audio & Haptic Game Over
    audioManager.playGameOver();
    HapticManager.gameOver();

    // Animasi papan meredup halus
    const { width, height } = this.scale;
    const fadeOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0b1c30, 0);
    fadeOverlay.setDepth(40);
    this.tweens.add({
      targets: fadeOverlay,
      fillAlpha: 0.28,
      duration: MotionPrefs.isReduced ? 80 : ANIMATION_TIMINGS.GAME_OVER_FADE_DURATION
    });

    if (this.dragSystem) {
      this.dragSystem.cancelDrag();
    }

    if (this.timerSystem) {
      this.timerSystem.pause();
    }

    // Jika mode daily, catat hasil akhir ke storage
    let dailyCompleted = false;
    if (this.mode === 'daily' && this.dailyTracker) {
      dailyCompleted = this.dailyTracker.isAllCompleted();
      const currentScore = this.scoreSystem.currentScore;
      const doneCount = this.dailyTracker.getCompletedCount();

      StorageManager.saveDailyResult(this.dateKey, {
        completed: dailyCompleted,
        score: currentScore,
        targetsDone: doneCount
      });

      // Simpan ke IndexedDB bila belum pernah selesai atau bila memperbaiki rekor hari itu
      StatisticsManager.getDaily(this.dateKey).then(existing => {
        const prevCompleted = existing ? existing.completed : false;
        const prevBest = existing ? existing.bestScore : 0;
        if (!prevCompleted || currentScore > prevBest) {
          StatisticsManager.saveDaily({
            date: this.dateKey,
            completed: prevCompleted || dailyCompleted,
            bestScore: Math.max(prevBest, currentScore),
            targetsDone: Math.max(existing ? existing.targetsDone : 0, doneCount)
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Rekam sesi game ke IndexedDB (async, non-blocking, kegagalan tidak memicu crash)
    StatisticsManager.addGame({
      mode: this.mode,
      score: this.scoreSystem.currentScore,
      linesCleared: this.scoreSystem.totalLinesCleared,
      maxCombo: this.scoreSystem.maxCombo,
      durationMs: this.durationSeconds * 1000,
      endReason: reason,
      date: this.dateKey
    }).catch(err => console.warn('addGame non-blocking error:', err));

    // Jeda singkat (~500 ms) agar pemain melihat kondisi akhir
    this.time.delayedCall(500, () => {
      window.dispatchEvent(new CustomEvent('blockora:game-over', {
        detail: {
          score: this.scoreSystem.currentScore,
          linesCleared: this.scoreSystem.totalLinesCleared,
          maxCombo: this.scoreSystem.maxCombo,
          durationSeconds: this.durationSeconds,
          mode: this.mode,
          reason,
          dailyCompleted
        }
      }));
    });
  }

  /**
   * Menampilkan toast notification singkat di tengah atas layar
   * @param {string} message
   */
  showToastNotification(message) {
    const width = this.scale.width;
    const toast = this.add.container(width / 2, 210).setDepth(30);

    const bg = this.add.rectangle(0, 0, 240, 36, 0x166534)
      .setStrokeStyle(1.5, 0x86efac);
    const txt = this.add.text(0, 0, message, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 0.5
    }).setOrigin(0.5);

    toast.add([bg, txt]);
    toast.setAlpha(0);
    toast.setScale(0.85);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: 195,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            y: 175,
            duration: 250,
            ease: 'Cubic.easeIn',
            onComplete: () => toast.destroy()
          });
        });
      }
    });
  }

  /**
   * Menjeda permainan
   */
  pauseGame() {
    if (this.isGameOver || this.isPaused) return;
    this.isPaused = true;
    this.isLocked = true;
    if (this.dragSystem) this.dragSystem.cancelDrag();
    if (this.timerSystem) this.timerSystem.pause();

    window.dispatchEvent(new CustomEvent('blockora:open-pause'));
  }

  /**
   * Melanjutkan permainan setelah jeda
   */
  resumeGame() {
    this.isPaused = false;
    this.isLocked = false;
    if (this.mode === 'time' && this.timerSystem && this.hasMadeFirstMove) {
      this.timerSystem.resume();
    }
  }

  /**
   * Mereset seluruh kondisi game kembali ke awal
   */
  restartGame() {
    this.tweens.killAll();

    // 1. Reset Papan
    this.boardSystem.reset();
    if (this.boardCellViews && this.boardCellViews.length === BOARD_SIZE) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (!this.boardCellViews[r]) continue;
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cellView = this.boardCellViews[r][c];
          if (cellView && cellView.filledGraphics) {
            cellView.filledGraphics.destroy();
            cellView.filledGraphics = null;
          }
        }
      }
    }

    if (this.previewGraphics) {
      this.previewGraphics.clear();
    }

    // 2. Reset Status & Skor
    this.scoreSystem.reset();
    this.durationSeconds = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.isLocked = false;
    this.hasMadeFirstMove = false;

    // 3. Konfigurasi Timer jika mode 'time'
    if (this.mode === 'time') {
      if (this.timerSystem) {
        this.timerSystem.destroy();
      }
      this.timerSystem = new TimerSystem(120, {
        onTick: (sec, fmt) => {
          if (this.timerText) {
            this.timerText.setText(fmt);
            if (sec <= 10) {
              this.timerText.setColor('#ba1a1a');
              audioManager.playTimerTick();
            } else {
              this.timerText.setColor('#004ac6');
            }
          }
          this.syncGameplayUI();
        },
        onFinish: () => {
          if (!this.isLocked) {
            this.triggerGameOver('time_out');
          }
        }
      });
      if (this.timerContainer) this.timerContainer.setVisible(true);
      if (this.timerText) this.timerText.setText('02:00').setColor('#004ac6');
    } else {
      if (this.timerContainer) this.timerContainer.setVisible(false);
    }

    // 4. Konfigurasi Daily Challenge jika mode 'daily'
    if (this.mode === 'daily') {
      this.dailyRng = getDailyRng(this.dateKey);
      const dailyConfig = generateDailyConfig(this.dateKey);
      this.dailyTracker = new DailyTracker(dailyConfig.targets);

      if (this.dailyMissionChip) this.dailyMissionChip.setVisible(true);
      if (this.dailyMissionText) this.dailyMissionText.setText('MISI: 0/3 SELESAI');
    } else {
      this.dailyRng = null;
      this.dailyTracker = null;
      if (this.dailyMissionChip) this.dailyMissionChip.setVisible(false);
    }

    // 5. Update Badge Mode
    const modeConfig = GAME_MODES[this.mode] || GAME_MODES.classic;
    if (this.modeBadgeText) {
      this.modeBadgeText.setText(modeConfig.badge);
    }

    // 6. Reset Tray
    this.replenishTray(true);

    // 7. Update HUD
    this.updateHUD({ currentScore: 0, newCombo: 0 });
    this.syncGameplayUI();
  }

  /**
   * Menempatkan balok dari antarmuka HTML GameplayUI
   * @param {number} slotIndex
   * @param {Object} block
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  tryPlaceBlockFromUI(slotIndex, block, row, col) {
    if (this.isLocked || this.isPaused || this.isGameOver) return false;
    if (!block || !block.coords) return false;
    if (!this.boardSystem.canPlace(block.coords, row, col)) return false;

    const success = this.boardSystem.place(block.coords, row, col, block.color?.id || 1);
    if (!success) return false;

    this.handleBlockPlaced({ block, slotIndex, row, col });
    return true;
  }

  /**
   * Menampilkan preview ghost penempatan balok (Hardware Texture Sprite Pooling)
   * @param {Object} block
   * @param {number} row
   * @param {number} col
   */
  setHoverPreview(block, row, col) {
    if (!block || !block.coords || this.isLocked || this.isPaused || this.isGameOver) {
      this.clearHoverPreview();
      return;
    }

    // Hindari komputasi berulang jika kursor masih berada di sel yang sama
    if (this._lastHoverRow === row && this._lastHoverCol === col && this._lastHoverBlock === block) {
      return;
    }
    this._lastHoverRow = row;
    this._lastHoverCol = col;
    this._lastHoverBlock = block;

    const canPlace = this.boardSystem.canPlace(block.coords, row, col);
    const step = this.cellSize + this.cellGap;
    const tex = canPlace ? 'preview_valid' : 'preview_invalid';

    if (!this.previewSprites) this.previewSprites = [];
    while (this.previewSprites.length < block.coords.length) {
      const s = this.add.image(0, 0, tex).setOrigin(0, 0).setDepth(5).setVisible(false);
      this.previewSprites.push(s);
    }

    let spriteIdx = 0;
    const coords = block.coords;
    const len = coords.length;
    const boardOriginX = this.boardOriginX;
    const boardOriginY = this.boardOriginY;

    for (let i = 0; i < len; i++) {
      const targetRow = row + coords[i][0];
      const targetCol = col + coords[i][1];

      if (targetRow >= 0 && targetRow < BOARD_SIZE && targetCol >= 0 && targetCol < BOARD_SIZE) {
        const sprite = this.previewSprites[spriteIdx++];
        if (sprite.texture.key !== tex) {
          sprite.setTexture(tex);
        }
        const posX = boardOriginX + (targetCol * step);
        const posY = boardOriginY + (targetRow * step);
        if (sprite.x !== posX || sprite.y !== posY) {
          sprite.setPosition(posX, posY);
        }
        if (!sprite.visible) {
          sprite.setVisible(true);
        }
      }
    }

    const totalSprites = this.previewSprites.length;
    for (let i = spriteIdx; i < totalSprites; i++) {
      if (this.previewSprites[i].visible) {
        this.previewSprites[i].setVisible(false);
      }
    }
  }

  /**
   * Menghapus preview ghost penempatan balok
   */
  clearHoverPreview() {
    this._lastHoverRow = null;
    this._lastHoverCol = null;
    this._lastHoverBlock = null;

    if (this.previewSprites) {
      const len = this.previewSprites.length;
      for (let i = 0; i < len; i++) {
        if (this.previewSprites[i].visible) {
          this.previewSprites[i].setVisible(false);
        }
      }
    }
    if (this.previewGraphics) {
      this.previewGraphics.clear();
    }
  }

  /**
   * Sinkronisasi data hidup ke antarmuka HTML GameplayUI
   */
  syncGameplayUI() {
    const emptyCells = this.boardSystem ? this.boardSystem.getEmptyCount() : 100;
    const currentScore = this.scoreSystem ? this.scoreSystem.currentScore : 0;
    const currentCombo = this.scoreSystem ? this.scoreSystem.currentCombo : 0;
    let timerStr = '00:00';
    if (this.mode === 'time' && this.timerSystem) {
      timerStr = this.timerSystem.getFormattedTime();
    } else {
      const mins = Math.floor(this.durationSeconds / 60);
      const secs = this.durationSeconds % 60;
      timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const gameplayUI = window.blockoraApp?.gameplayUI;
    if (gameplayUI) {
      gameplayUI.updateLiveState({
        score: currentScore,
        combo: currentCombo,
        emptyCells,
        timerStr
      });
      if (this.blockSystem) {
        const blocks = this.blockSystem.getBlocks();
        if (blocks && blocks.length > 0) {
          gameplayUI.updateDeck(blocks);
        }
      }
    }
  }
}
