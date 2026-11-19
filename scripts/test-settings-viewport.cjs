const puppeteer = require('puppeteer-core');
const path = require('path');
const { PNG } = require('pngjs');
const fs = require('fs');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-animations']
  });

  const ref = PNG.sync.read(fs.readFileSync('design/stitch/settings.png'));
  console.log('Ref:', ref.width, 'x', ref.height);

  for (const [w, dpr] of [[768, 2], [1536, 1], [1280, 2]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 1024, deviceScaleFactor: dpr });
    const htmlAbs = path.resolve('design/stitch/settings.html').replace(/\\/g, '/');
    await page.goto('file:///' + htmlAbs, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const buf = await page.screenshot({ fullPage: true });
    const img = PNG.sync.read(buf);
    console.log(`Viewport ${w} @${dpr}x -> ${img.width} x ${img.height}`);
    await page.close();
  }

  await browser.close();
})();
