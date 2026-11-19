/**
 * AudioPitchHelper.js - Logika murni untuk pemetaan frekuensi nada SFX dan combo
 * Dapat diuji tanpa Web Audio API mock.
 */

// Tangga nada pentatonik dasar (Hz)
export const PENTATONIC_BASE = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4, D4, E4, G4, A4

/**
 * Menghitung frekuensi nada combo berdasarkan level combo dengan batas atas yang aman
 * @param {number} comboLevel Level combo (1, 2, 3, ...)
 * @param {number} [maxCapLevel=8] Batas atas level agar frekuensi tidak memekakkan telinga
 * @returns {number} Frekuensi dalam Hertz
 */
export function getComboPitch(comboLevel, maxCapLevel = 8) {
  const safeLevel = Math.max(1, Math.min(comboLevel, maxCapLevel));
  // Nada dasar 440Hz (A4), naik secara kromatik atau pentatonik halus
  // Interval 1.5 semitone per level
  const semitones = (safeLevel - 1) * 1.5;
  const freq = 440 * Math.pow(2, semitones / 12);
  return Math.round(freq * 100) / 100;
}

/**
 * Menghitung urutan frekuensi arpeggio untuk clear garis (1 s/d 4+ garis)
 * @param {number} linesCleared Jumlah baris/kolom yang dihapus
 * @returns {Array<number>} Array frekuensi nada
 */
export function getClearPitchSequence(linesCleared) {
  const count = Math.max(1, Math.min(linesCleared, 5));
  const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
  return baseFreqs.slice(0, count);
}
