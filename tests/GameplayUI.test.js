import test from 'node:test';
import assert from 'node:assert/strict';

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

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.textContent = '';
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
      contains: (c) => this.classList._classes.has(c)
    };
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
  }

  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) || null; }

  addEventListener(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
  }

  click() {
    const cbs = this.listeners.get('click') || [];
    cbs.forEach(cb => cb({ preventDefault: () => {} }));
  }

  querySelector(sel) {
    if (!this._elements) this._elements = new Map();
    if (!this._elements.has(sel)) {
      const el = new MockElement();
      if (sel.startsWith('#')) {
        el.id = sel.slice(1);
      }
      this._elements.set(sel, el);
    }
    return this._elements.get(sel);
  }

  querySelectorAll() {
    return [];
  }
}

import { GameplayUI } from '../src/ui/GameplayUI.js';

test('GameplayUI: render dengan mock data dan verifikasi elemen HUD & Layout Stitch', async () => {
  let backClicked = false;
  let restartClicked = false;
  let pauseClicked = false;

  const gameplayUI = new GameplayUI({
    onBack: () => { backClicked = true; },
    onRestart: () => { restartClicked = true; },
    onPause: () => { pauseClicked = true; }
  });

  const container = new MockElement();

  await gameplayUI.show(container, {
    mode: 'classic',
    modeText: 'CLASSIC CASCADE',
    roomText: 'ROOM #402',
    timerDisplay: '02:00',
    headerBest: 24500,
    score: 14820,
    combo: 3,
    comboBadgeText: 'x3 COMBO!',
    emptyCells: 91,
    tipText: 'Clear multiple lines in a single drop to maximize combo multipliers.'
  });

  const html = container.innerHTML;

  // 1. Verifikasi Header Navigation & HUD
  assert.ok(html.includes('BLOCKORA'), 'Harus menampilkan judul BLOCKORA');
  assert.ok(html.includes('CLASSIC CASCADE'), 'Harus menampilkan mode Classic Cascade');
  assert.ok(html.includes('ROOM #402'), 'Harus menampilkan room/sesi');
  assert.ok(html.includes('02:00'), 'Harus menampilkan format timer');
  assert.ok(html.includes('14.820'), 'Harus menampilkan skor 14.820');
  assert.ok(html.includes('x3 COMBO!'), 'Harus menampilkan combo badge x3');

  // 2. Verifikasi Left Panel: Live Mission, Streak Multiplier, Zen Ambience
  assert.ok(html.includes('Live Mission'), 'Harus memuat kartu Live Mission');
  assert.ok(html.includes('Streak Multiplier'), 'Harus memuat kartu Streak Multiplier');
  assert.ok(html.includes('Zen Ambience'), 'Harus memuat pill Zen Ambience');
  assert.ok(html.includes('id="streak-multiplier-boxes"'), 'Harus memuat wadah 5 kotak streak');

  // 3. Verifikasi Center Board Card & Deck
  assert.ok(html.includes('id="blockora-board"'), 'Harus memuat wadah kanvas papan #blockora-board');
  assert.ok(html.includes('91 Empty Cells Available'), 'Harus memuat teks jumlah sel kosong 91');
  assert.ok(html.includes('Drag to place'), 'Harus memuat instruksi drag to place');
  assert.ok(html.includes('Active Shape Deck'), 'Harus memuat Active Shape Deck');
  assert.ok(html.includes('id="gameplay-deck-slots"'), 'Harus memuat wadah slot balok deck');
  assert.ok(html.includes('Rotate'), 'Harus memuat tombol Rotate booster');
  assert.ok(html.includes('Swap'), 'Harus memuat tombol Swap booster');

  // 4. Verifikasi Right Panel: Peringkat / Standings, Architect Tip, Acoustic Balance
  assert.ok(html.includes('Global Standings') || html.includes('Peringkat Lokal'), 'Harus memuat kartu Standings / Peringkat');
  assert.ok(html.includes('Architect Tip'), 'Harus memuat kartu Architect Tip');
  assert.ok(html.includes('Acoustic Balance'), 'Harus memuat kartu Acoustic Balance');
  assert.ok(html.includes('Clear multiple lines in a single drop'), 'Harus memuat teks tip');

  // 5. Verifikasi Event Listeners Tombol
  const backBtn = container.querySelector('#btn-gameplay-back');
  assert.ok(backBtn, 'Tombol kembali harus ada');
  backBtn.click();
  assert.strictEqual(backClicked, true, 'Callback onBack harus terpanggil');

  const restartBtn = container.querySelector('#btn-gameplay-restart');
  assert.ok(restartBtn, 'Tombol restart harus ada');
  restartBtn.click();
  assert.strictEqual(restartClicked, true, 'Callback onRestart harus terpanggil');

  const pauseBtn = container.querySelector('#btn-gameplay-pause');
  assert.ok(pauseBtn, 'Tombol pause harus ada');
  pauseBtn.click();
  assert.strictEqual(pauseClicked, true, 'Callback onPause harus terpanggil');
});

test('GameplayUI: pembaruan dinamis updateLiveState', async () => {
  const gameplayUI = new GameplayUI();
  const container = new MockElement();
  await gameplayUI.show(container);

  // Uji updateLiveState
  gameplayUI.updateLiveState({
    score: 5200,
    combo: 4,
    emptyCells: 75,
    timerStr: '01:45'
  });

  const scoreEl = container.querySelector('#main-score');
  assert.strictEqual(scoreEl.textContent, '5.200', 'Skor live harus terupdate ke 5.200');

  const timerEl = container.querySelector('#countdown-timer');
  assert.strictEqual(timerEl.textContent, '01:45', 'Timer live harus terupdate ke 01:45');

  const emptyEl = container.querySelector('#empty-cells-count');
  assert.ok(emptyEl.textContent.includes('75 Empty Cells'), 'Empty cells count harus terupdate');

  const comboBadge = container.querySelector('#gameplay-combo-badge');
  assert.strictEqual(comboBadge.textContent, 'x4 COMBO!', 'Combo badge harus terupdate ke x4');
  assert.ok(comboBadge.classList.contains('animate-bounce'), 'Combo badge harus animate-bounce saat combo >= 2');
});
