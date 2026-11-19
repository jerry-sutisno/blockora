const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-animations']
  });

  const p1 = await browser.newPage();
  await p1.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });
  const htmlAbs = path.resolve('design/stitch/settings.html').replace(/\\/g, '/');
  await p1.goto('file:///' + htmlAbs, { waitUntil: 'networkidle0' });

  const p2 = await browser.newPage();
  await p2.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });
  await p2.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await p2.evaluate(async () => {
    document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('active'));
    const settingsEl = document.getElementById('screen-settings');
    settingsEl.classList.add('active');
    await window.blockoraApp.settingsUI.show(settingsEl);
  });

  const inspectAudio = async (page) => {
    return page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Audio'))?.closest('.rounded-lg');
      const children = Array.from(card.children);
      return children.map(c => ({
        tag: c.tagName,
        cls: c.className.slice(0, 30),
        h: Math.round(c.getBoundingClientRect().height)
      }));
    });
  };

  console.log('Audio Direct HTML:', await inspectAudio(p1));
  console.log('Audio App Localhost:', await inspectAudio(p2));

  await browser.close();
})();
