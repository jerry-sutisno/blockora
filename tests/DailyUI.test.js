import test from 'node:test';
import assert from 'node:assert/strict';
import { DailyUI } from '../src/ui/DailyUI.js';
import { StorageManager } from '../src/storage/StorageManager.js';
import { todayKey } from '../src/utils/DateHelper.js';

// Setup mock globals untuk Node.js environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  };
}

function createMockContainer() {
  return {
    innerHTML: '',
    classList: {
      add: () => {},
      remove: () => {}
    },
    querySelectorAll: () => [],
    querySelector: () => null
  };
}

test('DailyUI: render markup Stitch dan periksa elemen kunci', async () => {
  const dailyUI = new DailyUI({
    onBack: () => {},
    onStartChallenge: () => {}
  });

  const container = createMockContainer();
  await dailyUI.show(container);

  // 1. Verifikasi header navigasi dan top bar
  assert.ok(container.innerHTML.includes('BLOCKORA'));
  assert.ok(container.innerHTML.includes('Kembali ke Menu Utama'));
  assert.ok(container.innerHTML.includes('id="btn-daily-back"'));
  assert.ok(container.innerHTML.includes('Tantangan Aktif:'));
  assert.ok(container.innerHTML.includes('Reset Dalam'));
  assert.ok(container.innerHTML.includes('id="countdown-timer"'));

  // 2. Verifikasi editorial header & streak
  assert.ok(container.innerHTML.includes('Tantangan Harian'));
  assert.ok(container.innerHTML.includes('Edisi #'));
  assert.ok(container.innerHTML.includes('Streak Aktif Tak Terputus'));

  // 3. Verifikasi kalender bulan & legenda
  assert.ok(container.innerHTML.includes('Selesai Bulan Ini'));
  assert.ok(container.innerHTML.includes('id="cal-prev-btn"'));
  assert.ok(container.innerHTML.includes('id="cal-next-btn"'));
  assert.ok(container.innerHTML.includes('Piala Kalender'));
  assert.ok(container.innerHTML.includes('Selesai ('));
  assert.ok(container.innerHTML.includes('Hari Ini ('));
  assert.ok(container.innerHTML.includes('Terlewat ('));
  assert.ok(container.innerHTML.includes('Terkunci ('));

  // 4. Verifikasi mission master card
  assert.ok(container.innerHTML.includes('Kemajuan'));
  assert.ok(container.innerHTML.includes('dari 3 Target Selesai'));
  assert.ok(container.innerHTML.includes('Skin Eksklusif: "Prism Arctic"'));
  assert.ok(container.innerHTML.includes('Segera'));
  assert.ok(container.innerHTML.includes('id="btn-start-daily"'));

  // 5. Verifikasi bento strip tips taktil & rekor lokal
  assert.ok(container.innerHTML.includes('Tips Taktil'));
  assert.ok(container.innerHTML.includes('Rekor Hari Ini'));

  // Cleanup
  dailyUI.hide();
});

test('DailyUI: render state selesai menampilkan tombol Main Latihan dan proteksi streak', async () => {
  const todayStr = todayKey();
  
  // Simpan record bahwa hari ini telah selesai
  StorageManager.saveDailyResult(todayStr, {
    completed: true,
    score: 12500,
    targetsDone: 3
  });

  const dailyUI = new DailyUI({
    onBack: () => {},
    onStartChallenge: () => {}
  });

  const container = createMockContainer();
  await dailyUI.show(container);

  // Verifikasi tombol Main Latihan & catatan proteksi streak
  assert.ok(container.innerHTML.includes('Main Latihan'));
  assert.ok(container.innerHTML.includes('Tuntas'));
  assert.ok(container.innerHTML.includes('Main latihan tidak mengubah streak atau rekor harian'));
  assert.ok(container.innerHTML.includes('Selesai (3/3)'));
  assert.ok(container.innerHTML.includes('12.500 Poin'));

  // Cleanup
  dailyUI.hide();
});
