const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testMobile() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-animations']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  await page.evaluate(async () => {
    document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('active'));
    const gameEl = document.getElementById('game-container');
    gameEl.classList.add('active');

    const ui = window.blockoraApp?.gameplayUI;
    if (ui) {
      await ui.show(gameEl, {
        mode: 'classic',
        score: 14820,
        combo: 3,
        emptyCells: 91
      });
    }
  });

  await new Promise(r => setTimeout(r, 600));
  const shotPath = path.join('design/stitch', 'gameplay-mobile-actual.png');
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log(`Saved mobile screenshot: ${shotPath}`);

  await browser.close();
}

testMobile().catch(console.error);
