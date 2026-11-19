import './style.css';
import { initGame, destroyGame } from './game/config.js';
import { MenuUI } from './ui/MenuUI.js';
import { DailyUI } from './ui/DailyUI.js';
import { StatisticsUI } from './ui/StatisticsUI.js';
import { SettingsUI } from './ui/SettingsUI.js';
import { LeaderboardUI } from './ui/LeaderboardUI.js';
import { ResultUI } from './ui/ResultUI.js';
import { GameplayUI } from './ui/GameplayUI.js';
import { Modal } from './ui/Modal.js';
import { StorageManager } from './storage/StorageManager.js';
import { audioManager } from './audio/AudioManager.js';
import { MotionPrefs } from './utils/MotionPrefs.js';
import { PWAManager } from './utils/PWAManager.js';
import { todayKey } from './utils/DateHelper.js';

/**
 * ScreenNavigator - Sistem navigasi antarmuka HTML, kanvas Phaser, modal dialog,
 * layar tantangan harian, statistik, pengaturan, dan papan rekor.
 */
class ScreenNavigator {
  constructor() {
    this.menuElement = document.getElementById('screen-menu');
    this.dailyElement = document.getElementById('screen-daily');
    this.statsElement = document.getElementById('screen-stats');
    this.settingsElement = document.getElementById('screen-settings');
    this.leaderboardElement = document.getElementById('screen-leaderboard');
    this.gameElement = document.getElementById('game-container');
    this.resultElement = document.getElementById('screen-result');
    this.modalElement = document.getElementById('modal-container');

    this.currentScreen = null;
    this.phaserGame = null;
    this.activeMode = 'classic';
    this.activeDateKey = todayKey();

    window.blockoraApp = this;

    // 1. Inisialisasi UI Menu
    this.menuUI = new MenuUI({
      onSelectMode: (mode) => {
        if (mode === 'daily') {
          this.showScreen('daily');
        } else {
          this.activeMode = mode;
          this.startFreshGame(mode);
        }
      },
      onOpenDaily: () => this.showScreen('daily'),
      onOpenStats: () => this.showScreen('stats'),
      onOpenSettings: () => this.showScreen('settings'),
      onOpenLeaderboard: () => this.showScreen('leaderboard')
    });

    // 2. Inisialisasi Layar Daily Challenge
    this.dailyUI = new DailyUI({
      onBack: () => this.showScreen('menu'),
      onStartChallenge: (dateKey) => {
        this.activeMode = 'daily';
        this.activeDateKey = dateKey || todayKey();
        this.startFreshGame('daily', this.activeDateKey);
      }
    });

    // 3. Inisialisasi Layar Statistik
    this.statsUI = new StatisticsUI({
      onBack: () => this.showScreen('menu')
    });

    // 4. Inisialisasi Layar Pengaturan (Settings)
    this.settingsUI = new SettingsUI({
      onBack: () => this.showScreen('menu'),
      onResetComplete: () => {
        this.showScreen('menu');
      }
    });

    // 5. Inisialisasi Layar Leaderboard Lokal
    this.leaderboardUI = new LeaderboardUI({
      onBack: () => this.showScreen('menu')
    });

    // 6. Inisialisasi Result UI
    this.resultUI = new ResultUI({
      onPlayAgain: (mode) => {
        this.startFreshGame(mode || this.activeMode, this.activeDateKey);
      },
      onMainMenu: () => this.showScreen('menu')
    });

    // 7. Inisialisasi Modal Dialog (Pause)
    this.modal = new Modal({
      onResume: () => {
        const gameScene = this.getGameScene();
        if (gameScene) gameScene.resumeGame();
      },
      onRestart: () => {
        this.startFreshGame(this.activeMode, this.activeDateKey);
      },
      onMainMenu: () => {
        this.showScreen('menu');
      }
    });

    // 8. Inisialisasi Layar Gameplay
    this.gameplayUI = new GameplayUI({
      onBack: () => {
        const gameScene = this.getGameScene();
        if (gameScene && !gameScene.isPaused && !gameScene.isGameOver) {
          gameScene.pauseGame();
        } else {
          this.showScreen('menu');
        }
      },
      onRestart: () => {
        this.startFreshGame(this.activeMode, this.activeDateKey);
      },
      onPause: () => {
        const gameScene = this.getGameScene();
        if (gameScene) gameScene.pauseGame();
      }
    });

    this.init();
  }

  async init() {
    // Inisialisasi preferensi animasi & aksesibilitas
    MotionPrefs.init();

    // Inisialisasi PWA Life-Cycle & Offline Manager
    PWAManager.init();

    // Jalankan migrasi data satu kali dari LocalStorage ke IndexedDB bila belum pernah
    await StorageManager.migrateIfNeeded();

    // Render Main Menu awal
    this.menuUI.render(this.menuElement);

    // Listener global untuk event game
    window.addEventListener('blockora:return-menu', () => {
      audioManager.playUIClick();
      this.showScreen('menu');
    });

    // Tangani tombol kembali sistem Android (prevent sudden close)
    window.addEventListener('blockora:system-back', () => {
      if (this.currentScreen === 'game') {
        const gameScene = this.getGameScene();
        if (gameScene && !gameScene.isPaused && !gameScene.isGameOver) {
          gameScene.pauseGame();
        }
      } else if (this.currentScreen !== 'menu') {
        this.showScreen('menu');
      }
    });

    window.addEventListener('blockora:open-pause', () => {
      audioManager.stopBGM();
      this.modal.showPause(this.modalElement);
    });

    window.addEventListener('blockora:game-over', (event) => {
      audioManager.stopBGM();
      this.gameElement.classList.remove('active');
      this.gameplayUI.hide();
      destroyGame();
      this.phaserGame = null;
      this.currentScreen = 'result';
      const sessionData = event.detail || {};
      this.resultUI.show(this.resultElement, sessionData);
    });

    // Keyboard shortcut global: tombol Escape untuk pause / resume
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.currentScreen === 'game') {
          const gameScene = this.getGameScene();
          if (gameScene) {
            if (gameScene.isPaused) {
              this.modal.hide();
              gameScene.resumeGame();
              if (audioManager.bgmEnabled) audioManager.startBGM();
            } else if (!gameScene.isGameOver) {
              gameScene.pauseGame();
            }
          }
        }
      }
    });

    // Tampilkan menu awal
    this.showScreen('menu');
  }

  getGameScene() {
    if (this.phaserGame) {
      return this.phaserGame.scene.getScene('GameScene');
    }
    return null;
  }

  /**
   * Memulai sesi permainan baru dengan mode tertentu
   * @param {string} [mode='classic']
   * @param {string} [dateKey]
   */
  startFreshGame(mode = 'classic', dateKey = todayKey()) {
    this.activeMode = mode;
    this.activeDateKey = dateKey;

    this.resultUI.hide();
    this.modal.hide();
    this.showScreen('game');

    const boardMount = document.getElementById('blockora-board');

    if (!this.phaserGame) {
      this.phaserGame = initGame();
      const checkScene = setInterval(() => {
        const scene = this.getGameScene();
        if (scene && scene.scene.isActive()) {
          clearInterval(checkScene);
          this.gameplayUI.setGameScene(scene);
          if (boardMount && this.phaserGame.canvas && this.phaserGame.canvas.parentElement !== boardMount) {
            boardMount.appendChild(this.phaserGame.canvas);
          }
          scene.init({ mode, dateKey });
          scene.restartGame();
          scene.syncGameplayUI();
        }
      }, 50);
    } else {
      if (boardMount && this.phaserGame.canvas && this.phaserGame.canvas.parentElement !== boardMount) {
        boardMount.appendChild(this.phaserGame.canvas);
      }
      const gameScene = this.getGameScene();
      if (gameScene) {
        this.gameplayUI.setGameScene(gameScene);
        gameScene.init({ mode, dateKey });
        gameScene.restartGame();
        gameScene.syncGameplayUI();
      }
    }
  }

  showScreen(screenName) {
    this.currentScreen = screenName;
    this.modal.hide();
    this.resultUI.hide();

    // Sembunyikan semua screen non-game
    this.menuUI.hide();
    this.dailyUI.hide();
    this.statsUI.hide();
    this.settingsUI.hide();
    this.leaderboardUI.hide();

    // Jika berpindah keluar dari layar game, hancurkan instance Phaser secara bersih
    if (screenName !== 'game' && this.phaserGame) {
      destroyGame();
      this.phaserGame = null;
    }

    if (screenName === 'menu') {
      audioManager.stopBGM();
      this.gameElement.classList.remove('active');
      this.gameplayUI.hide();
      this.menuUI.show();
    } else if (screenName === 'daily') {
      audioManager.stopBGM();
      this.gameElement.classList.remove('active');
      this.gameplayUI.hide();
      this.dailyUI.show(this.dailyElement);
    } else if (screenName === 'stats') {
      audioManager.stopBGM();
      this.gameElement.classList.remove('active');
      this.gameplayUI.hide();
      this.statsUI.show(this.statsElement);
    } else if (screenName === 'settings') {
      audioManager.stopBGM();
      this.gameElement.classList.remove('active');
      this.gameplayUI.hide();
      this.settingsUI.show(this.settingsElement);
    } else if (screenName === 'leaderboard') {
      audioManager.stopBGM();
      this.gameElement.classList.remove('active');
      this.gameplayUI.hide();
      this.statsUI.show(this.statsElement);
    } else if (screenName === 'result') {
      audioManager.stopBGM();
      this.gameElement.classList.remove('active');
      this.gameplayUI.hide();
      this.resultUI.show(this.resultElement);
    } else if (screenName === 'game') {
      if (audioManager.bgmEnabled) audioManager.startBGM();
      this.gameElement.classList.add('active');
      this.gameplayUI.show(this.gameElement, { mode: this.activeMode, dateKey: this.activeDateKey });
      const boardMount = document.getElementById('blockora-board');
      if (boardMount && this.phaserGame?.canvas && this.phaserGame.canvas.parentElement !== boardMount) {
        boardMount.appendChild(this.phaserGame.canvas);
      }
      if (this.phaserGame) {
        this.phaserGame.scene.resume('GameScene');
        const scene = this.getGameScene();
        if (scene) {
          this.gameplayUI.setGameScene(scene);
          scene.syncGameplayUI();
        }
      }
    }
  }
}

// Cegah context menu bawaan browser
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Jalankan navigator saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  new ScreenNavigator();
});
