const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function toObj(r) {
  if (!r) return null;
  return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top };
}

async function inspectLayout() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  
  // Inspect app
  const pageApp = await browser.newPage();
  await pageApp.setViewport({ width: 1280, height: 1134, deviceScaleFactor: 2 });
  await pageApp.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const appBoxes = await pageApp.evaluate(() => {
    const toObj = r => r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } : null;
    return {
      header: toObj(document.querySelector('header')?.getBoundingClientRect()),
      main: toObj(document.querySelector('main')?.getBoundingClientRect()),
      hero: toObj(document.querySelector('h1')?.getBoundingClientRect()),
      classicBtn: toObj(document.querySelector('[data-action="play-classic"]')?.getBoundingClientRect()),
      screenMenu: toObj(document.getElementById('screen-menu')?.getBoundingClientRect()),
      app: toObj(document.getElementById('app')?.getBoundingClientRect())
    };
  });
  console.log('App boxes:', JSON.stringify(appBoxes, null, 2));

  // Inspect stitch original
  const pageStitch = await browser.newPage();
  await pageStitch.setViewport({ width: 1280, height: 1134, deviceScaleFactor: 2 });
  await pageStitch.goto('file:///' + require('path').resolve('design/stitch/main-menu.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const stitchBoxes = await pageStitch.evaluate(() => {
    const toObj = r => r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } : null;
    return {
      header: toObj(document.querySelector('header')?.getBoundingClientRect()),
      main: toObj(document.querySelector('main')?.getBoundingClientRect()),
      hero: toObj(document.querySelector('h1')?.getBoundingClientRect()),
      classicBtn: toObj(document.querySelector('button[onclick*="classic"]')?.getBoundingClientRect())
    };
  });
  console.log('Stitch boxes:', JSON.stringify(stitchBoxes, null, 2));

  await browser.close();
}

inspectLayout().catch(console.error);
