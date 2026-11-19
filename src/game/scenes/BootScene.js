import Phaser from 'phaser';

/**
 * BootScene - Inisialisasi awal Phaser & aset dasar
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Tahap 1: Belum memuat aset besar, siap untuk tahap berikutnya
  }

  create() {
    // Pindah ke GameScene
    this.scene.start('GameScene');
  }
}
