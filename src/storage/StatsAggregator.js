/**
 * StatsAggregator.js - Agregator statistik permainan BLOCKORA (JS Murni tanpa akses storage).
 * Menghitung total permainan, rekor per mode, rata-rata, grafik 7 hari, dan leaderboard.
 */

import { todayKey, parseDateKey, daysBetween, formatIndonesianDate } from '../utils/DateHelper.js';
import { StorageManager } from './StorageManager.js';

const NAMA_HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export class StatsAggregator {
  /**
   * Mengagregasi data permainan dan catatan harian
   * @param {Array<Object>} games Daftar semua sesi permainan dari IndexedDB
   * @param {Array<Object>} dailyList Daftar catatan harian dari IndexedDB
   * @param {string} [curDateKey=todayKey()]
   * @returns {Object}
   */
  static aggregate(games = [], dailyList = [], curDateKey = todayKey()) {
    const totalGames = games.length;

    const bestPerMode = { classic: 0, time: 0, daily: 0 };
    const scoreSumPerMode = { classic: 0, time: 0, daily: 0 };
    const gamesPerMode = { classic: 0, time: 0, daily: 0 };

    let totalLinesCleared = 0;
    let totalPlayTimeMs = 0;

    for (const g of games) {
      const mode = g.mode || 'classic';
      const score = Number(g.score) || 0;
      const lines = Number(g.linesCleared) || 0;
      const duration = Number(g.durationMs) || 0;

      if (bestPerMode[mode] !== undefined) {
        if (score > bestPerMode[mode]) {
          bestPerMode[mode] = score;
        }
        scoreSumPerMode[mode] += score;
        gamesPerMode[mode]++;
      }

      totalLinesCleared += lines;
      totalPlayTimeMs += duration;
    }

    const avgScorePerMode = {
      classic: gamesPerMode.classic > 0 ? Math.round(scoreSumPerMode.classic / gamesPerMode.classic) : 0,
      time: gamesPerMode.time > 0 ? Math.round(scoreSumPerMode.time / gamesPerMode.time) : 0,
      daily: gamesPerMode.daily > 0 ? Math.round(scoreSumPerMode.daily / gamesPerMode.daily) : 0
    };

    // Ubah dailyList menjadi Record Map
    const dailyMap = {};
    let dailyCompletedCount = 0;

    for (const d of dailyList) {
      if (d && d.date) {
        dailyMap[d.date] = d;
        if (d.completed) {
          dailyCompletedCount++;
        }
      }
    }

    // Hitung streak saat ini menggunakan fungsi murni yang sama
    const currentStreak = StorageManager.calculateStreakFromRecords(dailyMap, curDateKey);

    // Hitung longest streak sepanjang riwayat catatan daily
    const longestStreak = this.calculateLongestStreak(dailyMap);

    return {
      totalGames,
      bestPerMode,
      avgScorePerMode,
      gamesPerMode,
      totalLinesCleared,
      totalPlayTimeMs,
      dailyCompletedCount,
      currentStreak,
      longestStreak
    };
  }

  /**
   * Menghitung streak terpanjang yang pernah tercapai dalam riwayat
   * @param {Record<string, { completed: boolean }>} dailyMap
   * @returns {number}
   */
  static calculateLongestStreak(dailyMap = {}) {
    const completedDates = Object.keys(dailyMap)
      .filter(k => dailyMap[k] && dailyMap[k].completed)
      .sort(); // Urutkan string YYYY-MM-DD secara kronologis

    if (completedDates.length === 0) return 0;

    let maxStreak = 1;
    let curStreak = 1;

    for (let i = 1; i < completedDates.length; i++) {
      const prev = completedDates[i - 1];
      const curr = completedDates[i];

      if (daysBetween(prev, curr) === 1) {
        curStreak++;
        if (curStreak > maxStreak) {
          maxStreak = curStreak;
        }
      } else {
        curStreak = 1;
      }
    }

    return maxStreak;
  }

  /**
   * Menghasilkan array skor terbaik untuk 7 hari terakhir (6 hari lalu s/d hari ini)
   * Urut dari paling lama ke terbaru.
   * @param {Array<Object>} games
   * @param {string} [todayStr=todayKey()]
   * @returns {Array<{ dateKey: string, dayName: string, dayNumber: number, bestScore: number, isToday: boolean }>}
   */
  static weeklyBestScores(games = [], todayStr = todayKey()) {
    const today = parseDateKey(todayStr);
    const result = [];

    // Map skor tertinggi per tanggal
    const dailyBests = {};
    for (const g of games) {
      const date = g.date;
      const score = Number(g.score) || 0;
      if (date) {
        if (!dailyBests[date] || score > dailyBests[date]) {
          dailyBests[date] = score;
        }
      }
    }

    // Bangun deretan 7 hari (today - 6 s/d today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = todayKey(d);

      result.push({
        dateKey: key,
        dayName: NAMA_HARI_SINGKAT[d.getDay()],
        dayNumber: d.getDate(),
        bestScore: dailyBests[key] || 0,
        isToday: key === todayStr
      });
    }

    return result;
  }

  /**
   * Menghasilkan leaderboard rekor tertinggi
   * @param {Array<Object>} games
   * @param {number} [limit=10]
   * @param {string|null} [mode=null] Filter mode ('classic', 'time', 'daily', atau null untuk semua)
   * @returns {Array<Object>}
   */
  static leaderboard(games = [], limit = 10, mode = null) {
    let filtered = games;
    if (mode && mode !== 'all') {
      filtered = games.filter(g => g.mode === mode);
    }

    const sorted = [...filtered].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const sliced = sorted.slice(0, limit);

    return sliced.map(g => ({
      id: g.id || `${g.date}-${g.score}`,
      mode: g.mode || 'classic',
      score: Number(g.score) || 0,
      linesCleared: Number(g.linesCleared) || 0,
      maxCombo: Number(g.maxCombo) || 0,
      date: g.date || '',
      formattedDate: g.date ? formatIndonesianDate(g.date) : ''
    }));
  }
}
