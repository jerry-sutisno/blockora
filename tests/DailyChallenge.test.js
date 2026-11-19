import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDailyConfig, DailyTracker } from '../src/game/DailyChallenge.js';

test('generateDailyConfig deterministik untuk tanggal yang sama', () => {
  const conf1 = generateDailyConfig('2026-11-18');
  const conf2 = generateDailyConfig('2026-11-18');
  const confDiff = generateDailyConfig('2026-11-19');

  assert.equal(conf1.themeName, conf2.themeName);
  assert.equal(conf1.targets.length, 3);
  assert.equal(conf2.targets.length, 3);

  for (let i = 0; i < 3; i++) {
    assert.equal(conf1.targets[i].id, conf2.targets[i].id);
    assert.equal(conf1.targets[i].target, conf2.targets[i].target);
  }

  // Tanggal berbeda kemungkinan besar punya konfigurasi/tema berbeda
  assert.ok(confDiff.dateKey !== conf1.dateKey);
});

test('DailyTracker melacak progres dan mendeteksi allCompleted', () => {
  const conf = generateDailyConfig('2026-11-18');
  const tracker = new DailyTracker(conf.targets);

  assert.equal(tracker.isAllCompleted(), false);
  assert.equal(tracker.getCompletedCount(), 0);

  // Simulasikan state gameplay progresif
  tracker.update({
    score: 1000,
    totalLinesCleared: 20,
    maxCombo: 5,
    recentLinesCleared: 2
  });

  // Karena score >= target, lines >= target, combo >= target, multi-line (bila ada)
  const completedCount = tracker.getCompletedCount();
  assert.ok(completedCount >= 2, 'Minimal 2 target skor dan baris harus tercapai');

  const serialized = tracker.serialize();
  assert.equal(serialized.targets.length, 3);
  assert.ok(typeof serialized.allCompleted === 'boolean');
});
