const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testFullPage1024() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-animations']
  });

  const page = await browser.newPage();
  // Viewport 1280x1024 at 2x
  await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  await page.goto('file:///' + require('path').resolve('design/stitch/result.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 800));

  const testShot = path.join('design/stitch', 'test-1024-fullpage.png');
  await page.screenshot({ path: testShot, fullPage: true });

  await browser.close();

  const ref = PNG.sync.read(fs.readFileSync('design/stitch/result.png'));
  const act = PNG.sync.read(fs.readFileSync(testShot));

  console.log(`Ref size: ${ref.width}x${ref.height}`);
  console.log(`Act size: ${act.width}x${act.height}`);

  const diff = new PNG({ width: ref.width, height: ref.height });
  const diffPixels = pixelmatch(ref.data, act.data, diff.data, ref.width, ref.height, {
    threshold: 0.15,
    includeAA: false
  });

  console.log(`Diff between Stitch PNG and 1024 fullPage render: ${diffPixels} (${((diffPixels / (ref.width * ref.height)) * 100).toFixed(2)}%)`);
}

testFullPage1024().catch(console.error);
