const fs = require('fs');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testViewportHeights() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Test various viewport heights
  for (const vh of [800, 900, 950, 1000, 1024, 1080, 1128]) {
    await page.setViewport({ width: 1280, height: vh, deviceScaleFactor: 2 });
    await page.goto('file:///' + require('path').resolve('design/stitch/result.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    
    const celebrationTop = await page.evaluate(() => {
      const box = document.querySelector('div.w-16.h-16, div.w-20.h-20');
      const footer = document.querySelector('footer');
      return {
        boxTop: box ? box.getBoundingClientRect().top : null,
        footerBottom: footer ? footer.getBoundingClientRect().bottom : null,
        docHeight: document.documentElement.scrollHeight
      };
    });

    console.log(`Viewport height ${vh}px: boxTop=${celebrationTop.boxTop} (device: ${celebrationTop.boxTop * 2}px) | docHeight=${celebrationTop.docHeight}`);
  }

  await browser.close();
}

testViewportHeights().catch(console.error);
