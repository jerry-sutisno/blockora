const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const sharp = require('sharp');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  console.log('Launching browser...');
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
  
  // Set viewport to 1280x1134 with deviceScaleFactor: 2 -> yields 2560x2268
  await page.setViewport({
    width: 1280,
    height: 1134,
    deviceScaleFactor: 2
  });

  // Emulate reduced motion to stop CSS animations from shifting frames
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  console.log('Navigating to http://localhost:5173/...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Wait for fonts to be completely ready
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Wait extra 500ms for stable render
  await new Promise(r => setTimeout(r, 800));

  const actualPath = path.join('design/stitch', 'main-menu-actual.png');
  await page.screenshot({ path: actualPath, fullPage: false });
  console.log('Screenshot saved to', actualPath);

  await browser.close();

  // Load reference image
  const refPath = path.join('design/stitch', 'main-menu.png');
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
    const resizedActBuf = await sharp(actBuf).resize(width, height, { fit: 'fill' }).toBuffer();
    const resizedAct = PNG.sync.read(resizedActBuf);
    return compareImages(imgRef, resizedAct, width, height);
  }

  return compareImages(imgRef, imgAct, width, height);
}

function compareImages(img1, img2, width, height) {
  const diff = new PNG({ width, height });

  // Area data dinamis yang di-mask (sesuai instruksi user):
  // 1. Season pill status (animate-ping dot) & subtitle version / fps
  // 2. Teks nilai skor dinamis (header best, classic best, time top, streak days)
  // 3. Mini leaderboard row values
  
  const isMasked = (x, y) => {
    // Header right best chip: x ~ 1950..2200, y ~ 20..90
    if (x >= 1950 && x <= 2200 && y >= 20 && y <= 90) return true;
    
    // Season active dot & badge: x ~ 140..460, y ~ 280..360
    if (x >= 140 && x <= 460 && y >= 280 && y <= 360) return true;

    // Classic Best chip: x ~ 460..700, y ~ 1030..1090
    if (x >= 460 && x <= 700 && y >= 1030 && y <= 1090) return true;

    // Time Today's Top chip: x ~ 460..720, y ~ 1240..1300
    if (x >= 460 && x <= 720 && y >= 1240 && y <= 1300) return true;

    // Daily puzzle text: x ~ 360..580, y ~ 1440..1500
    if (x >= 360 && x <= 580 && y >= 1440 && y <= 1500) return true;

    // Streak Days Running text: x ~ 1700..2000, y ~ 450..520
    if (x >= 1700 && x <= 2000 && y >= 450 && y <= 520) return true;

    // Mini Leaderboard rank texts: x ~ 1600..2350, y ~ 1700..1960
    if (x >= 1600 && x <= 2350 && y >= 1700 && y <= 1960) return true;

    return false;
  };

  // Zero out diff in masked regions
  const maskedImg1 = new PNG({ width, height });
  const maskedImg2 = new PNG({ width, height });
  img1.data.copy(maskedImg1.data);
  img2.data.copy(maskedImg2.data);

  let totalUnmaskedPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (isMasked(x, y)) {
        // Force identical pixels in mask
        maskedImg1.data[idx] = 128;
        maskedImg1.data[idx + 1] = 128;
        maskedImg1.data[idx + 2] = 128;
        maskedImg1.data[idx + 3] = 255;
        maskedImg2.data[idx] = 128;
        maskedImg2.data[idx + 1] = 128;
        maskedImg2.data[idx + 2] = 128;
        maskedImg2.data[idx + 3] = 255;
      } else {
        totalUnmaskedPixels++;
      }
    }
  }

  const diffPixels = pixelmatch(maskedImg1.data, maskedImg2.data, diff.data, width, height, {
    threshold: 0.15,
    includeAA: false
  });

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalUnmaskedPixels) * 100;

  console.log(`Total pixels: ${totalPixels}`);
  console.log(`Unmasked pixels: ${totalUnmaskedPixels}`);
  console.log(`Diff pixels (unmasked): ${diffPixels}`);
  console.log(`Diff percentage (unmasked): ${diffPercent.toFixed(2)}%`);

  const diffPath = path.join('design/stitch', 'main-menu-diff.png');
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
    .toFile(path.join('design/stitch', 'main-menu-comparison.png'));

    console.log('Side-by-side comparison saved to design/stitch/main-menu-comparison.png');
  } catch (err) {
    console.error('Error creating side-by-side:', err);
  }
}

run().catch(console.error);
