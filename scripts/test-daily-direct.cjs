const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const sharp = require('sharp');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testDailyDirect() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-animations']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  const htmlAbs = path.resolve('design/stitch/daily.html').replace(/\\/g, '/');
  console.log('Loading file:///' + htmlAbs);
  await page.goto('file:///' + htmlAbs, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 800));

  const shotPath = path.join('design/stitch', 'daily-direct-2x.png');
  await page.screenshot({ path: shotPath, fullPage: true });

  await browser.close();

  const refBuf = await sharp('design/stitch/daily.png').png().toBuffer();
  const actBuf = fs.readFileSync(shotPath);

  const ref = PNG.sync.read(refBuf);
  const act = PNG.sync.read(actBuf);

  console.log(`Ref size: ${ref.width}x${ref.height}`);
  console.log(`Act size: ${act.width}x${act.height}`);

  const minHeight = Math.min(ref.height, act.height);
  const diff = new PNG({ width: ref.width, height: minHeight });

  // Crop both to minHeight
  const refCroppedBuf = await sharp(refBuf).extract({ left: 0, top: 0, width: ref.width, height: minHeight }).png().toBuffer();
  const actCroppedBuf = await sharp(actBuf).extract({ left: 0, top: 0, width: act.width, height: minHeight }).png().toBuffer();

  const refCrop = PNG.sync.read(refCroppedBuf);
  const actCrop = PNG.sync.read(actCroppedBuf);

  const diffPixels = pixelmatch(refCrop.data, actCrop.data, diff.data, ref.width, minHeight, {
    threshold: 0.15,
    includeAA: false
  });

  const total = ref.width * minHeight;
  console.log(`Diff: ${diffPixels} / ${total} (${((diffPixels / total) * 100).toFixed(2)}%)`);
}

testDailyDirect().catch(console.error);
