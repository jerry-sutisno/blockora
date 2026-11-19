const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-animations']
  });

  // 1. Direct HTML
  const p1 = await browser.newPage();
  await p1.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });
  const htmlAbs = path.resolve('design/stitch/settings.html').replace(/\\/g, '/');
  await p1.goto('file:///' + htmlAbs, { waitUntil: 'networkidle0' });
  const heights1 = await p1.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('main div.rounded-lg'));
    return {
      docHeight: document.documentElement.scrollHeight,
      cards: cards.map(c => ({
        title: c.querySelector('h2')?.textContent,
        height: Math.round(c.getBoundingClientRect().height)
      }))
    };
  });
  console.log('Direct HTML cards:', heights1);

  // 2. App Localhost
  const p2 = await browser.newPage();
  await p2.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });
  await p2.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  const heights2 = await p2.evaluate(async () => {
    document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('active'));
    const settingsEl = document.getElementById('screen-settings');
    settingsEl.classList.add('active');
    await window.blockoraApp.settingsUI.show(settingsEl);

    const cards = Array.from(settingsEl.querySelectorAll('main div.rounded-lg'));
    return {
      docHeight: document.documentElement.scrollHeight,
      cards: cards.map(c => ({
        title: c.querySelector('h2')?.textContent,
        height: Math.round(c.getBoundingClientRect().height)
      }))
    };
  });
  console.log('App Localhost cards:', heights2);

  await browser.close();
})();
