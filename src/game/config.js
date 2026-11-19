import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';

/**
 * Konfigurasi utama game Phaser untuk Papan BLOCKORA (10x10)
 * Mounts langsung ke dalam wadah kartu papan HTML Stitch (#blockora-board)
 */
export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'blockora-board',
  backgroundColor: '#e5eeff',
  pixelArt: false,
  antialias: false,
  roundPixels: true,
  resolution: Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 1.5),
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 444,
    height: 444
  },
  render: {
    powerPreference: 'high-performance',
    batchSize: 512
  },
  scene: [BootScene, GameScene]
};

let gameInstance = null;

/**
 * Memulai atau mengembalikan instance game Phaser
 */
export function initGame() {
  if (!gameInstance) {
    const parentEl = document.getElementById('blockora-board') ? 'blockora-board' : 'game-container';
    gameConfig.parent = parentEl;
    gameInstance = new Phaser.Game(gameConfig);
  }
  return gameInstance;
}

/**
 * Mengambil instance game
 */
export function getGame() {
  return gameInstance;
}

/**
 * Menghancurkan instance Phaser secara bersih
 */
export function destroyGame() {
  if (gameInstance) {
    try {
      gameInstance.destroy(true);
    } catch (e) {
      console.warn('Peringatan saat menghancurkan Phaser instance:', e);
    }
    gameInstance = null;
  }
}
