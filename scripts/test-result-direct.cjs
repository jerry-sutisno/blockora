const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testResultDirect() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-animations']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1128, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  const htmlAbs = path.resolve('design/stitch/result.html').replace(/\\/g, '/');
  console.log('Loading file:///' + htmlAbs);
  await page.goto('file:///' + htmlAbs, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 800));

  const shotPath = path.join('design/stitch', 'result-stitch-direct.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved result-stitch-direct.png');

  await browser.close();

  const ref = PNG.sync.read(fs.readFileSync('design/stitch/result.png'));
  const act = PNG.sync.read(fs.readFileSync(shotPath));

  const diff = new PNG({ width: ref.width, height: ref.height });
  const diffPixels = pixelmatch(ref.data, act.data, diff.data, ref.width, ref.height, {
    threshold: 0.15,
    includeAA: false
  });

  console.log(`Diff between Stitch PNG and Stitch HTML direct render: ${diffPixels} (${((diffPixels / (ref.width * ref.height)) * 100).toFixed(2)}%)`);
}

testResultDirect().catch(console.error);
