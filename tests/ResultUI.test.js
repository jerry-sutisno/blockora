import test from 'node:test';
import assert from 'node:assert/strict';
import { ResultUI } from '../src/ui/ResultUI.js';

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

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ addEventListener: () => {} }),
    querySelectorAll: () => []
  };
}

test('ResultUI: render data game over normal (bukan rekor)', () => {
  localStorage.setItem('blockora.best.classic', '20000');

  const resultUI = new ResultUI({
    onPlayAgain: () => {},
    onMainMenu: () => {}
  });

  const mockContainer = {
    innerHTML: '',
    querySelectorAll: () => []
  };

  resultUI.show(mockContainer, {
    score: 12000,
    linesCleared: 12,
    maxCombo: 3,
    durationSeconds: 150,
    mode: 'classic',
    reason: 'board_full'
  });

  assert.ok(mockContainer.innerHTML.includes('Permainan Selesai'));
  assert.ok(mockContainer.innerHTML.includes('Papan penuh, tidak ada ruang penempatan blok berikutnya.'));
  assert.ok(mockContainer.innerHTML.includes('02:30'));
  assert.ok(mockContainer.innerHTML.includes('invisible')); // Badge record invisible karena bukan rekor
  assert.ok(mockContainer.innerHTML.includes('Main Lagi (Play Again)'));
  assert.ok(mockContainer.innerHTML.includes('Menu Utama'));
});

test('ResultUI: render rekor baru (New Personal Record)', () => {
  localStorage.setItem('blockora.best.classic', '5000');

  const resultUI = new ResultUI({
    onPlayAgain: () => {},
    onMainMenu: () => {}
  });

  const mockContainer = {
    innerHTML: '',
    querySelectorAll: () => []
  };

  resultUI.show(mockContainer, {
    score: 15000,
    linesCleared: 15,
    maxCombo: 5,
    durationSeconds: 200,
    mode: 'classic',
    reason: 'board_full'
  });

  // Badge harus aktif (tidak invisible)
  assert.ok(mockContainer.innerHTML.includes('NEW PERSONAL RECORD!'));
  assert.ok(!mockContainer.innerHTML.includes('mb-space-xs shadow-sm invisible'));
  assert.equal(localStorage.getItem('blockora.best.classic'), '15000');
});

test('ResultUI: render waktu habis pada mode Time Challenge', () => {
  const resultUI = new ResultUI({
    onPlayAgain: () => {},
    onMainMenu: () => {}
  });

  const mockContainer = {
    innerHTML: '',
    querySelectorAll: () => []
  };

  resultUI.show(mockContainer, {
    score: 8500,
    linesCleared: 10,
    maxCombo: 4,
    durationSeconds: 120,
    mode: 'time',
    reason: 'time_out'
  });

  assert.ok(mockContainer.innerHTML.includes('Waktu Habis!'));
  assert.ok(mockContainer.innerHTML.includes('Waktu 120 detik telah berakhir.'));
  assert.ok(mockContainer.innerHTML.includes('Time Out'));
});
