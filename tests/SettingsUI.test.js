import test from 'node:test';
import assert from 'node:assert/strict';
import { SettingsUI } from '../src/ui/SettingsUI.js';
import { StorageManager } from '../src/storage/StorageManager.js';
import { HapticManager } from '../src/utils/HapticManager.js';
import { MotionPrefs } from '../src/utils/MotionPrefs.js';

// Setup mock globals untuk Node.js environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { vibrate: () => true };
} else if (!globalThis.navigator.vibrate) {
  globalThis.navigator.vibrate = () => true;
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

test('SettingsUI: render markup Stitch dan periksa elemen kunci', async () => {
  const settingsUI = new SettingsUI({
    onBack: () => {},
    onResetComplete: () => {}
  });

  const container = createMockContainer();
  await settingsUI.show(container);

  // Verifikasi judul dan header
  assert.ok(container.innerHTML.includes('Pengaturan &amp; Preferensi'));
  assert.ok(container.innerHTML.includes('Kembali ke Menu Utama'));
  assert.ok(container.innerHTML.includes('Pengaturan Tersimpan'));

  // Verifikasi Audio controls
  assert.ok(container.innerHTML.includes('Efek Suara (SFX)'));
  assert.ok(container.innerHTML.includes('Musik Latar (BGM)'));
  assert.ok(container.innerHTML.includes('id="toggle-sfx"'));
  assert.ok(container.innerHTML.includes('id="toggle-bgm"'));
  assert.ok(container.innerHTML.includes('id="sfx-range"'));
  assert.ok(container.innerHTML.includes('id="bgm-range"'));

  // Verifikasi trek ambience disabled dengan lencana Segera
  assert.ok(container.innerHTML.includes('Chillwave Focus'));
  assert.ok(container.innerHTML.includes('Nordic Dawn'));
  assert.ok(container.innerHTML.includes('Matte Wood'));
  assert.ok(container.innerHTML.includes('Segera'));

  // Verifikasi 4 mode haptic
  assert.ok(container.innerHTML.includes('Renyah &amp; Ringan (Crisp)'));
  assert.ok(container.innerHTML.includes('Tegas &amp; Dalam (Solid)'));
  assert.ok(container.innerHTML.includes('Getaran Dinamis'));
  assert.ok(container.innerHTML.includes('Nonaktifkan Getaran'));
  assert.ok(container.innerHTML.includes('id="haptic-test-btn"'));

  // Verifikasi visual tema & reduce motion
  assert.ok(container.innerHTML.includes('Luminous Light'));
  assert.ok(container.innerHTML.includes('Deep Slate Dark'));
  assert.ok(container.innerHTML.includes('Pastel Minimal'));
  assert.ok(container.innerHTML.includes('Mode Reduksi Animasi'));
  assert.ok(container.innerHTML.includes('id="toggle-motion"'));

  // Verifikasi Danger zone & versi
  assert.ok(container.innerHTML.includes('Zona Bahaya &amp; Data'));
  assert.ok(container.innerHTML.includes('Reset Data Lokal'));
  assert.ok(container.innerHTML.includes('Penyimpanan Terpakai'));
  assert.ok(container.innerHTML.includes('BLOCKORA v0.1.0'));
  assert.ok(container.innerHTML.includes('Lokal Perangkat'));
});

test('HapticManager: mode getaran tersimpan dan berubah sesuai pilihan', () => {
  HapticManager.setMode('solid');
  assert.equal(HapticManager.getMode(), 'solid');

  HapticManager.setMode('dynamic');
  assert.equal(HapticManager.getMode(), 'dynamic');

  HapticManager.setMode('off');
  assert.equal(HapticManager.getMode(), 'off');
  assert.equal(HapticManager.isEnabled(), false);

  HapticManager.setMode('crisp');
  assert.equal(HapticManager.getMode(), 'crisp');
});

test('MotionPrefs: setReducedMotion mengupdate status dan localStorage', () => {
  MotionPrefs.setReducedMotion(true);
  assert.equal(MotionPrefs.isReduced, true);
  assert.equal(localStorage.getItem('blockora.settings.reduce_motion'), 'true');

  MotionPrefs.setReducedMotion(false);
  assert.equal(MotionPrefs.isReduced, false);
  assert.equal(localStorage.getItem('blockora.settings.reduce_motion'), 'false');
});
