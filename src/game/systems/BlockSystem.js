import { SHAPES, BLOCK_COLORS, TRAY_SLOTS } from '../constants.js';

/**
 * BlockSystem - Pengelola pembuatan dan status balok di tray (murni JavaScript).
 * 
 * PENTING:
 * Fungsi pemilihan acak menerima parameter `rng` (fungsi generator angka 0..1).
 * Jangan panggil `Math.random()` langsung di dalam algoritma pemilihan, agar
 * mode Daily Challenge nantinya dapat menyuplai seed RNG yang deterministik.
 */
export class BlockSystem {
  constructor() {
    this.currentBlocks = [];
    this.idCounter = 0;
  }

  get slots() {
    return this.currentBlocks;
  }

  /**
   * Menghasilkan 1 bentuk balok secara acak berdasarkan bobot (weight)
   * @param {() => number} rng Fungsi RNG (default: Math.random)
   * @returns {object} Shape object dari SHAPES
   */
  pickWeightedShape(rng = Math.random) {
    const totalWeight = SHAPES.reduce((sum, s) => sum + s.weight, 0);
    const rand = rng() * totalWeight;

    let accumulated = 0;
    for (let i = 0; i < SHAPES.length; i++) {
      accumulated += SHAPES[i].weight;
      if (rand <= accumulated) {
        return SHAPES[i];
      }
    }
    return SHAPES[0];
  }

  /**
   * Memilih 1 warna secara acak dari palet
   * @param {() => number} rng Fungsi RNG (default: Math.random)
   * @returns {object} Objek warna dari BLOCK_COLORS
   */
  pickRandomColor(rng = Math.random) {
    const index = Math.floor(rng() * BLOCK_COLORS.length);
    return BLOCK_COLORS[index] || BLOCK_COLORS[0];
  }

  /**
   * Menghasilkan 1 set berisi 3 balok untuk tray
   * @param {() => number} rng Generator angka acak (0..1)
   * @returns {Array<object>} Daftar 3 balok baru
   */
  generateSet(rng = Math.random) {
    const newBlocks = [];

    for (let slot = 0; slot < TRAY_SLOTS; slot++) {
      this.idCounter++;
      const shape = this.pickWeightedShape(rng);
      const color = this.pickRandomColor(rng);

      newBlocks.push({
        id: `block_${this.idCounter}_${shape.id}`,
        slotIndex: slot,
        shapeId: shape.id,
        coords: shape.coords.map(([r, c]) => [r, c]), // Salinan koordinat [row, col]
        color: { ...color },
        used: false
      });
    }

    this.currentBlocks = newBlocks;
    return newBlocks;
  }

  /**
   * Mengambil daftar balok yang saat ini ada di tray
   * @returns {Array<object>}
   */
  getBlocks() {
    return this.currentBlocks;
  }

  /**
   * Menandai balok pada slot tertentu telah ditempatkan/terpakai
   * @param {number} slotIndex 
   * @returns {boolean} True jika berhasil ditandai
   */
  markUsed(slotIndex) {
    const block = this.currentBlocks.find(b => b.slotIndex === slotIndex);
    if (block && !block.used) {
      block.used = true;
      return true;
    }
    return false;
  }

  /**
   * Menandai balok berdasarkan ID uniknya
   * @param {string} blockId 
   * @returns {boolean} True jika berhasil
   */
  markUsedById(blockId) {
    const block = this.currentBlocks.find(b => b.id === blockId);
    if (block && !block.used) {
      block.used = true;
      return true;
    }
    return false;
  }

  /**
   * Memeriksa apakah ketiga balok di tray sudah terpakai
   * @returns {boolean}
   */
  areAllUsed() {
    if (this.currentBlocks.length === 0) return true;
    return this.currentBlocks.every(b => b.used);
  }

  /**
   * Mengambil balok-balok yang masih aktif (belum digunakan)
   * @returns {Array<object>}
   */
  getAvailableBlocks() {
    return this.currentBlocks.filter(b => !b.used);
  }
}
