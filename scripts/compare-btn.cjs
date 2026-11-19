const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function compareButtonHtml() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  
  const pageApp = await browser.newPage();
  await pageApp.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const pageStitch = await browser.newPage();
  await pageStitch.goto('file:///' + require('path').resolve('design/stitch/main-menu.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const htmlApp = await pageApp.evaluate(() => document.querySelector('button[style*="1d4ed8"]').outerHTML);
  const htmlStitch = await pageStitch.evaluate(() => document.querySelector('button[style*="1d4ed8"]').outerHTML);

  console.log('--- App Classic Button HTML ---');
  console.log(htmlApp);
  console.log('--- Stitch Classic Button HTML ---');
  console.log(htmlStitch);

  // Check child heights in both
  const getChildren = async (page) => {
    return page.evaluate(() => {
      const btn = document.querySelector('button[style*="1d4ed8"]');
      return Array.from(btn.querySelectorAll('*')).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText ? el.innerText.trim() : '',
        h: el.getBoundingClientRect().height,
        font: window.getComputedStyle(el).fontFamily,
        fontSize: window.getComputedStyle(el).fontSize,
        lineHeight: window.getComputedStyle(el).lineHeight
      }));
    });
  };

  const cApp = await getChildren(pageApp);
  const cStitch = await getChildren(pageStitch);

  console.log('App children:', JSON.stringify(cApp, null, 2));
  console.log('Stitch children:', JSON.stringify(cStitch, null, 2));

  await browser.close();
}

compareButtonHtml().catch(console.error);
