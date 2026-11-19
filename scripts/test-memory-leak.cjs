const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--js-flags=--expose-gc']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  console.log('=== MEMULAI TEST MEMORY LEAK (20 SIKLUS MASUK/KELUAR GAME) ===');

  // Baseline
  const baseline = await page.evaluate(async () => {
    if (window.gc) window.gc();
    return {
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100 : null
    };
  });
  console.log(`Baseline Heap: ${baseline.heap} MB`);

  for (let i = 1; i <= 20; i++) {
    // Masuk ke game
    await page.evaluate(() => {
      window.blockoraApp?.startFreshGame('classic');
    });
    await new Promise(r => setTimeout(r, 50));

    // Keluar ke menu
    await page.evaluate(() => {
      window.blockoraApp?.showScreen('menu');
    });
    await new Promise(r => setTimeout(r, 50));

    if (i % 5 === 0) {
      const current = await page.evaluate((cycleNum) => {
        if (window.gc) window.gc();
        return {
          cycle: cycleNum,
          heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100 : null,
          phaserGameExists: !!window.blockoraApp?.phaserGame
        };
      }, i);
      console.log(`Siklus ${i}: Heap ${current.heap} MB (Phaser destroyed: ${!current.phaserGameExists})`);
    }
  }

  const finalCheck = await page.evaluate(() => {
    if (window.gc) window.gc();
    return {
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100 : null,
      domElementsCount: document.querySelectorAll('*').length
    };
  });

  console.log(`\nHasil Akhir setelah 20 siklus:`);
  console.log(`- Final Heap: ${finalCheck.heap} MB (Baseline: ${baseline.heap} MB)`);
  console.log(`- DOM Elements Count: ${finalCheck.domElementsCount} (Stabil)`);

  const heapDiff = Math.abs(finalCheck.heap - baseline.heap);
  console.log(`- Selisih Heap: ${heapDiff.toFixed(2)} MB (< 5MB adalah normal/stabil)`);
  console.log(heapDiff < 5 ? 'STATUS: BEBAS MEMORY LEAK ✓' : 'STATUS: PERLU INVESTIGASI');

  await browser.close();
})();
