/**
 * StorageManager - Pengelola penyimpanan data lokal (LocalStorage) untuk BLOCKORA.
 * Menangani skor terbaik per mode, riwayat tantangan harian, streak, dan leaderboard lokal.
 */

import { todayKey, parseDateKey, daysBetween } from '../utils/DateHelper.js';
import { StatisticsManager } from './StatisticsManager.js';

const STORAGE_KEYS = {
  BEST_SCORE_PREFIX: 'blockora.best.',
  DAILY_PREFIX: 'blockora.daily.',
  LEADERBOARD: 'blockora.leaderboard',
  STREAK: 'blockora.streak',
  MIGRATION_FLAG: 'blockora.migrated.v1',
  SETTINGS_PREFIX: 'blockora.settings.'
};

export class StorageManager {
  /**
   * Melakukan migrasi data satu kali dari LocalStorage ke IndexedDB (Tahap 5)
   */
  static async migrateIfNeeded() {
    try {
      if (typeof localStorage === 'undefined') return;
      const alreadyMigrated = localStorage.getItem(STORAGE_KEYS.MIGRATION_FLAG);
      if (alreadyMigrated) return;

      // 1. Migrasi Riwayat Daily Challenge
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.DAILY_PREFIX)) {
          const dateKey = key.slice(STORAGE_KEYS.DAILY_PREFIX.length);
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data) {
              await StatisticsManager.saveDaily({
                date: dateKey,
                completed: !!data.completed,
                bestScore: Number(data.bestScore) || 0,
                targetsDone: Number(data.targetsDone) || 0
              });
            }
          } catch (e) {
            console.warn('Gagal migrasi key daily:', key, e);
          }
          keysToRemove.push(key);
        }
      }

      // 2. Migrasi Riwayat Leaderboard Lama ke store games
      const oldLeaderboardRaw = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      if (oldLeaderboardRaw) {
        try {
          const list = JSON.parse(oldLeaderboardRaw);
          if (Array.isArray(list)) {
            for (const item of list) {
              await StatisticsManager.addGame({
                mode: item.mode || 'classic',
                score: item.score || 0,
                linesCleared: 0,
                maxCombo: 0,
                durationMs: 0,
                endReason: 'migrated',
                date: item.date || todayKey()
              });
            }
          }
        } catch (e) {
          console.warn('Gagal migrasi old leaderboard', e);
        }
        keysToRemove.push(STORAGE_KEYS.LEADERBOARD);
      }

      // Hapus data riwayat lama dari LocalStorage
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // Tandai bahwa migrasi sudah berhasil
      localStorage.setItem(STORAGE_KEYS.MIGRATION_FLAG, 'true');
    } catch (e) {
      console.warn('StorageManager: Error saat migrasi v1', e);
    }
  }

  /**
   * Pengaturan Aplikasi (Settings) - Disimpan di LocalStorage
   */
  static getSettings() {
    try {
      return {
        sfxEnabled: localStorage.getItem('blockora.settings.sfx_enabled') !== 'false', // default true
        sfxVolume: Number(localStorage.getItem('blockora.settings.sfx_volume')) || 80,
        bgmEnabled: localStorage.getItem('blockora.settings.bgm_enabled') !== 'false', // default true
        bgmVolume: Number(localStorage.getItem('blockora.settings.bgm_volume')) || 60,
        hapticEnabled: localStorage.getItem('blockora.settings.haptic_enabled') !== 'false' // default true
      };
    } catch (e) {
      return {
        sfxEnabled: true,
        sfxVolume: 80,
        bgmEnabled: true,
        bgmVolume: 60,
        hapticEnabled: true
      };
    }
  }

  static saveSetting(key, value) {
    try {
      localStorage.setItem(`blockora.settings.${key}`, String(value));
    } catch (e) {
      console.warn('Gagal menyimpan setting', key, e);
    }
  }

  /**
   * Reset Seluruh Data Lokal BLOCKORA (Hanya key berawalan blockora.)
   */
  static async resetAllLocalData() {
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('blockora.')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }

      // Bersihkan IndexedDB
      await StatisticsManager.clearAll();
      return true;
    } catch (e) {
      console.warn('Gagal mereset data lokal', e);
      return false;
    }
  }
  /**
   * Mengambil skor terbaik dari LocalStorage berdasarkan mode permainan
   * @param {string} mode Nama mode ('classic', 'time', 'daily')
   * @returns {number} Skor terbaik atau 0 jika belum ada
   */
  static getBestScore(mode = 'classic') {
    try {
      const key = `${STORAGE_KEYS.BEST_SCORE_PREFIX}${mode}`;
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }
    } catch (e) {
      console.warn('StorageManager: Gagal membaca skor', e);
    }
    return 0;
  }

  /**
   * Menyimpan skor terbaik ke LocalStorage
   * @param {string} mode Nama mode ('classic', 'time', 'daily')
   * @param {number} score Skor baru
   * @returns {boolean} True jika berhasil disimpan
   */
  static setBestScore(mode = 'classic', score = 0) {
    try {
      const currentBest = this.getBestScore(mode);
      if (score > currentBest) {
        const key = `${STORAGE_KEYS.BEST_SCORE_PREFIX}${mode}`;
        localStorage.setItem(key, String(score));
        return true;
      }
    } catch (e) {
      console.warn('StorageManager: Gagal menyimpan skor', e);
    }
    return false;
  }

  /**
   * Mengambil total jumlah sesi permainan yang tercatat
   * @returns {number}
   */
  static getTotalGamesPlayed() {
    try {
      const saved = localStorage.getItem('blockora.stats.total_games');
      if (saved) return parseInt(saved, 10) || 0;
      const lb = this.getLeaderboard();
      return lb.length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Mengambil catatan harian untuk tanggal tertentu 'YYYY-MM-DD'
   * @param {string} dateKey
   * @returns {{ completed: boolean, bestScore: number, targetsDone: number }}
   */
  static getDailyRecord(dateKey) {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.DAILY_PREFIX}${dateKey}`);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          completed: !!data.completed,
          bestScore: Number(data.bestScore) || 0,
          targetsDone: Number(data.targetsDone) || 0
        };
      }
    } catch (e) {
      console.warn('StorageManager: Gagal membaca daily record', e);
    }
    return { completed: false, bestScore: 0, targetsDone: 0 };
  }

  /**
   * Menyimpan hasil tantangan harian
   * @param {string} dateKey
   * @param {{ completed: boolean, score: number, targetsDone: number }} result
   */
  static saveDailyResult(dateKey, { completed = false, score = 0, targetsDone = 0 }) {
    try {
      const existing = this.getDailyRecord(dateKey);
      const isCompleted = existing.completed || completed;
      const bestScore = Math.max(existing.bestScore, score);
      const maxTargetsDone = Math.max(existing.targetsDone, targetsDone);

      const toSave = {
        completed: isCompleted,
        bestScore,
        targetsDone: maxTargetsDone,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(`${STORAGE_KEYS.DAILY_PREFIX}${dateKey}`, JSON.stringify(toSave));

      // Jika ada rekor skor baru untuk mode daily
      this.setBestScore('daily', score);

      return toSave;
    } catch (e) {
      console.warn('StorageManager: Gagal menyimpan daily result', e);
      return null;
    }
  }

  /**
   * Mendapatkan riwayat semua hari yang pernah tersimpan di LocalStorage
   * @returns {Record<string, { completed: boolean, bestScore: number, targetsDone: number }>}
   */
  static getAllDailyRecords() {
    const records = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.DAILY_PREFIX)) {
          const dateKey = key.slice(STORAGE_KEYS.DAILY_PREFIX.length);
          records[dateKey] = this.getDailyRecord(dateKey);
        }
      }
    } catch (e) {
      console.warn('StorageManager: Gagal mengambil riwayat daily', e);
    }
    return records;
  }

  /**
   * Fungsi murni untuk menghitung streak dari map riwayat catatan daily { [dateKey]: { completed: boolean } }
   * @param {Record<string, { completed: boolean }>} records
   * @param {string} [curDateKey=todayKey()]
   * @returns {number}
   */
  static calculateStreakFromRecords(records = {}, curDateKey = todayKey()) {
    try {
      let checkDate = parseDateKey(curDateKey);
      const todayRecord = records[curDateKey];
      let streak = 0;

      if (todayRecord && todayRecord.completed) {
        streak++;
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          const prevKey = todayKey(checkDate);
          if (records[prevKey] && records[prevKey].completed) {
            streak++;
          } else {
            break;
          }
        }
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayKey = todayKey(checkDate);
        if (records[yesterdayKey] && records[yesterdayKey].completed) {
          streak++;
          while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            const prevKey = todayKey(checkDate);
            if (records[prevKey] && records[prevKey].completed) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      return streak;
    } catch (e) {
      console.warn('StorageManager: Gagal menghitung streak dari records', e);
      return 0;
    }
  }

  /**
   * Menghitung streak hari bermain berturut-turut yang telah diselesaikan (completed).
   * Aturan:
   * - Streak berakhir di hari ini jika hari ini selesai.
   * - Jika hari ini belum selesai, tetapi kemarin selesai, streak kemarin tetap dihitung (belum putus).
   * - Jika kemarin tidak selesai dan hari ini belum selesai, streak bernilai 0.
   * @param {string} [curDateKey=todayKey()]
   * @returns {number} Jumlah hari berturut-turut
   */
  static calculateStreak(curDateKey = todayKey()) {
    try {
      const records = this.getAllDailyRecords();
      return this.calculateStreakFromRecords(records, curDateKey);
    } catch (e) {
      console.warn('StorageManager: Gagal menghitung streak', e);
      return 0;
    }
  }

  /**
   * Mengambil papan skor lokal (top skor)
   * @returns {Array<{ id: string, mode: string, score: number, date: string }>}
   */
  static getLeaderboard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn('StorageManager: Gagal membaca leaderboard', e);
    }
    return [];
  }

  /**
   * Menambahkan entri baru ke papan skor lokal jika memenuhi syarat (top 10)
   * @param {{ mode: string, score: number, date?: string }} entry
   * @returns {Array} List leaderboard yang sudah diperbarui
   */
  static addLeaderboardEntry({ mode = 'classic', score = 0, date = todayKey() }) {
    if (score <= 0) return this.getLeaderboard();

    try {
      const list = this.getLeaderboard();
      const newEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        mode,
        score,
        date
      };

      list.push(newEntry);
      // Urutkan skor tertinggi ke terendah
      list.sort((a, b) => b.score - a.score);

      // Ambil maksimal top 10
      const trimmed = list.slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(trimmed));
      return trimmed;
    } catch (e) {
      console.warn('StorageManager: Gagal menambahkan entri leaderboard', e);
      return [];
    }
  }
}
