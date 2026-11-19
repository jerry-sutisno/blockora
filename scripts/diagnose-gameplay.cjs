const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  const consoleLogs = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
    await wait(600);

    // Buka Gameplay Screen
    await page.evaluate(() => {
      window.blockoraApp?.startFreshGame('classic');
    });
    await wait(1000);

    const diagnosis = await page.evaluate(() => {
      // a. Error console ditangkap di luar

      // b. Canvas Phaser
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const canvasInfo = canvases.map(c => ({
        parentTag: c.parentElement?.tagName,
        parentId: c.parentElement?.id,
        parentClass: c.parentElement?.className,
        widthAttr: c.getAttribute('width'),
        heightAttr: c.getAttribute('height'),
        clientWidth: c.clientWidth,
        clientHeight: c.clientHeight,
        styleWidth: c.style.width,
        styleHeight: c.style.height,
        styleDisplay: c.style.display,
        boundingClientRect: c.getBoundingClientRect(),
        pointerEvents: window.getComputedStyle(c).pointerEvents,
        touchAction: window.getComputedStyle(c).touchAction,
        zIndex: window.getComputedStyle(c).zIndex
      }));

      // c. Parent kartu papan (#blockora-board)
      const boardMount = document.getElementById('blockora-board');
      const boardInfo = boardMount ? {
        id: boardMount.id,
        tagName: boardMount.tagName,
        clientWidth: boardMount.clientWidth,
        clientHeight: boardMount.clientHeight,
        scrollWidth: boardMount.scrollWidth,
        scrollHeight: boardMount.scrollHeight,
        boundingClientRect: boardMount.getBoundingClientRect(),
        computedWidth: window.getComputedStyle(boardMount).width,
        computedHeight: window.getComputedStyle(boardMount).height,
        computedDisplay: window.getComputedStyle(boardMount).display,
        pointerEvents: window.getComputedStyle(boardMount).pointerEvents,
        zIndex: window.getComputedStyle(boardMount).zIndex,
        touchAction: window.getComputedStyle(boardMount).touchAction,
        innerHTML: boardMount.innerHTML.slice(0, 300)
      } : null;

      // d. Element at point di tengah papan
      let elementAtCenter = null;
      if (boardMount) {
        const rect = boardMount.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;
        const el = document.elementFromPoint(midX, midY);
        elementAtCenter = el ? {
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          innerHTMLPreview: el.innerHTML.slice(0, 100)
        } : null;
      }

      // e. Tray / Active Shape Deck
      const deckSlotsContainer = document.getElementById('gameplay-deck-slots');
      const deckInfo = {
        exists: !!deckSlotsContainer,
        innerHTML: deckSlotsContainer ? deckSlotsContainer.innerHTML.slice(0, 500) : null,
        childrenCount: deckSlotsContainer ? deckSlotsContainer.children.length : 0,
        textContents: deckSlotsContainer ? deckSlotsContainer.innerText : null
      };

      // Cek apakah ada tray di Phaser
      const gameScene = window.blockoraApp?.getGameScene();
      const phaserTrayCount = gameScene?.traySlots?.length || 0;
      const phaserBlockContainers = gameScene?.trayBlockContainers?.length || 0;

      return {
        canvasInfo,
        boardInfo,
        elementAtCenter,
        deckInfo,
        phaserTrayCount,
        phaserBlockContainers
      };
    });

    // f. Uji Modal saat tombol kembali diklik
    console.log('Menguji tombol kembali di header gameplay...');
    await page.evaluate(() => {
      const backBtn = document.querySelector('#btn-gameplay-back');
      if (backBtn) backBtn.click();
    });
    await wait(600);

    const modalDiagnosis = await page.evaluate(() => {
      const modalContainer = document.getElementById('modal-container');
      const dialog = modalContainer?.querySelector('.modal-card, .modal-dialog, div[role="dialog"]') || modalContainer?.firstElementChild;
      const computed = modalContainer ? window.getComputedStyle(modalContainer) : null;
      const dialogComputed = dialog ? window.getComputedStyle(dialog) : null;

      return {
        modalExists: !!modalContainer,
        modalActive: modalContainer?.classList.contains('active'),
        modalClasses: modalContainer?.className,
        modalInnerHTML: modalContainer?.innerHTML.slice(0, 500),
        modalDisplay: computed?.display,
        modalVisibility: computed?.visibility,
        modalOpacity: computed?.opacity,
        modalZIndex: computed?.zIndex,
        modalPointerEvents: computed?.pointerEvents,
        dialogDisplay: dialogComputed?.display,
        dialogVisibility: dialogComputed?.visibility,
        dialogOpacity: dialogComputed?.opacity,
        dialogZIndex: dialogComputed?.zIndex,
        dialogPointerEvents: dialogComputed?.pointerEvents,
        dialogRect: dialog ? dialog.getBoundingClientRect() : null
      };
    });

    console.log('\n=== HASIL DIAGNOSA SISTEM ===\n');
    console.log('a. Error di Console:');
    if (consoleErrors.length === 0) {
      console.log('   (Tidak ada error console yang tertangkap)');
    } else {
      consoleErrors.forEach((e, idx) => console.log(`   [${idx+1}] ${e}`));
    }
    console.log('\nSemua log console:');
    consoleLogs.forEach(l => console.log(`   [${l.type}] ${l.text}`));

    console.log('\nb. Elemen <canvas> Phaser:');
    console.log(JSON.stringify(diagnosis.canvasInfo, null, 2));

    console.log('\nc. Parent Kartu Papan (#blockora-board):');
    console.log(JSON.stringify(diagnosis.boardInfo, null, 2));

    console.log('\nd. Elemen yang Menangkap Pointer Event di Tengah Papan:');
    console.log(JSON.stringify(diagnosis.elementAtCenter, null, 2));

    console.log('\ne. Tray Balok (Deck):');
    console.log(JSON.stringify({
      htmlDeck: diagnosis.deckInfo,
      phaserTraySlotCount: diagnosis.phaserTrayCount,
      phaserTrayBlockContainerCount: diagnosis.phaserBlockContainers
    }, null, 2));

    console.log('\nf. Modal Saat Tombol Kembali Diklik:');
    console.log(JSON.stringify(modalDiagnosis, null, 2));

  } catch (err) {
    console.error('Error saat menjalankan diagnosa:', err);
  } finally {
    await browser.close();
  }
})();
