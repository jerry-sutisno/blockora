const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  console.log('--- NAVIGASI KE GAME ---');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // 1. Masuk ke mode Classic via window.blockoraApp
  await page.evaluate(() => {
    window.blockoraApp?.startFreshGame('classic');
  });

  // Tunggu transisi ke screen gameplay
  await page.waitForSelector('#blockora-board canvas', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 800));

  console.log('\n--- DIAGNOSA GAMEPLAY LIVE ---');

  const boardInfo = await page.evaluate(() => {
    const board = document.getElementById('blockora-board');
    if (!board) return { exists: false };
    const rect = board.getBoundingClientRect();
    const canvas = board.querySelector('canvas');
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
    const childrenCount = board.children.length;
    const childTags = Array.from(board.children).map(c => c.tagName + (c.id ? '#' + c.id : '') + (c.className ? '.' + c.className.split(' ')[0] : ''));

    // Check center element
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topEl = document.elementFromPoint(centerX, centerY);

    return {
      exists: true,
      boardRect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
      hasCanvas: !!canvas,
      canvasRect: canvasRect ? { width: canvasRect.width, height: canvasRect.height } : null,
      childrenCount,
      childTags,
      topElTag: topEl ? topEl.tagName + (topEl.id ? '#' + topEl.id : '') + '.' + topEl.className.split(' ')[0] : null
    };
  });
  console.log('Board Info:', JSON.stringify(boardInfo, null, 2));

  const hudInfo = await page.evaluate(() => {
    const score = document.getElementById('main-score')?.textContent;
    const mode = document.getElementById('gameplay-mode-label')?.textContent;
    const room = document.getElementById('gameplay-room-label')?.textContent;
    const timer = document.getElementById('countdown-timer')?.textContent;
    const emptyCells = document.getElementById('empty-cells-count')?.textContent;
    const missionTitle = document.getElementById('mission-title')?.textContent;
    const zenTitle = document.getElementById('zen-ambience-title')?.textContent;
    const rankTitle = document.querySelector('#local-ranking-list')?.textContent?.trim().replace(/\s+/g, ' ');

    const deckSlots = Array.from(document.querySelectorAll('#gameplay-deck-slots [data-slot]')).map(el => {
      const slotIdx = el.getAttribute('data-slot');
      const text = el.textContent.trim();
      return { slotIdx, text };
    });

    return { score, mode, room, timer, emptyCells, missionTitle, zenTitle, rankTitle, deckSlots };
  });
  console.log('HUD & Panel Info:', JSON.stringify(hudInfo, null, 2));

  // Screenshot gameplay awal
  const shotPath = path.join(__dirname, 'gameplay-after.png');
  await page.screenshot({ path: shotPath });
  console.log(`Saved screenshot to ${shotPath}`);

  // 2. Test Drag and Drop Balok
  console.log('\n--- UJI DRAG & DROP BALOK DARI TRAY KE BOARD ---');
  const dragResult = await page.evaluate(async () => {
    const slot0 = document.querySelector('#gameplay-deck-slots [data-slot="0"]');
    const board = document.getElementById('blockora-board');
    if (!slot0 || !board) return { success: false, reason: 'slot or board missing' };

    const slotRect = slot0.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();

    const startX = slotRect.left + slotRect.width / 2;
    const startY = slotRect.top + slotRect.height / 2;

    // Drop di sel (3, 3) di tengah papan agar bentuk multi-sel pas di dalam batas papan
    const targetX = boardRect.left + (boardRect.width / 10) * 3.5;
    const targetY = boardRect.top + (boardRect.height / 10) * 3.5;

    // Dispatch pointerdown
    slot0.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: startX,
      clientY: startY,
      pointerId: 1,
      pointerType: 'mouse'
    }));

    // Cek ghost
    const ghostBeforeMove = !!document.getElementById('blockora-floating-drag');

    // Dispatch pointermove
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: targetX,
      clientY: targetY,
      pointerId: 1,
      pointerType: 'mouse'
    }));

    const ghostAfterMove = !!document.getElementById('blockora-floating-drag');

    // Dispatch pointerup (drop)
    window.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      clientX: targetX,
      clientY: targetY,
      pointerId: 1,
      pointerType: 'mouse'
    }));

    await new Promise(r => setTimeout(r, 400));

    const ghostAfterDrop = !!document.getElementById('blockora-floating-drag');
    const newScore = document.getElementById('main-score')?.textContent;
    const newEmpty = document.getElementById('empty-cells-count')?.textContent;

    return {
      ghostBeforeMove,
      ghostAfterMove,
      ghostAfterDrop,
      newScore,
      newEmpty
    };
  });
  console.log('Drag & Drop Result:', JSON.stringify(dragResult, null, 2));

  // Screenshot setelah drop
  const shotPlaced = path.join(__dirname, 'gameplay-placed.png');
  await page.screenshot({ path: shotPlaced });
  console.log(`Saved screenshot to ${shotPlaced}`);

  // 3. Test Tombol Kembali / Pause Dialog
  console.log('\n--- UJI TOMBOL KEMBALI / PAUSE MODAL ---');
  await page.evaluate(() => {
    const backBtn = document.getElementById('btn-gameplay-back');
    if (backBtn) backBtn.click();
  });

  await new Promise(r => setTimeout(r, 300));

  const modalInfo = await page.evaluate(() => {
    const modalContainer = document.getElementById('modal-container');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const title = document.getElementById('modal-pause-title')?.textContent;
    const resumeBtn = document.getElementById('btn-pause-resume')?.textContent?.trim();
    const restartBtn = document.getElementById('btn-pause-restart')?.textContent?.trim();
    const menuBtn = document.getElementById('btn-pause-menu')?.textContent?.trim();

    const rect = modalBackdrop ? modalBackdrop.getBoundingClientRect() : null;
    const card = modalBackdrop?.firstElementChild;
    const cardRect = card ? card.getBoundingClientRect() : null;

    return {
      isActive: modalContainer?.classList.contains('active'),
      display: modalContainer ? window.getComputedStyle(modalContainer).display : null,
      zIndex: modalContainer ? window.getComputedStyle(modalContainer).zIndex : null,
      title,
      resumeBtn,
      restartBtn,
      menuBtn,
      cardRect: cardRect ? { width: cardRect.width, height: cardRect.height, top: cardRect.top, left: cardRect.left } : null
    };
  });
  console.log('Modal Info:', JSON.stringify(modalInfo, null, 2));

  // Screenshot modal pause
  const shotPause = path.join(__dirname, 'gameplay-pause.png');
  await page.screenshot({ path: shotPause });
  console.log(`Saved screenshot to ${shotPause}`);

  // Test klik resume button
  console.log('\n--- UJI RESUME DARI MODAL ---');
  await page.evaluate(() => {
    const resumeBtn = document.getElementById('btn-pause-resume');
    if (resumeBtn) resumeBtn.click();
  });

  await new Promise(r => setTimeout(r, 300));
  const modalAfterResume = await page.evaluate(() => {
    const modalContainer = document.getElementById('modal-container');
    return {
      isActive: modalContainer?.classList.contains('active'),
      display: modalContainer ? window.getComputedStyle(modalContainer).display : null
    };
  });
  console.log('Modal After Resume:', JSON.stringify(modalAfterResume, null, 2));

  console.log('\n--- CONSOLE ERRORS ---');
  console.log(consoleErrors.length > 0 ? consoleErrors : '0 Console Errors! Bersih.');

  await browser.close();
})();
