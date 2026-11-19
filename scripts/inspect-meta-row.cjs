const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function inspectMetaRow() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  
  const pageApp = await browser.newPage();
  await pageApp.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const pageStitch = await browser.newPage();
  await pageStitch.goto('file:///' + require('path').resolve('design/stitch/main-menu.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const check = async (page) => {
    return page.evaluate(() => {
      const btn = document.querySelector('button[style*="1d4ed8"]');
      const metaRow = btn.querySelector('.mt-space-xs');
      return Array.from(metaRow.children).map(c => ({
        tag: c.tagName,
        className: c.className,
        offsetHeight: c.offsetHeight,
        fontSize: window.getComputedStyle(c).fontSize,
        lineHeight: window.getComputedStyle(c).lineHeight,
        padding: window.getComputedStyle(c).padding,
        display: window.getComputedStyle(c).display,
        children: Array.from(c.children).map(gc => ({
          tag: gc.tagName,
          className: gc.className,
          offsetHeight: gc.offsetHeight,
          fontSize: window.getComputedStyle(gc).fontSize,
          lineHeight: window.getComputedStyle(gc).lineHeight
        }))
      }));
    });
  };

  console.log('App metaRow children:', JSON.stringify(await check(pageApp), null, 2));
  console.log('Stitch metaRow children:', JSON.stringify(await check(pageStitch), null, 2));

  await browser.close();
}

inspectMetaRow().catch(console.error);
