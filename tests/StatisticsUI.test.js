import test from 'node:test';
import assert from 'node:assert/strict';
import { StatisticsUI } from '../src/ui/StatisticsUI.js';

// Setup mock browser globals untuk Node.js test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

function createMockContainer() {
  const listeners = new Map();
  return {
    innerHTML: '',
    classList: {
      add: () => {},
      remove: () => {}
    },
    querySelectorAll: (selector) => [],
    querySelector: (selector) => null
  };
}

test('StatisticsUI: render dengan mock data metrik lengkap & penyesuaian Stitch', async () => {
  const statsUI = new StatisticsUI({
    onBack: () => {}
  });

  const container = createMockContainer();

  const mockPayload = {
    stats: {
      totalGames: 342,
      totalScore: 4860000,
      totalLinesCleared: 2840,
      currentStreak: 56,
      longestStreak: 56,
      classic: { games: 198, best: 24850, avg: 14210, winRate: 78.4, longestStreak: 12 },
      time: { games: 88, best: 19420, avg: 11940, winRate: 62.1, longestStreak: 6 },
      daily: { games: 56, best: 22000, avg: 17800, clearRate: 100 }
    },
    weekly: [
      { date: '2024-10-14', bestScore: 14200 },
      { date: '2024-10-15', bestScore: 18600 },
      { date: '2024-10-16', bestScore: 16100 },
      { date: '2024-10-17', bestScore: 21800 },
      { date: '2024-10-18', bestScore: 19500 },
      { date: '2024-10-19', bestScore: 24800 },
      { date: '2024-10-20', bestScore: 22400 }
    ]
  };

  await statsUI.show(container, mockPayload);

  // Verifikasi judul dan header
  assert.ok(container.innerHTML.includes('Statistik &amp; Rekor Pemain'));
  assert.ok(container.innerHTML.includes('Kembali ke Menu Utama'));
  assert.ok(container.innerHTML.includes('Local Save'));

  // Verifikasi filter periode (tiga slot: Semua Waktu, Bulan Ini, 7 Hari)
  assert.ok(container.innerHTML.includes('Semua Waktu'));
  assert.ok(container.innerHTML.includes('Bulan Ini'));
  assert.ok(container.innerHTML.includes('7 Hari'));

  // Verifikasi angka-angka metrik utama
  assert.ok(container.innerHTML.includes('342')); // Total Permainan
  assert.ok(container.innerHTML.includes('24,850') || container.innerHTML.includes((24850).toLocaleString())); // Rekor Klasik
  assert.ok(container.innerHTML.includes('19,420') || container.innerHTML.includes((19420).toLocaleString())); // Rekor Waktu
  assert.ok(container.innerHTML.includes('2,840') || container.innerHTML.includes((2840).toLocaleString())); // Garis Bersih
  assert.ok(container.innerHTML.includes('56') && container.innerHTML.includes('Hari')); // Rangkaian Harian (Streak)

  // Verifikasi tombol Ekspor disabled
  assert.ok(container.innerHTML.includes('data-action="export-json"'));
  assert.ok(container.innerHTML.includes('disabled'));

  // Verifikasi tombol Reset Statistik Lokal ada
  assert.ok(container.innerHTML.includes('data-action="reset-stats"'));
});

test('StatisticsUI: render empty state bersih saat data kosong', async () => {
  const statsUI = new StatisticsUI({
    onBack: () => {}
  });

  const container = createMockContainer();

  // Panggil show tanpa mockData untuk menguji alur data storage nyata saat kosong
  await statsUI.show(container);

  assert.ok(container.innerHTML.includes('Statistik &amp; Rekor Pemain'));
  assert.ok(!container.innerHTML.includes('NaN'));
  assert.ok(!container.innerHTML.includes('undefined'));
  assert.ok(container.innerHTML.includes('0 Tersimpan'));
  assert.ok(container.innerHTML.includes('0 Garis'));
  assert.ok(container.innerHTML.includes('0 Game'));
});
