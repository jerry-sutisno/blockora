import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StorageManager } from '../src/storage/StorageManager.js';
import { todayKey } from '../src/utils/DateHelper.js';

// Mock localStorage in-memory sederhana untuk lingkungan Node.js
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

// Pasang mock jika di Node.js
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MockLocalStorage();
}

test('Streak: Kosong = 0', () => {
  localStorage.clear();
  const streak = StorageManager.calculateStreak('2026-11-18');
  assert.equal(streak, 0, 'Streak harus 0 jika belum ada catatan permainan');
});

test('Streak: Berurutan 3 hari berakhir hari ini', () => {
  localStorage.clear();
  // Simpan data 16, 17, 18 Nov (3 hari berurutan selesai)
  StorageManager.saveDailyResult('2026-11-16', { completed: true, score: 500, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-11-17', { completed: true, score: 600, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-11-18', { completed: true, score: 700, targetsDone: 3 });

  const streak = StorageManager.calculateStreak('2026-11-18');
  assert.equal(streak, 3, 'Streak harus 3 untuk 3 hari berurutan');
});

test('Streak: Ada hari bolong (missed day) memutus streak', () => {
  localStorage.clear();
  // 15 selesai, 16 bolong (tidak ada), 17 selesai, 18 selesai
  StorageManager.saveDailyResult('2026-11-15', { completed: true, score: 500, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-11-17', { completed: true, score: 600, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-11-18', { completed: true, score: 700, targetsDone: 3 });

  const streak = StorageManager.calculateStreak('2026-11-18');
  assert.equal(streak, 2, 'Streak hanya menghitung hari berturut-turut terbaru (17 dan 18), hari 15 tidak ikut');
});

test('Streak: Belum main hari ini tapi kemarin selesai (streak tidak putus)', () => {
  localStorage.clear();
  // 16 selesai, 17 selesai, 18 belum main (belum ada record)
  StorageManager.saveDailyResult('2026-11-16', { completed: true, score: 500, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-11-17', { completed: true, score: 600, targetsDone: 3 });

  const streak = StorageManager.calculateStreak('2026-11-18');
  assert.equal(streak, 2, 'Streak harus tetap 2 jika kemarin selesai walau hari ini belum main');
});

test('Streak: Lintas bulan (30 November ke 1 Desember)', () => {
  localStorage.clear();
  // 29 Nov, 30 Nov, 01 Des (November ada 30 hari)
  StorageManager.saveDailyResult('2026-11-29', { completed: true, score: 500, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-11-30', { completed: true, score: 600, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-12-01', { completed: true, score: 700, targetsDone: 3 });

  const streak = StorageManager.calculateStreak('2026-12-01');
  assert.equal(streak, 3, 'Streak harus tersambung melintasi pergantian bulan');
});

test('Streak: Lintas tahun (31 Desember ke 1 Januari)', () => {
  localStorage.clear();
  // 30 Des 2026, 31 Des 2026, 01 Jan 2027
  StorageManager.saveDailyResult('2026-12-30', { completed: true, score: 500, targetsDone: 3 });
  StorageManager.saveDailyResult('2026-12-31', { completed: true, score: 600, targetsDone: 3 });
  StorageManager.saveDailyResult('2027-01-01', { completed: true, score: 700, targetsDone: 3 });

  const streak = StorageManager.calculateStreak('2027-01-01');
  assert.equal(streak, 3, 'Streak harus tersambung melintasi pergantian tahun');
});

test('Streak: Main ulang di hari yang sama TIDAK menambah streak', () => {
  localStorage.clear();
  // Main pertama tanggal 18 selesai
  StorageManager.saveDailyResult('2026-11-18', { completed: true, score: 500, targetsDone: 3 });
  assert.equal(StorageManager.calculateStreak('2026-11-18'), 1);

  // Main kedua di tanggal yang sama dengan skor lebih tinggi
  StorageManager.saveDailyResult('2026-11-18', { completed: true, score: 850, targetsDone: 3 });
  assert.equal(StorageManager.calculateStreak('2026-11-18'), 1, 'Streak tetap 1 walau main ulang di hari yang sama');

  // Main ketiga di tanggal yang sama
  StorageManager.saveDailyResult('2026-11-18', { completed: true, score: 920, targetsDone: 3 });
  assert.equal(StorageManager.calculateStreak('2026-11-18'), 1, 'Streak tetap 1');
});
