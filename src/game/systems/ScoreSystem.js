import { SCORE_RULES } from '../constants.js';

/**
 * ScoreSystem - Sistem kalkulasi skor dan combo permainan (murni JavaScript).
 * 
 * RUMUS PERHITUNGAN SKOR PER PENEMPATAN:
 * 1. Poin Sel Ditempatkan (cellScore):
 *    cellScore = placedCellsCount * SCORE_RULES.POINTS_PER_CELL (+1 per kotak balok)
 * 
 * 2. Poin Garis Penuh (lineScore):
 *    lineScore = linesCleared * SCORE_RULES.POINTS_PER_LINE (+10 per baris/kolom)
 * 
 * 3. Bonus Multi-Garis (multiLineBonus):
 *    Jika linesCleared >= 2, diberikan bonus tambahan:
 *    - 2 garis: +20
 *    - 3 garis: +40
 *    - 4 garis: +70
 *    - 5+ garis: +100
 * 
 * 4. Poin Combo (comboBonus):
 *    - Jika penempatan menghapus minimal 1 garis: newCombo = currentCombo + 1
 *    - Jika penempatan tidak menghapus garis apa pun: newCombo = 0
 *    - Jika newCombo >= 2: comboBonus = (newCombo - 1) * SCORE_RULES.COMBO_BONUS_PER_LEVEL (+10, +20, +30...)
 * 
 * Total Poin Didapat (scoreGained):
 * scoreGained = cellScore + lineScore + multiLineBonus + comboBonus
 */
export class ScoreSystem {
  constructor() {
    this.currentScore = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.totalLinesCleared = 0;
    this.placedPiecesCount = 0;
  }

  /**
   * Fungsi murni untuk menghitung perolehan poin dari suatu aksi penempatan
   * @param {object} params
   * @param {number} params.placedCellsCount Jumlah sel dari balok yang diletakkan
   * @param {number} params.linesCleared Jumlah garis (baris + kolom) yang terhapus
   * @param {number} params.currentCombo Nilai combo saat ini sebelum aksi
   * @returns {{ scoreGained: number, newCombo: number, cellScore: number, lineScore: number, multiLineBonus: number, comboBonus: number }}
   */
  static calculateScore({ placedCellsCount = 0, linesCleared = 0, currentCombo = 0 }) {
    // 1. Poin sel
    const cellScore = placedCellsCount * SCORE_RULES.POINTS_PER_CELL;

    // 2. Poin garis
    const lineScore = linesCleared * SCORE_RULES.POINTS_PER_LINE;

    // 3. Bonus multi-garis
    let multiLineBonus = 0;
    if (linesCleared >= 2) {
      if (linesCleared === 2) multiLineBonus = SCORE_RULES.MULTI_LINE_BONUS[2];
      else if (linesCleared === 3) multiLineBonus = SCORE_RULES.MULTI_LINE_BONUS[3];
      else if (linesCleared === 4) multiLineBonus = SCORE_RULES.MULTI_LINE_BONUS[4];
      else multiLineBonus = SCORE_RULES.MULTI_LINE_BONUS[5];
    }

    // 4. Hitung combo baru
    let newCombo = 0;
    let comboBonus = 0;

    if (linesCleared > 0) {
      newCombo = currentCombo + 1;
      if (newCombo >= 2) {
        comboBonus = (newCombo - 1) * SCORE_RULES.COMBO_BONUS_PER_LEVEL;
      }
    } else {
      newCombo = 0;
    }

    const scoreGained = cellScore + lineScore + multiLineBonus + comboBonus;

    return {
      scoreGained,
      newCombo,
      cellScore,
      lineScore,
      multiLineBonus,
      comboBonus
    };
  }

  /**
   * Memproses hasil penempatan balok dan memperbarui state sesi
   * @param {object} params
   * @param {number} params.placedCellsCount
   * @param {object} params.clearResult Hasil dari ClearSystem
   * @returns {{ scoreGained: number, newCombo: number, currentScore: number }}
   */
  processPlacement({ placedCellsCount, clearResult }) {
    const linesCleared = clearResult ? clearResult.linesCleared : 0;

    const result = ScoreSystem.calculateScore({
      placedCellsCount,
      linesCleared,
      currentCombo: this.currentCombo
    });

    this.currentScore += result.scoreGained;
    this.currentCombo = result.newCombo;
    this.placedPiecesCount += 1;

    if (this.currentCombo > this.maxCombo) {
      this.maxCombo = this.currentCombo;
    }

    this.totalLinesCleared += linesCleared;

    return {
      scoreGained: result.scoreGained,
      newCombo: this.currentCombo,
      currentScore: this.currentScore,
      breakdown: result
    };
  }

  /**
   * Mengambil statistik sesi permainan saat ini
   */
  getStats() {
    return {
      score: this.currentScore,
      combo: this.currentCombo,
      maxCombo: this.maxCombo,
      linesCleared: this.totalLinesCleared,
      placedPieces: this.placedPiecesCount
    };
  }

  /**
   * Mereset seluruh statistik skor kembali ke 0
   */
  reset() {
    this.currentScore = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.totalLinesCleared = 0;
    this.placedPiecesCount = 0;
  }
}
