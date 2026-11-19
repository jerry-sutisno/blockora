/**
 * DailyChallenge.js - Logika Tantangan Harian (JS Murni).
 * Menghasilkan target harian yang deterministik berdasarkan tanggal lokal 'YYYY-MM-DD',
 * melacak progres misi harian, dan mengecek kelulusan tantangan.
 */

import { DAILY_TARGET_TYPES } from './constants.js';
import { createSeededRng } from '../utils/Random.js';
import { todayKey } from '../utils/DateHelper.js';

const DAILY_THEMES = [
  'Gelombang Azure',
  'Pilar Keseimbangan',
  'Harmoni Garis',
  'Lompatan Ganda',
  'Pola Kristal',
  'Irama Ruang',
  'Bintang Fajar',
  'Simetri Sempurna',
  'Ketukan Presisi',
  'Cahaya Minimal'
];

/**
 * Menghasilkan konfigurasi misi harian deterministik untuk tanggal tertentu.
 * @param {string} [dateStr] Tanggal 'YYYY-MM-DD' (default: hari ini lokal)
 * @returns {{
 *   dateKey: string,
 *   themeName: string,
 *   targets: Array<{ id: string, type: string, label: string, target: number, current: number, completed: boolean }>
 * }}
 */
export function generateDailyConfig(dateStr = todayKey()) {
  const rng = createSeededRng(`daily-mission-${dateStr}`);

  // Pilih tema harian
  const themeIndex = Math.floor(rng() * DAILY_THEMES.length);
  const themeName = DAILY_THEMES[themeIndex];

  // Target 1: Skor (400 - 900, kelipatan 50)
  const scoreBase = 400 + Math.floor(rng() * 11) * 50; // 400 .. 900
  const targetScore = {
    id: 'score',
    type: DAILY_TARGET_TYPES.SCORE,
    label: `Capai skor ${scoreBase} poin`,
    target: scoreBase,
    current: 0,
    completed: false
  };

  // Target 2: Garis (6 - 14 garis)
  const linesBase = 6 + Math.floor(rng() * 9); // 6 .. 14
  const targetLines = {
    id: 'lines',
    type: DAILY_TARGET_TYPES.LINES,
    label: `Bersihkan total ${linesBase} garis`,
    target: linesBase,
    current: 0,
    completed: false
  };

  // Target 3: Combo streak (3 - 4) atau Multi-line clear (2 - 4 kali)
  const useCombo = rng() > 0.5;
  let targetAction;

  if (useCombo) {
    const comboBase = 3 + Math.floor(rng() * 2); // 3 atau 4
    targetAction = {
      id: 'combo',
      type: DAILY_TARGET_TYPES.COMBO,
      label: `Raih combo streak ${comboBase}x`,
      target: comboBase,
      current: 0,
      completed: false
    };
  } else {
    const multiBase = 2 + Math.floor(rng() * 3); // 2 .. 4
    targetAction = {
      id: 'multi_line',
      type: DAILY_TARGET_TYPES.MULTI_LINE,
      label: `Hapus 2+ garis sekaligus ${multiBase} kali`,
      target: multiBase,
      current: 0,
      completed: false
    };
  }

  return {
    dateKey: dateStr,
    themeName,
    targets: [targetScore, targetLines, targetAction]
  };
}

/**
 * Class Tracker untuk memantau status target harian saat gameplay berlangsung.
 */
export class DailyTracker {
  /**
   * @param {Array} targets Daftar target dari generateDailyConfig
   */
  constructor(targets) {
    // Kloning target agar tidak memutasi konfigurasi mentah
    this.targets = targets.map(t => ({ ...t, current: 0, completed: false }));
    this.multiLineCount = 0;
  }

  /**
   * Perbarui progres berdasarkan perubahan state game.
   * Dipanggil setiap kali ada penempatan balok / clear garis.
   * @param {Object} state
   * @param {number} state.score Skor total saat ini
   * @param {number} state.totalLinesCleared Total garis yang sudah dihapus sesi ini
   * @param {number} state.maxCombo Combo tertinggi sesi ini
   * @param {number} [state.recentLinesCleared=0] Jumlah garis yang baru saja dihapus di giliran ini
   */
  update(state) {
    if (state.recentLinesCleared >= 2) {
      this.multiLineCount++;
    }

    let changed = false;

    for (const t of this.targets) {
      const prevCompleted = t.completed;

      switch (t.type) {
        case DAILY_TARGET_TYPES.SCORE:
          t.current = Math.min(t.target, state.score || 0);
          break;
        case DAILY_TARGET_TYPES.LINES:
          t.current = Math.min(t.target, state.totalLinesCleared || 0);
          break;
        case DAILY_TARGET_TYPES.COMBO:
          t.current = Math.min(t.target, state.maxCombo || 0);
          break;
        case DAILY_TARGET_TYPES.MULTI_LINE:
          t.current = Math.min(t.target, this.multiLineCount);
          break;
      }

      t.completed = t.current >= t.target;
      if (t.completed !== prevCompleted) {
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Cek apakah seluruh (3) target sudah terpenuhi
   * @returns {boolean}
   */
  isAllCompleted() {
    return this.targets.every(t => t.completed);
  }

  /**
   * Dapatkan jumlah target yang sudah selesai (0 s/d 3)
   * @returns {number}
   */
  getCompletedCount() {
    return this.targets.filter(t => t.completed).length;
  }

  /**
   * Status ringkasan untuk disimpan ke Storage
   * @returns {Object}
   */
  serialize() {
    return {
      allCompleted: this.isAllCompleted(),
      completedCount: this.getCompletedCount(),
      targets: this.targets.map(t => ({
        id: t.id,
        current: t.current,
        target: t.target,
        completed: t.completed
      }))
    };
  }
}
