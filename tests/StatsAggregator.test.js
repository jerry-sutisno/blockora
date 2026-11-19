import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatsAggregator } from '../src/storage/StatsAggregator.js';

test('StatsAggregator: Data kosong mengembalikan nilai nol dan tidak crash', () => {
  const result = StatsAggregator.aggregate([], []);
  assert.equal(result.totalGames, 0);
  assert.equal(result.totalLinesCleared, 0);
  assert.equal(result.totalPlayTimeMs, 0);
  assert.equal(result.dailyCompletedCount, 0);
  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 0);
  assert.deepEqual(result.bestPerMode, { classic: 0, time: 0, daily: 0 });
  assert.deepEqual(result.avgScorePerMode, { classic: 0, time: 0, daily: 0 });
  assert.deepEqual(result.gamesPerMode, { classic: 0, time: 0, daily: 0 });
});

test('StatsAggregator: Agregasi beberapa game di berbagai mode', () => {
  const dummyGames = [
    { mode: 'classic', score: 100, linesCleared: 5, durationMs: 60000, date: '2026-11-16' },
    { mode: 'classic', score: 300, linesCleared: 15, durationMs: 120000, date: '2026-11-17' },
    { mode: 'time', score: 400, linesCleared: 20, durationMs: 120000, date: '2026-11-18' },
    { mode: 'daily', score: 250, linesCleared: 10, durationMs: 90000, date: '2026-11-18' }
  ];

  const dummyDaily = [
    { date: '2026-11-16', completed: true, bestScore: 200 },
    { date: '2026-11-17', completed: true, bestScore: 300 },
    { date: '2026-11-18', completed: true, bestScore: 250 }
  ];

  const result = StatsAggregator.aggregate(dummyGames, dummyDaily, '2026-11-18');

  assert.equal(result.totalGames, 4);
  assert.equal(result.totalLinesCleared, 50); // 5 + 15 + 20 + 10
  assert.equal(result.totalPlayTimeMs, 390000);
  assert.equal(result.dailyCompletedCount, 3);
  assert.equal(result.currentStreak, 3);

  // Per mode checks
  assert.equal(result.gamesPerMode.classic, 2);
  assert.equal(result.bestPerMode.classic, 300);
  assert.equal(result.avgScorePerMode.classic, 200); // (100 + 300) / 2

  assert.equal(result.gamesPerMode.time, 1);
  assert.equal(result.bestPerMode.time, 400);
  assert.equal(result.avgScorePerMode.time, 400);

  assert.equal(result.gamesPerMode.daily, 1);
  assert.equal(result.bestPerMode.daily, 250);
});

test('StatsAggregator: weeklyBestScores menghasilkan 7 elemen berurutan dengan skor harian tertinggi', () => {
  const dummyGames = [
    { score: 150, date: '2026-11-14' },
    { score: 300, date: '2026-11-14' }, // Game kedua di hari yang sama, 300 lebih besar
    { score: 500, date: '2026-11-18' }  // Hari ini
  ];

  const weekly = StatsAggregator.weeklyBestScores(dummyGames, '2026-11-18');

  assert.equal(weekly.length, 7, 'Harus selalu 7 hari');
  assert.equal(weekly[0].dateKey, '2026-11-12', 'Hari pertama harus 6 hari sebelum hari ini');
  assert.equal(weekly[6].dateKey, '2026-11-18', 'Hari terakhir harus hari ini');
  assert.equal(weekly[6].isToday, true);

  // Cek skor hari 14 Nov (index 2: 12, 13, 14)
  assert.equal(weekly[2].bestScore, 300, 'Harus mengambil skor tertinggi 300');

  // Hari tanpa game (13 Nov = index 1)
  assert.equal(weekly[1].bestScore, 0, 'Hari tanpa game bernilai 0');

  // Hari ini (18 Nov = index 6)
  assert.equal(weekly[6].bestScore, 500);
});

test('StatsAggregator: leaderboard mengurutkan descending, membatasi limit, dan mendukung filter mode', () => {
  const dummyGames = [
    { id: '1', mode: 'classic', score: 100, date: '2026-11-10' },
    { id: '2', mode: 'time', score: 600, date: '2026-11-11' },
    { id: '3', mode: 'classic', score: 450, date: '2026-11-12' },
    { id: '4', mode: 'daily', score: 200, date: '2026-11-13' },
    { id: '5', mode: 'classic', score: 800, date: '2026-11-14' }
  ];

  // Top 3 semua mode
  const top3 = StatsAggregator.leaderboard(dummyGames, 3);
  assert.equal(top3.length, 3);
  assert.equal(top3[0].score, 800);
  assert.equal(top3[1].score, 600);
  assert.equal(top3[2].score, 450);

  // Filter mode classic
  const classicOnly = StatsAggregator.leaderboard(dummyGames, 10, 'classic');
  assert.equal(classicOnly.length, 3);
  assert.equal(classicOnly[0].score, 800);
  assert.equal(classicOnly[1].score, 450);
  assert.equal(classicOnly[2].score, 100);
  assert.ok(classicOnly.every(g => g.mode === 'classic'));

  // Filter mode time
  const timeOnly = StatsAggregator.leaderboard(dummyGames, 10, 'time');
  assert.equal(timeOnly.length, 1);
  assert.equal(timeOnly[0].score, 600);
});

test('StatsAggregator: Longest streak mendeteksi rangkaian hari selesai terpanjang', () => {
  const dailyMap = {
    '2026-11-01': { completed: true },
    '2026-11-02': { completed: true },
    '2026-11-03': { completed: true }, // streak 3
    '2026-11-05': { completed: true },
    '2026-11-06': { completed: true },
    '2026-11-07': { completed: true },
    '2026-11-08': { completed: true },
    '2026-11-09': { completed: true }  // streak 5
  };

  const longest = StatsAggregator.calculateLongestStreak(dailyMap);
  assert.equal(longest, 5, 'Streak terpanjang harus 5 hari');
});
