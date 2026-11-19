const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Emulasi Mobile Chrome (Pixel 7: 412x915, DPR=2.625)
  await page.setViewport({
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true
  });

  const client = await page.target().createCDPSession();
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    window.blockoraApp?.startFreshGame('classic');
  });
  await page.waitForSelector('#blockora-board canvas', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 800));

  // 1. Audit CSS
  const cssAudit = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('#game-container *'));
    const backdropFilters = [];
    const blurFilters = [];
    const largeShadows = [];

    all.forEach(el => {
      const computed = window.getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').slice(0, 2).join('.')}` : '';
      const name = `${tag}${id}${cls}`;

      const bf = computed.backdropFilter || computed.webkitBackdropFilter;
      if (bf && bf !== 'none') backdropFilters.push({ name, value: bf });

      const f = computed.filter;
      if (f && f.includes('blur')) blurFilters.push({ name, value: f });

      const bs = computed.boxShadow;
      if (bs && bs !== 'none') {
        const matches = bs.match(/(\d+)px/g);
        if (matches && matches.some(m => parseInt(m, 10) >= 15)) {
          largeShadows.push({ name, value: bs });
        }
      }
    });

    return { backdropFilters, blurFilters, largeShadows };
  });

  // 2. Audit Phaser
  const phaserAudit = await page.evaluate(() => {
    const game = window.blockoraApp?.phaserGame;
    const canvas = document.querySelector('#blockora-board canvas');
    const scene = window.blockoraApp?.getGameScene();

    return {
      dpr: window.devicePixelRatio,
      clientWidth: canvas?.clientWidth,
      clientHeight: canvas?.clientHeight,
      renderWidth: canvas?.width,
      renderHeight: canvas?.height,
      renderer: game?.renderer?.type === 1 ? 'WebGL' : (game?.renderer?.type === 2 ? 'Canvas' : 'Unknown'),
      displayObjects: scene?.children?.list?.length || 0,
      boardCellViews: scene?.boardCellViews ? 100 : 0
    };
  });

  // 3. Audit Audio
  const audioAudit = await page.evaluate(() => {
    const mgr = window.blockoraApp?.audioManager;
    return {
      bgmEnabled: mgr?.bgmEnabled,
      bgmVolume: mgr?.bgmVolume,
      bgmOscCount: mgr?.bgmOscillators?.length || 0
    };
  });

  // 4. Measure Frame Performance
  const tracePath = path.join(__dirname, 'diag-trace.json');
  await page.tracing.start({
    path: tracePath,
    categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline']
  });

  const perfData = await page.evaluate(async () => {
    const frameDeltas = [];
    let last = performance.now();
    let running = true;

    const loop = (now) => {
      frameDeltas.push(now - last);
      last = now;
      if (running) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const slot0 = document.querySelector('#gameplay-deck-slots [data-slot="0"]');
    const board = document.getElementById('blockora-board');
    const slotRect = slot0.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();

    slot0.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true,
      clientX: slotRect.left + slotRect.width / 2,
      clientY: slotRect.top + slotRect.height / 2,
      pointerId: 1, pointerType: 'touch'
    }));

    for (let i = 0; i < 40; i++) {
      const curX = boardRect.left + (boardRect.width * (0.2 + 0.6 * Math.sin(i / 10)));
      const curY = boardRect.top + (boardRect.height * (0.2 + 0.6 * Math.cos(i / 10)));
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true,
        clientX: curX, clientY: curY,
        pointerId: 1, pointerType: 'touch'
      }));
      await new Promise(r => setTimeout(r, 16));
    }

    const dropX = boardRect.left + boardRect.width * 0.4;
    const dropY = boardRect.top + boardRect.height * 0.4;
    window.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true,
      clientX: dropX, clientY: dropY,
      pointerId: 1, pointerType: 'touch'
    }));

    await new Promise(r => setTimeout(r, 400));
    running = false;

    // Hitung durasi terpanjang dan FPS
    const validDeltas = frameDeltas.slice(3); // skip warmup
    const maxDelta = Math.max(...validDeltas);
    const avgDelta = validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length;
    const fps = Math.round(1000 / avgDelta);

    return { maxDelta: Math.round(maxDelta * 10) / 10, fps, sampleCount: validDeltas.length };
  });

  await page.tracing.stop();

  // Parse trace
  const traceRaw = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
  let scripting = 0, rendering = 0, painting = 0, composite = 0;

  traceRaw.traceEvents.forEach(e => {
    if (!e.dur) return;
    const ms = e.dur / 1000;
    const n = e.name;
    if (['FunctionCall', 'EvaluateScript', 'TimerFire', 'FireAnimationFrame'].includes(n)) scripting += ms;
    else if (['Layout', 'UpdateLayoutTree', 'RecalculateStyles'].includes(n)) rendering += ms;
    else if (['Paint', 'Rasterize'].includes(n)) painting += ms;
    else if (['CompositeLayers'].includes(n)) composite += ms;
  });

  console.log(JSON.stringify({
    perf: {
      fps: perfData.fps,
      maxFrameDurationMs: perfData.maxDelta,
      scriptingMs: Math.round(scripting),
      renderingMs: Math.round(rendering),
      paintingMs: Math.round(painting),
      compositeMs: Math.round(composite)
    },
    css: cssAudit,
    phaser: phaserAudit,
    audio: audioAudit
  }, null, 2));

  await browser.close();
})();
