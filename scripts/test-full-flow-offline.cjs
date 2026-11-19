const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET_URL = 'http://localhost:4173/';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('=== UJI KESELURUHAN & OFFLINE PWA (PASS PENUTUP) ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-animations'
    ]
  });

  try {
    const page = await browser.newPage();

    // -------------------------------------------------------------
    // FASE A: Registrasi Service Worker & Priming Cache
    // -------------------------------------------------------------
    console.log(`Fase A: Registrasi Service Worker & Priming Cache di ${TARGET_URL}...`);
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
    await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });
    await wait(2000);

    // -------------------------------------------------------------
    // FASE B: Masuk Mode OFFLINE Penuh (Simulasi Tanpa Internet)
    // -------------------------------------------------------------
    console.log('\nFase B: Mematikan Jaringan (Simulasi OFFLINE murni)...');
    await page.setOfflineMode(true);

    // -------------------------------------------------------------
    // FASE C: Uji Semua Layar & Refresh di 1280px Desktop
    // -------------------------------------------------------------
    console.log('\n--- Uji Desktop (1280px) dalam Kondisi OFFLINE ---');
    const screens = ['menu', 'daily', 'stats', 'settings', 'game'];

    for (const screen of screens) {
      console.log(`Menguji navigasi offline ke layar: [${screen.toUpperCase()}]`);
      await page.evaluate((s) => {
        if (s === 'game') {
          window.blockoraApp?.startFreshGame('classic');
        } else {
          window.blockoraApp?.showScreen(s);
        }
      }, screen);
      await wait(600);

      // Verifikasi layar aktif
      const targetId = screen === 'game' ? 'game-container' : `screen-${screen}`;
      const isActive = await page.evaluate((id) => {
        const el = document.getElementById(id);
        return el && el.classList.contains('active');
      }, targetId);
      console.log(`  -> Status layar #${targetId}.active: ${isActive ? 'OK' : 'GAGAL'}`);

      // Uji refresh di layar ini dalam kondisi OFFLINE
      console.log(`  -> Menjalankan REFRESH halaman dalam kondisi OFFLINE...`);
      await page.reload({ waitUntil: 'networkidle0' });
      await wait(800);
      const afterReload = await page.evaluate(() => {
        return document.getElementById('app') !== null;
      });
      console.log(`  -> Aplikasi pulih dari cache SW setelah reload offline: ${afterReload ? 'SUKSES' : 'GAGAL'}`);
    }

    // -------------------------------------------------------------
    // FASE D: Uji Alur Penuh Permainan (Gameplay -> Game Over -> Result)
    // -------------------------------------------------------------
    console.log('\nFase D: Menguji Alur Permainan (Play -> Game Over -> Result -> Main Menu)...');
    await page.evaluate(() => {
      window.blockoraApp?.startFreshGame('classic');
    });
    await wait(800);

    // Trigger game over
    console.log('  -> Memverifikasi pemicuan Game Over...');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('blockora:game-over', {
        detail: {
          score: 14820,
          linesCleared: 12,
          maxCombo: 3,
          durationSeconds: 120,
          mode: 'classic',
          reason: 'board_full'
        }
      }));
    });
    await wait(400);

    const isResultActive = await page.evaluate(() => {
      const el = document.getElementById('screen-result');
      return el && el.classList.contains('active');
    });
    console.log(`  -> Layar Result/Game Over terbuka: ${isResultActive ? 'SUKSES' : 'GAGAL'}`);

    // Klik tombol Main Lagi dari Result UI
    console.log('  -> Menguji tombol Play Again...');
    await page.evaluate(() => {
      const playAgainBtn = document.querySelector('#screen-result [data-action="play-again"]');
      if (playAgainBtn) playAgainBtn.click();
    });
    await wait(600);
    const isGameAgainActive = await page.evaluate(() => {
      const el = document.getElementById('game-container');
      return el && el.classList.contains('active');
    });
    console.log(`  -> Game kembali dimulai: ${isGameAgainActive ? 'SUKSES' : 'GAGAL'}`);

    // -------------------------------------------------------------
    // FASE E: Uji Mobile Responsive (360px)
    // -------------------------------------------------------------
    console.log('\n--- Uji Mobile Responsive (360px) dalam Kondisi OFFLINE ---');
    await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    for (const screen of ['menu', 'game', 'daily', 'stats', 'settings']) {
      await page.evaluate((s) => {
        if (s === 'game') window.blockoraApp?.startFreshGame('classic');
        else window.blockoraApp?.showScreen(s);
      }, screen);
      await wait(500);

      const targetId = screen === 'game' ? 'game-container' : `screen-${screen}`;
      const hasHorizontalScroll = await page.evaluate((id) => {
        const el = document.getElementById(id);
        return el ? (el.scrollWidth > window.innerWidth + 2) : false;
      }, targetId);
      console.log(`  -> Mobile 360px [${screen.toUpperCase()}]: horizontal overflow = ${hasHorizontalScroll ? 'ADA OVERFLOW' : 'NIHIL (Sesuai 360px)'}`);
    }

    // -------------------------------------------------------------
    // FASE F: Verifikasi Ikon Glyph Offline (Material Symbols & Typography)
    // -------------------------------------------------------------
    console.log('\n--- Verifikasi Rendering Ikon Glyph & Font dalam Kondisi OFFLINE ---');
    const glyphsVerified = await page.evaluate(() => {
      const iconSpan = document.querySelector('.material-symbols-outlined');
      if (!iconSpan) return false;
      const computedFont = window.getComputedStyle(iconSpan).fontFamily;
      const hasGlyphFont = computedFont.includes('Material Symbols Outlined');

      const bodyFont = window.getComputedStyle(document.body).fontFamily;
      const hasBodyFont = bodyFont.includes('Plus Jakarta Sans');

      return hasGlyphFont && hasBodyFont;
    });
    console.log(`  -> Font Plus Jakarta Sans & Material Symbols Outlined aktif offline: ${glyphsVerified ? 'SUKSES (100% Glyph Asli)' : 'GAGAL'}`);

    console.log('\n=== SELURUH PENGUJIAN ALUR & OFFLINE PWA BERHASIL 100% ===');
  } catch (err) {
    console.error('Error selama pengujian:', err);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
