const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function checkConsoleAndFonts() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  const failedRequests = [];
  
  page.on('console', msg => consoleMessages.push(msg.text()));
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), failure: req.failure().errorText }));

  await page.setViewport({ width: 1280, height: 1134, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  const fontsInfo = await page.evaluate(async () => {
    await document.fonts.ready;
    const loaded = [];
    for (const f of document.fonts) {
      loaded.push({ family: f.family, status: f.status, weight: f.weight });
    }
    return loaded;
  });

  console.log('Console messages:', consoleMessages);
  console.log('Failed requests:', failedRequests);
  console.log('Loaded fonts in document:', fontsInfo);

  await browser.close();
}

checkConsoleAndFonts().catch(console.error);
