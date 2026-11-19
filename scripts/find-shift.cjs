const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function findShift() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  
  const pageApp = await browser.newPage();
  await pageApp.setViewport({ width: 1280, height: 1134, deviceScaleFactor: 2 });
  await pageApp.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const pageStitch = await browser.newPage();
  await pageStitch.setViewport({ width: 1280, height: 1134, deviceScaleFactor: 2 });
  await pageStitch.goto('file:///' + require('path').resolve('design/stitch/main-menu.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const getTops = async (page) => {
    return page.evaluate(() => {
      const els = [
        ['header', 'header'],
        ['main', 'main'],
        ['hero card', '.bg-surface-container-lowest'],
        ['h1', 'h1'],
        ['mode deck', '#modes-section, div.flex.flex-col.gap-space-sm'],
        ['classic btn', 'button[style*="1d4ed8"]']
      ];
      const res = {};
      els.forEach(([label, sel]) => {
        const el = document.querySelector(sel);
        res[label] = el ? { top: el.getBoundingClientRect().top, h: el.getBoundingClientRect().height } : null;
      });
      return res;
    });
  };

  const appTops = await getTops(pageApp);
  const stitchTops = await getTops(pageStitch);

  console.log('App tops vs Stitch tops:');
  Object.keys(appTops).forEach(k => {
    const a = appTops[k];
    const s = stitchTops[k];
    console.log(`${k}: App top=${a?.top} h=${a?.h} | Stitch top=${s?.top} h=${s?.h} | diffTop=${a?.top - s?.top} diffH=${a?.h - s?.h}`);
  });

  await browser.close();
}

findShift().catch(console.error);
