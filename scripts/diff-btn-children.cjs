const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function diffButtonChildren() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  
  const pageApp = await browser.newPage();
  await pageApp.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const pageStitch = await browser.newPage();
  await pageStitch.goto('file:///' + require('path').resolve('design/stitch/main-menu.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const inspect = async (page) => {
    return page.evaluate(() => {
      const btn = document.querySelector('button[style*="1d4ed8"]');
      const z10 = btn.querySelector('.z-10');
      const leftCol = z10.children[0];
      const iconBox = leftCol.children[0];
      const textCol = leftCol.children[1];
      const titleRow = textCol.children[0];
      const desc = textCol.children[1];
      const metaRow = textCol.children[2];
      return {
        z10H: z10.offsetHeight,
        leftColH: leftCol.offsetHeight,
        iconBoxH: iconBox.offsetHeight,
        textColH: textCol.offsetHeight,
        titleRowH: titleRow.offsetHeight,
        descH: desc.offsetHeight,
        metaRowH: metaRow.offsetHeight,
        titleRowMargin: window.getComputedStyle(titleRow).margin,
        descMargin: window.getComputedStyle(desc).margin,
        metaRowMargin: window.getComputedStyle(metaRow).margin
      };
    });
  };

  console.log('App Button 0 inside:', await inspect(pageApp));
  console.log('Stitch Button 0 inside:', await inspect(pageStitch));

  await browser.close();
}

diffButtonChildren().catch(console.error);
