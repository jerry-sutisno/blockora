const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const sharp = require('sharp');

let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  console.log('Launching browser for Daily Challenge verification (1280x900 @2x fullPage)...');
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
  
  // Standard desktop viewport 1280 @2x
  await page.setViewport({
    width: 1280,
    height: 900,
    deviceScaleFactor: 2
  });

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  console.log('Navigating to http://localhost:5173/...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Render Daily Challenge UI with mockup values matching Stitch
  await page.evaluate(async () => {
    document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('active'));
    const dailyEl = document.getElementById('screen-daily');
    dailyEl.classList.add('active');

    const ui = window.blockoraApp?.dailyUI;
    if (ui) {
      // Mock data matching Stitch mockup
      const mockRecords = {};
      // 1 to 23 completed (except day 12 missed)
      for (let i = 1; i <= 23; i++) {
        if (i !== 12) {
          const key = `2025-10-${String(i).padStart(2, '0')}`;
          mockRecords[key] = { completed: true, bestScore: 10000, targetsDone: 3 };
        }
      }

      await ui.show(dailyEl, {
        dateKey: '2025-10-24',
        year: 2025,
        month: 9, // Oktober (0-indexed: 9)
        todayStr: '2025-10-24',
        streak: 56,
        bestScore: 24850,
        countdown: '07:14:22',
        editionNum: 142,
        seasonText: 'Musim Gugur 2025',
        allRecords: mockRecords,
        selectedRecord: { completed: false, bestScore: 14250, targetsDone: 2 },
        targetsDone: 2,
        percentMonth: 93,
        milestoneRatio: '22 / 25',
        legendCompleted: 22,
        legendToday: 24,
        legendMissed: 1,
        legendLocked: 7,
        ctaText: 'Lanjutkan Tantangan Hari Ini',
        ctaSub: 'Target Terakhir',
        missionConfig: {
          dateKey: '2025-10-24',
          themeName: 'Simetri Monokrom',
          targets: [
            {
              id: 'lines',
              label: 'Bersihkan 5 baris balok biru',
              description: 'Selesaikan 5 baris horizontal hanya memakai balok monokromatis biru azure.',
              target: 5,
              current: 5,
              currentValText: '5 / 5 Selesai'
            },
            {
              id: 'score',
              label: 'Capai 12,000 poin dengan rotasi minimal',
              description: 'Batas rotasi maksimal 3 kali sepanjang babak permainan.',
              target: 12000,
              current: 12000,
              currentValText: '14,250 Poin'
            },
            {
              id: 'combo',
              label: 'Pertahankan Combo Cascade x3',
              description: 'Hancurkan minimal 1 baris dalam 3 langkah berurutan tanpa jeda kegagalan.',
              target: 3,
              current: 2,
              currentValText: 'x2 / x3 Aktif'
            }
          ]
        },
        tipText: 'Simpan balok berdimensi 3x3 di slot cadangan untuk memicu kombo cascade pada baris ketiga.',
        statTitle: 'Pemain Selesai',
        statBold: '18,492 pemain',
        statDesc: 'telah menaklukkan teka-teki Simetri Monokrom hari ini.'
      });
    }
  });

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await new Promise(r => setTimeout(r, 800));

  const actualPath = path.join('design/stitch', 'daily-actual.png');
  await page.screenshot({ path: actualPath, fullPage: true });
  console.log('Screenshot saved to', actualPath);

  await browser.close();

  // Load benchmark render of daily.html
  const htmlDirectPath = path.join('design/stitch', 'daily-direct-2x.png');

  const refBuf = fs.readFileSync(htmlDirectPath);
  const actBuf = fs.readFileSync(actualPath);

  const imgRef = PNG.sync.read(refBuf);
  const imgAct = PNG.sync.read(actBuf);

  const width = imgRef.width;
  const height = imgRef.height;

  console.log(`Reference size (Direct HTML Benchmark): ${width}x${height}`);
  console.log(`Actual size: ${imgAct.width}x${imgAct.height}`);

  if (imgAct.width !== width || imgAct.height !== height) {
    console.warn('Dimension mismatch! Resizing actual...');
    const resized = await sharp(actBuf).resize(width, height, { fit: 'fill' }).toBuffer();
    return compareImages(imgRef, PNG.sync.read(resized), width, height);
  }

  return compareImages(imgRef, imgAct, width, height);
}

function compareImages(img1, img2, width, height) {
  const diff = new PNG({ width, height });

  // Mask zones for dynamic elements if any (e.g. pulse dots, avatars)
  const isMasked = (x, y) => {
    // Pulse animation ping dot on Today calendar tile: x ~ 1000..1200, y ~ 1000..1200
    // Pulse animation dot on top bar: x ~ 750..820, y ~ 150..220
    if (x >= 750 && x <= 820 && y >= 150 && y <= 220) return true;
    return false;
  };

  const masked1 = new PNG({ width, height });
  const masked2 = new PNG({ width, height });
  img1.data.copy(masked1.data);
  img2.data.copy(masked2.data);

  let unmaskedPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isMasked(x, y)) {
        const idx = (width * y + x) << 2;
        masked1.data[idx] = 0;
        masked1.data[idx + 1] = 0;
        masked1.data[idx + 2] = 0;
        masked1.data[idx + 3] = 255;
        masked2.data[idx] = 0;
        masked2.data[idx + 1] = 0;
        masked2.data[idx + 2] = 0;
        masked2.data[idx + 3] = 255;
      } else {
        unmaskedPixels++;
      }
    }
  }

  const diffPixels = pixelmatch(
    masked1.data,
    masked2.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.15,
      includeAA: false
    }
  );

  const diffPercent = (diffPixels / unmaskedPixels) * 100;
  console.log(`\n========================================`);
  console.log(`PIXELMATCH RESULT (DAILY CHALLENGE):`);
  console.log(`Diff pixels: ${diffPixels.toLocaleString()} / ${unmaskedPixels.toLocaleString()}`);
  console.log(`Diff percentage: ${diffPercent.toFixed(2)}%`);
  console.log(`========================================\n`);

  // Create side-by-side comparison
  const sideBySide = new PNG({ width: width * 3, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (width * y + x) << 2;
      
      const dst1Idx = (width * 3 * y + x) << 2;
      sideBySide.data[dst1Idx] = img1.data[srcIdx];
      sideBySide.data[dst1Idx + 1] = img1.data[srcIdx + 1];
      sideBySide.data[dst1Idx + 2] = img1.data[srcIdx + 2];
      sideBySide.data[dst1Idx + 3] = img1.data[srcIdx + 3];

      const dst2Idx = (width * 3 * y + (x + width)) << 2;
      sideBySide.data[dst2Idx] = img2.data[srcIdx];
      sideBySide.data[dst2Idx + 1] = img2.data[srcIdx + 1];
      sideBySide.data[dst2Idx + 2] = img2.data[srcIdx + 2];
      sideBySide.data[dst2Idx + 3] = img2.data[srcIdx + 3];

      const dst3Idx = (width * 3 * y + (x + width * 2)) << 2;
      sideBySide.data[dst3Idx] = diff.data[srcIdx];
      sideBySide.data[dst3Idx + 1] = diff.data[srcIdx + 1];
      sideBySide.data[dst3Idx + 2] = diff.data[srcIdx + 2];
      sideBySide.data[dst3Idx + 3] = diff.data[srcIdx + 3];
    }
  }

  const sideBySidePath = path.join('design/stitch', 'daily-comparison.png');
  fs.writeFileSync(sideBySidePath, PNG.sync.write(sideBySide));
  console.log('Side-by-side comparison saved to:', sideBySidePath);

  if (diffPercent < 2.0) {
    console.log('SUCCESS! Visual diff is within 2.0% threshold.');
  } else {
    console.error('FAILED! Visual diff exceeds 2.0% threshold.');
  }
}

run().catch(console.error);
