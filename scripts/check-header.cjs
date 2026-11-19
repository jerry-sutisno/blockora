const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function checkHeader() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1134, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const info = await page.evaluate(() => {
    const header = document.querySelector('header');
    const computed = window.getComputedStyle(header);
    const children = Array.from(header.children).map(c => ({
      tag: c.tagName,
      className: c.className,
      rect: { x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight },
      computedDisplay: window.getComputedStyle(c).display,
      computedPos: window.getComputedStyle(c).position
    }));
    return {
      headerClass: header.className,
      computedPosition: computed.position,
      computedHeight: computed.height,
      computedDisplay: computed.display,
      children
    };
  });
  console.log('Header info in App:', JSON.stringify(info, null, 2));
  await browser.close();
}

checkHeader().catch(console.error);
