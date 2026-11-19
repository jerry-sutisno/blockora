const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const sharp = require('sharp');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  console.log('Launching browser for Result Screen verification (1280x1024 @2x fullPage)...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-font-subpixel-positioning',
      '--disable-animations'
    ]
  });

  const page = await browser.newPage();
  
  // Viewport 1280x1024 with deviceScaleFactor: 2 (Stitch desktop standard)
  await page.setViewport({
    width: 1280,
    height: 1024,
    deviceScaleFactor: 2
  });

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  console.log('Navigating to http://localhost:5173/...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Render Result UI with sample mock data matching Stitch mockup
  await page.evaluate(() => {
    document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('active'));
    const resultEl = document.getElementById('screen-result');
    resultEl.classList.add('active');

    if (window.blockoraApp && window.blockoraApp.resultUI) {
      window.blockoraApp.resultUI.show(resultEl, {
        score: 18450,
        linesCleared: 18,
        maxCombo: 5,
        durationSeconds: 252,
        mode: 'classic',
        reason: 'board_full'
      });
    }
  });

  // Wait for fonts to be ready
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await new Promise(r => setTimeout(r, 800));

  const actualPath = path.join('design/stitch', 'result-actual.png');
  await page.screenshot({ path: actualPath, fullPage: true });
  console.log('Screenshot saved to', actualPath);

  await browser.close();

  // Load reference
  const refPath = path.join('design/stitch', 'result.png');
  const refBuf = fs.readFileSync(refPath);
  const actBuf = fs.readFileSync(actualPath);

  const imgRef = PNG.sync.read(refBuf);
  const imgAct = PNG.sync.read(actBuf);

  const width = imgRef.width;
  const height = imgRef.height;

  console.log(`Reference size: ${width}x${height}`);
  console.log(`Actual size: ${imgAct.width}x${imgAct.height}`);

  if (imgAct.width !== width || imgAct.height !== height) {
    console.warn(`Dimension mismatch! Resizing actual...`);
    const resized = await sharp(actBuf).resize(width, height, { fit: 'fill' }).toBuffer();
    return compareImages(imgRef, PNG.sync.read(resized), width, height);
  }

  return compareImages(imgRef, imgAct, width, height);
}

function compareImages(img1, img2, width, height) {
  const diff = new PNG({ width, height });

  // Mask zones for dynamic elements (pulse dot, etc):
  const isMasked = (x, y) => {
    // Header right Best chip
    if (x >= 1950 && x <= 2200 && y >= 20 && y <= 90) return true;
    // Pulse dot in status pill (x: 1180..1220, y: 550..650)
    if (x >= 1180 && x <= 1220 && y >= 550 && y <= 650) return true;
    return false;
  };

  const masked1 = new PNG({ width, height });
  const masked2 = new PNG({ width, height });
  img1.data.copy(masked1.data);
  img2.data.copy(masked2.data);

  let totalUnmasked = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (isMasked(x, y)) {
        masked1.data[idx] = 128;
        masked1.data[idx+1] = 128;
        masked1.data[idx+2] = 128;
        masked1.data[idx+3] = 255;
        masked2.data[idx] = 128;
        masked2.data[idx+1] = 128;
        masked2.data[idx+2] = 128;
        masked2.data[idx+3] = 255;
      } else {
        totalUnmasked++;
      }
    }
  }

  const diffPixels = pixelmatch(masked1.data, masked2.data, diff.data, width, height, {
    threshold: 0.15,
    includeAA: false
  });

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalUnmasked) * 100;

  console.log(`Total pixels: ${totalPixels}`);
  console.log(`Unmasked pixels: ${totalUnmasked}`);
  console.log(`Diff pixels (unmasked): ${diffPixels}`);
  console.log(`Diff percentage (unmasked): ${diffPercent.toFixed(2)}%`);

  const diffPath = path.join('design/stitch', 'result-diff.png');
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  console.log('Diff image saved to', diffPath);

  createSideBySide(img1, img2, diff, width, height);
}

async function createSideBySide(imgRef, imgAct, imgDiff, width, height) {
  try {
    const targetW = 800;
    const targetH = Math.round((height / width) * targetW);

    const refBuf = await sharp(PNG.sync.write(imgRef)).resize(targetW, targetH).toBuffer();
    const actBuf = await sharp(PNG.sync.write(imgAct)).resize(targetW, targetH).toBuffer();
    const diffBuf = await sharp(PNG.sync.write(imgDiff)).resize(targetW, targetH).toBuffer();

    await sharp({
      create: {
        width: targetW * 3 + 40,
        height: targetH + 60,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 }
      }
    })
    .composite([
      { input: refBuf, left: 10, top: 40 },
      { input: actBuf, left: targetW + 20, top: 40 },
      { input: diffBuf, left: targetW * 2 + 30, top: 40 }
    ])
    .png()
    .toFile(path.join('design/stitch', 'result-comparison.png'));

    console.log('Side-by-side comparison saved to design/stitch/result-comparison.png');
  } catch (err) {
    console.error('Error creating side-by-side:', err);
  }
}

run().catch(console.error);
