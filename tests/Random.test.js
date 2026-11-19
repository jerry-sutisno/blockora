import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashStringToSeed, createSeededRng, getDailyRng } from '../src/utils/Random.js';

test('hashStringToSeed menghasilkan angka integer deterministik', () => {
  const seed1 = hashStringToSeed('2026-11-18');
  const seed2 = hashStringToSeed('2026-11-18');
  const seedDiff = hashStringToSeed('2026-11-19');

  assert.equal(seed1, seed2, 'String yang sama harus menghasilkan hash integer yang sama');
  assert.notEqual(seed1, seedDiff, 'String yang berbeda harus menghasilkan hash integer berbeda');
  assert.ok(Number.isInteger(seed1));
});

test('createSeededRng deterministik dengan urutan nilai yang sama', () => {
  const rng1 = createSeededRng('daily-2026-11-18');
  const rng2 = createSeededRng('daily-2026-11-18');

  for (let i = 0; i < 50; i++) {
    const val1 = rng1();
    const val2 = rng2();
    assert.equal(val1, val2, `Urutan nilai ke-${i} harus identik`);
    assert.ok(val1 >= 0 && val1 < 1, 'Nilai acak harus berada dalam rentang [0, 1)');
  }
});

test('getDailyRng menghasilkan generator deterministik per tanggal', () => {
  const rngA = getDailyRng('2026-11-18');
  const rngB = getDailyRng('2026-11-18');
  const rngC = getDailyRng('2026-11-19');

  assert.equal(rngA(), rngB());
  assert.notEqual(rngA(), rngC());
});
