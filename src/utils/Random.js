/**
 * Random.js - Generator angka acak berbobot dan ber-seed (PRNG) deterministik.
 * Menggunakan algoritma Mulberry32 32-bit yang cepat dan andal.
 */

/**
 * Menghasilkan hash 32-bit integer dari sebuah string (mis. string tanggal '2026-11-18')
 * Menggunakan variasi hash cyrb53 / FNV-1a yang terdistribusi merata.
 * @param {string} str String input
 * @returns {number} Integer 32-bit unsigned
 */
export function hashStringToSeed(str) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

/**
 * Membuat fungsi generator angka acak deterministik (Mulberry32)
 * @param {number|string} seed Seed angka atau string
 * @returns {() => number} Fungsi generator yang menghasilkan angka acak float 0 <= n < 1
 */
export function createSeededRng(seed) {
  let s = typeof seed === 'string' ? hashStringToSeed(seed) : (seed >>> 0);

  // Jika seed 0, beri offset agar tidak degenerate
  if (s === 0) s = 1337;

  return function mulberry32() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mengambil fungsi RNG harian berdasarkan tanggal string 'YYYY-MM-DD'
 * @param {string} dateKey String tanggal lokal
 * @returns {() => number}
 */
export function getDailyRng(dateKey) {
  return createSeededRng(`blockora-daily-${dateKey}`);
}
