import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getComboPitch, getClearPitchSequence } from '../src/audio/AudioPitchHelper.js';
import { MotionPrefs } from '../src/utils/MotionPrefs.js';

test('AudioPitchHelper: getComboPitch naik bertingkat dan dibatasi maxCapLevel', () => {
  const pitch1 = getComboPitch(1);
  const pitch2 = getComboPitch(2);
  const pitch3 = getComboPitch(3);
  const pitch8 = getComboPitch(8);
  const pitch20 = getComboPitch(20); // Harus tertahan di level 8 (cap)

  assert.equal(pitch1, 440, 'Level 1 harus 440Hz');
  assert.ok(pitch2 > pitch1, 'Level 2 harus lebih tinggi dari level 1');
  assert.ok(pitch3 > pitch2, 'Level 3 harus lebih tinggi dari level 2');
  assert.ok(pitch8 > pitch3);
  assert.equal(pitch20, pitch8, 'Combo level ekstrem (20) harus dibatasi pada cap level 8');
});

test('AudioPitchHelper: getClearPitchSequence menghasilkan arpeggio sesuai jumlah garis', () => {
  const single = getClearPitchSequence(1);
  assert.equal(single.length, 1);
  assert.equal(single[0], 523.25);

  const triple = getClearPitchSequence(3);
  assert.equal(triple.length, 3);
  assert.equal(triple[0], 523.25);
  assert.equal(triple[1], 659.25);
  assert.equal(triple[2], 783.99);

  const excessive = getClearPitchSequence(10);
  assert.equal(excessive.length, 5, 'Dibatasi maksimal 5 nada');
});

test('MotionPrefs: resolveReducedMotion mematuhi override pengguna atau fallback ke sistem', () => {
  // Override aktif
  assert.equal(MotionPrefs.resolveReducedMotion({ storedValue: 'true', systemPrefersReduced: false }), true);
  // Override mati
  assert.equal(MotionPrefs.resolveReducedMotion({ storedValue: 'false', systemPrefersReduced: true }), false);
  // Default (tanpa override di storage)
  assert.equal(MotionPrefs.resolveReducedMotion({ storedValue: null, systemPrefersReduced: true }), true);
  assert.equal(MotionPrefs.resolveReducedMotion({ storedValue: null, systemPrefersReduced: false }), false);
});
