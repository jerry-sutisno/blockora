const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const sharp = require('sharp');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testSettingsDirect() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-animations']
  });

  const page = await browser.newPage();
  // Viewport 1536x1024 @1x
  await page.setViewport({ width: 1536, height: 1024, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  const htmlAbs = path.resolve('design/stitch/settings.html').replace(/\\/g, '/');
  console.log('Loading file:///' + htmlAbs);
  await page.goto('file:///' + htmlAbs, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 800));

  const shotPath = path.join('design/stitch', 'settings-direct.png');
  await page.screenshot({ path: shotPath, fullPage: true });

  await browser.close();

  // Convert ref jpg/png to PNG buffer
  const refBuf = await sharp('design/stitch/settings.png').png().toBuffer();
  const actBuf = fs.readFileSync(shotPath);

  const ref = PNG.sync.read(refBuf);
  const act = PNG.sync.read(actBuf);

  console.log(`Ref size: ${ref.width}x${ref.height}`);
  console.log(`Act size: ${act.width}x${act.height}`);

  // Resize actual to ref if needed
  const actResizedBuf = await sharp(actBuf).resize(ref.width, ref.height, { fit: 'fill' }).toBuffer();
  const actResized = PNG.sync.read(actResizedBuf);

  const diff = new PNG({ width: ref.width, height: ref.height });
  const diffPixels = pixelmatch(ref.data, actResized.data, diff.data, ref.width, ref.height, {
    threshold: 0.15,
    includeAA: false
  });

  const total = ref.width * ref.height;
  console.log(`Diff: ${diffPixels} / ${total} (${((diffPixels / total) * 100).toFixed(2)}%)`);
}

testSettingsDirect().catch(console.error);
