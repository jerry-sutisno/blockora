const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function checkThreeButtons() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  
  const pageApp = await browser.newPage();
  await pageApp.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const pageStitch = await browser.newPage();
  await pageStitch.goto('file:///' + require('path').resolve('design/stitch/main-menu.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const getBtns = async (page) => {
    return page.evaluate(() => {
      const deck = document.querySelector('#modes-section, div.flex.flex-col.gap-space-sm');
      const btns = deck.querySelectorAll('button');
      return Array.from(btns).map((b, i) => ({
        index: i,
        h: b.getBoundingClientRect().height,
        padding: window.getComputedStyle(b).padding,
        margin: window.getComputedStyle(b).margin,
        gap: window.getComputedStyle(deck).gap
      }));
    });
  };

  console.log('App buttons:', await getBtns(pageApp));
  console.log('Stitch buttons:', await getBtns(pageStitch));

  await browser.close();
}

checkThreeButtons().catch(console.error);
