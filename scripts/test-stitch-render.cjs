const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const sharp = require('sharp');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testStitchOriginal() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1280,
    height: 1134,
    deviceScaleFactor: 2
  });

  const htmlAbs = path.resolve('design/stitch/main-menu.html').replace(/\\/g, '/');
  console.log('Loading file:///' + htmlAbs);
  await page.goto('file:///' + htmlAbs, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 1000));

  const stitchShot = path.join('design/stitch', 'stitch-render-actual.png');
  await page.screenshot({ path: stitchShot });
  console.log('Saved stitch-render-actual.png');

  await browser.close();

  // Compare stitch-render-actual with main-menu.png
  const ref = PNG.sync.read(fs.readFileSync('design/stitch/main-menu.png'));
  const act = PNG.sync.read(fs.readFileSync(stitchShot));

  const diff = new PNG({ width: ref.width, height: ref.height });
  const diffPixels = pixelmatch(ref.data, act.data, diff.data, ref.width, ref.height, {
    threshold: 0.15,
    includeAA: false
  });

  console.log(`Diff between Stitch PNG and Stitch HTML direct render: ${diffPixels} (${((diffPixels / (ref.width * ref.height)) * 100).toFixed(2)}%)`);
}

testStitchOriginal().catch(console.error);
