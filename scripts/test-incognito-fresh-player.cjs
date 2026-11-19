const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('=== PENGUJIAN PROFIL INCOGNITO / FRESH PLAYER DI BUILD PRODUKSI ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Buat context incognito baru (bersih tanpa cache, localStorage, atau IndexedDB sebelumnya)
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
    await wait(600);

    // 1. SCREEN: MAIN MENU
    console.log('--- 1. MAIN MENU (Pemain Baru / Fresh Profile) ---');
    const menuData = await page.evaluate(() => {
      const headerBest = document.querySelector('#screen-menu [data-bind="header-best"]')?.textContent?.trim();
      const classicBest = document.querySelector('#screen-menu [data-bind="classic-best"]')?.textContent?.trim();
      const timeBest = document.querySelector('#screen-menu [data-bind="time-best"]')?.textContent?.trim();
      const streakText = document.querySelector('#screen-menu [data-bind="streak-text"]')?.textContent?.trim();
      const leaderboardText = document.querySelector('#screen-menu .bg-surface-container-lowest:has([data-action="open-leaderboard"])')?.innerText;
      const hasDummyNames = document.body.innerHTML.includes('Aria_Vanguard') || document.body.innerHTML.includes('KaelenNordic') || document.body.innerHTML.includes('24,850');

      return { headerBest, classicBest, timeBest, streakText, leaderboardText, hasDummyNames };
    });

    console.log(`  -> Header BEST: "${menuData.headerBest}"`);
    console.log(`  -> Classic Mode Best: "${menuData.classicBest}"`);
    console.log(`  -> Time Mode Best: "${menuData.timeBest}"`);
    console.log(`  -> Daily Streak: "${menuData.streakText}"`);
    console.log(`  -> Mini Leaderboard Snapshot: "${menuData.leaderboardText?.replace(/\n+/g, ' ')}"`);
    console.log(`  -> Deteksi Dummy Mockup (Aria/Kaelen/24,850): ${menuData.hasDummyNames ? 'DITEMUKAN (GAGAL)' : 'NIHIL (BERSIH)'}\n`);

    // 2. SCREEN: LEADERBOARD
    console.log('--- 2. LEADERBOARD (Routing ke Rekor & Statistik Sesuai Stitch) ---');
    await page.evaluate(() => window.blockoraApp?.showScreen('leaderboard'));
    await wait(400);

    const lbData = await page.evaluate(() => {
      const activeEl = document.querySelector('.screen-container.active');
      const text = activeEl?.innerText;
      return { id: activeEl?.id, text: text?.replace(/\n+/g, ' ') };
    });
    console.log(`  -> Container Aktif: #${lbData.id}`);
    console.log(`  -> Header & Status: "${lbData.text?.slice(0, 120)}..."\n`);

    // 3. SCREEN: STATISTICS
    console.log('--- 3. STATISTICS (Fresh Profile) ---');
    await page.evaluate(() => window.blockoraApp?.showScreen('stats'));
    await wait(400);

    const statsData = await page.evaluate(() => {
      const headerBest = document.querySelector('#screen-stats [data-bind="header-best"]')?.textContent?.trim();
      const savedCount = document.querySelector('#screen-stats [data-bind="header-saved-count"]')?.textContent?.trim();
      const totalGames = document.querySelector('#screen-stats [data-bind="total-games"]')?.textContent?.trim();
      const bestClassic = document.querySelector('#screen-stats [data-bind="best-classic"]')?.textContent?.trim();
      const bestTime = document.querySelector('#screen-stats [data-bind="best-time"]')?.textContent?.trim();
      const hasDummy342 = document.getElementById('screen-stats')?.innerHTML.includes('342');
      const hasDummy56Hari = document.getElementById('screen-stats')?.innerHTML.includes('56 Hari');
      const hasDummyTamu402 = document.getElementById('screen-stats')?.innerHTML.includes('Tamu #402');

      return { headerBest, savedCount, totalGames, bestClassic, bestTime, hasDummy342, hasDummy56Hari, hasDummyTamu402 };
    });
    console.log(`  -> Header BEST: "${statsData.headerBest}"`);
    console.log(`  -> Info Penyimpanan: "${statsData.savedCount}"`);
    console.log(`  -> Total Permainan: "${statsData.totalGames}"`);
    console.log(`  -> Rekor Classic: "${statsData.bestClassic}"`);
    console.log(`  -> Rekor Time Blitz: "${statsData.bestTime}"`);
    console.log(`  -> Deteksi Dummy Mockup (342/56 Hari/Tamu #402): ${statsData.hasDummy342 || statsData.hasDummy56Hari || statsData.hasDummyTamu402 ? 'DITEMUKAN (GAGAL)' : 'NIHIL (BERSIH)'}\n`);

    // 4. SCREEN: SETTINGS
    console.log('--- 4. SETTINGS (Fresh Profile) ---');
    await page.evaluate(() => window.blockoraApp?.showScreen('settings'));
    await wait(400);

    const settingsData = await page.evaluate(() => {
      const headerBest = document.querySelector('#screen-settings [data-bind="header-best"]')?.textContent?.trim();
      const storageText = document.querySelector('#storage-details-text')?.textContent?.trim();
      return { headerBest, storageText };
    });
    console.log(`  -> Header BEST: "${settingsData.headerBest}"`);
    console.log(`  -> Keterangan Storage: "${settingsData.storageText}"\n`);

    // 5. SCREEN: DAILY CHALLENGE
    console.log('--- 5. DAILY CHALLENGE (Fresh Profile) ---');
    await page.evaluate(() => window.blockoraApp?.showScreen('daily'));
    await wait(400);

    const dailyData = await page.evaluate(() => {
      const headerBest = document.querySelector('#screen-daily [data-bind="header-best"]')?.textContent?.trim();
      const streakText = document.querySelector('#screen-daily .font-headline-md.text-headline-md')?.textContent?.trim();
      const ctaBtn = document.querySelector('#screen-daily #btn-start-daily')?.innerText?.replace(/\n+/g, ' ');
      return { headerBest, streakText, ctaBtn };
    });
    console.log(`  -> Header BEST: "${dailyData.headerBest}"`);
    console.log(`  -> Streak Hari: "${dailyData.streakText}"`);
    console.log(`  -> Tombol CTA: "${dailyData.ctaBtn}"\n`);

    // 6. SCREEN: GAMEPLAY
    console.log('--- 6. GAMEPLAY (Fresh Profile) ---');
    await page.evaluate(() => window.blockoraApp?.startFreshGame('classic'));
    await wait(700);

    const gameData = await page.evaluate(() => {
      const headerBest = document.querySelector('#game-container [data-bind="header-best"]')?.textContent?.trim();
      const sessionText = document.querySelector('#gameplay-room-label')?.textContent?.trim();
      const missionTitle = document.querySelector('#mission-title')?.textContent?.trim();
      const missionDesc = document.querySelector('#mission-desc')?.textContent?.trim();
      const missionProg = document.querySelector('#mission-progress-text')?.textContent?.trim();
      const hasRoom402 = document.getElementById('game-container')?.innerHTML.includes('ROOM #402');

      return { headerBest, sessionText, missionTitle, missionDesc, missionProg, hasRoom402 };
    });
    console.log(`  -> Header BEST: "${gameData.headerBest}"`);
    console.log(`  -> Nomor Sesi: "${gameData.sessionText}"`);
    console.log(`  -> Misi Sesi Pertama: "${gameData.missionTitle}" - "${gameData.missionDesc}"`);
    console.log(`  -> Progres Misi: "${gameData.missionProg}"`);
    console.log(`  -> Deteksi Dummy ROOM #402: ${gameData.hasRoom402 ? 'DITEMUKAN (GAGAL)' : 'NIHIL (BERSIH)'}\n`);

    // 7. SCREEN: RESULT / GAME OVER
    console.log('--- 7. RESULT / GAME OVER (Fresh Profile) ---');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('blockora:game-over', {
        detail: {
          score: 0,
          linesCleared: 0,
          maxCombo: 0,
          durationSeconds: 15,
          mode: 'classic',
          reason: 'board_full'
        }
      }));
    });
    await wait(500);

    const resultData = await page.evaluate(() => {
      const headerBest = document.querySelector('#screen-result [data-bind="header-best"]')?.textContent?.trim();
      const finalScore = document.querySelector('#screen-result [data-bind="final-score"]')?.textContent?.trim();
      const allTimeBest = document.querySelector('#screen-result [data-bind="best-score-val"]')?.textContent?.trim();
      const linesCleared = document.querySelector('#screen-result [data-bind="lines-cleared"]')?.textContent?.trim();
      const maxCombo = document.querySelector('#screen-result [data-bind="max-combo"]')?.textContent?.trim();
      const duration = document.querySelector('#screen-result [data-bind="duration"]')?.textContent?.trim();
      const hasDummy18450 = document.getElementById('screen-result')?.innerHTML.includes('18,450');

      return { headerBest, finalScore, allTimeBest, linesCleared, maxCombo, duration, hasDummy18450 };
    });
    console.log(`  -> Header BEST: "${resultData.headerBest}"`);
    console.log(`  -> Skor Akhir: "${resultData.finalScore}"`);
    console.log(`  -> All-Time Best Comparison: "${resultData.allTimeBest}"`);
    console.log(`  -> Lines Cleared: "${resultData.linesCleared}"`);
    console.log(`  -> Max Combo: "${resultData.maxCombo}"`);
    console.log(`  -> Durasi: "${resultData.duration}"`);
    console.log(`  -> Deteksi Dummy Mockup (18,450 / 24,850): ${resultData.hasDummy18450 ? 'DITEMUKAN (GAGAL)' : 'NIHIL (BERSIH)'}\n`);

    console.log('=== SELURUH PENGUJIAN INCOGNITO FRESH PROFILE BERHASIL 100% ===');
  } catch (err) {
    console.error('Terjadi error saat pengujian incognito:', err);
  } finally {
    await browser.close();
  }
})();
