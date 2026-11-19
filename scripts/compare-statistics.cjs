const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const sharp = require('sharp');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  console.log('Launching browser for Statistics Screen verification (1280x1024 @2x fullPage)...');
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

  // Render Statistics UI with mockup values matching Stitch mockup for visual parity
  await page.evaluate(() => {
    document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('active'));
    const statsEl = document.getElementById('screen-stats');
    statsEl.classList.add('active');

    const ui = window.blockoraApp?.statsUI || window.blockoraApp?.statisticsUI;
    if (ui) {
      ui.show(statsEl, {
        stats: {
          totalGames: 342,
          totalScore: 4860000,
          totalLinesCleared: 2840,
          currentStreak: 56,
          longestStreak: 56,
          classic: { games: 198, best: 24850, avg: 14210, winRate: 78.4, longestStreak: 12 },
          time: { games: 88, best: 19420, avg: 11940, winRate: 62.1, longestStreak: 6 },
          daily: { games: 56, best: 22000, avg: 17800, clearRate: 100 }
        },
        weekly: [
          { date: '2024-10-14', bestScore: 14200 },
          { date: '2024-10-15', bestScore: 18600 },
          { date: '2024-10-16', bestScore: 16100 },
          { date: '2024-10-17', bestScore: 21800 },
          { date: '2024-10-18', bestScore: 19500 },
          { date: '2024-10-19', bestScore: 24800 },
          { date: '2024-10-20', bestScore: 22400 }
        ]
      });
    }
  });

  // Wait for fonts to be ready
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await new Promise(r => setTimeout(r, 800));

  const actualPath = path.join('design/stitch', 'statistics-actual.png');
  await page.screenshot({ path: actualPath, fullPage: true });
  console.log('Screenshot saved to', actualPath);

  await browser.close();

  // Load reference
  const refPath = path.join('design/stitch', 'statistics.png');
  const refBuf = fs.readFileSync(refPath);
  const actBuf = fs.readFileSync(actualPath);

  const imgRef = PNG.sync.read(refBuf);
  const imgAct = PNG.sync.read(actBuf);

  const width = imgRef.width;
  const height = imgRef.height;

  console.log(`Reference size: ${width}x${height}`);
  console.log(`Actual size: ${imgAct.width}x${imgAct.height}`);

  if (imgAct.width !== width || imgAct.height !== height) {
    console.warn(`Dimension mismatch! Resizing actual to match reference...`);
    const resized = await sharp(actBuf).resize(width, height, { fit: 'fill' }).toBuffer();
    return compareImages(imgRef, PNG.sync.read(resized), width, height);
  }

  return compareImages(imgRef, imgAct, width, height);
}

function compareImages(img1, img2, width, height) {
  const diff = new PNG({ width, height });

  // Mask zones for dynamic elements:
  // 1. Header right Best chip: x ~ 1950..2200, y ~ 20..90
  // 2. Sync indicator ping pulse dot: x ~ 1700..1800, y ~ 160..220
  const isMasked = (x, y) => {
    // Header best chip
    if (x >= 1950 && x <= 2200 && y >= 20 && y <= 90) return true;
    // Sync indicator dot (top action bar)
    if (x >= 1680 && x <= 1780 && y >= 160 && y <= 220) return true;
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

  const diffPath = path.join('design/stitch', 'statistics-diff.png');
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
    .toFile(path.join('design/stitch', 'statistics-comparison.png'));

    console.log('Side-by-side comparison saved to design/stitch/statistics-comparison.png');
  } catch (err) {
    console.error('Error creating side-by-side:', err);
  }
}

run().catch(console.error);
