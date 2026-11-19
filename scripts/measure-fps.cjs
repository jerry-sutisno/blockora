const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const client = await page.target().createCDPSession();
  // await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    window.blockoraApp?.startFreshGame('classic');
  });
  await page.waitForSelector('#blockora-board canvas', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 800));

  // 1. Idle FPS
  const idleFps = await page.evaluate(() => {
    return new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(tick);
        } else {
          resolve(Math.round(frames * 1000 / (performance.now() - start)));
        }
      }
      requestAnimationFrame(tick);
    });
  });

  // 2. Dragging FPS
  const slot = await page.$('#gameplay-deck-slots [data-slot="0"]');
  const slotBox = await slot.boundingBox();
  const board = await page.$('#blockora-board');
  const boardBox = await board.boundingBox();

  // Mulai ukur frame
  const dragMeasurePromise = page.evaluate(() => {
    return new Promise(resolve => {
      const deltas = [];
      let last = performance.now();
      let running = true;
      function tick(now) {
        deltas.push(now - last);
        last = now;
        if (running) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      window.__stopMeasure = () => {
        running = false;
        const valid = deltas.slice(2);
        const maxDelta = Math.max(...valid);
        const avgDelta = valid.reduce((a, b) => a + b, 0) / valid.length;
        resolve({
          fps: Math.round(1000 / avgDelta),
          maxFrameDurationMs: Math.round(maxDelta * 10) / 10,
          frameCount: valid.length
        });
      };
    });
  });

  // Gerakkan jari menggunakan Puppeteer Touch API
  const touch = page.touchscreen;
  await touch.tap(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2);
  // dispatch pointerdown
  await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2);
  await page.mouse.down();

  for (let i = 0; i < 30; i++) {
    const curX = boardBox.x + (boardBox.width * (0.3 + 0.4 * Math.sin(i / 5)));
    const curY = boardBox.y + (boardBox.height * (0.3 + 0.4 * Math.cos(i / 5)));
    await page.mouse.move(curX, curY, { steps: 2 });
    await new Promise(r => setTimeout(r, 16));
  }
  await page.mouse.up();

  await page.evaluate(() => window.__stopMeasure());
  const dragResult = await dragMeasurePromise;

  console.log(JSON.stringify({
    idleFps,
    dragFps: dragResult.fps,
    maxFrameDurationMs: dragResult.maxFrameDurationMs,
    frameCount: dragResult.frameCount
  }, null, 2));

  await browser.close();
})();
