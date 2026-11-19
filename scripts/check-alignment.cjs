const fs = require('fs');
const { PNG } = require('pngjs');

const ref = PNG.sync.read(fs.readFileSync('design/stitch/main-menu.png'));
const act = PNG.sync.read(fs.readFileSync('design/stitch/main-menu-actual.png'));
const width = ref.width;

// Inspect row 1000 across x
console.log('Sample comparison at row y = 1000:');
for (let x = 200; x < 2400; x += 200) {
  const idx = (width * 1000 + x) << 2;
  const rRef = ref.data[idx], gRef = ref.data[idx+1], bRef = ref.data[idx+2];
  const rAct = act.data[idx], gAct = act.data[idx+1], bAct = act.data[idx+2];
  console.log(`x=${x}: Ref=[${rRef},${gRef},${bRef}] vs Act=[${rAct},${gAct},${bAct}]`);
}

// Check vertical alignment: where is the classic button top edge?
// Search along x=400 from y=600 to 1200 for color transition to primary blue (around [37, 99, 235] or [0, 74, 198])
for (let y = 600; y < 1200; y += 5) {
  const idx = (width * y + 400) << 2;
  const b = ref.data[idx + 2];
  if (b > 200 && ref.data[idx] < 50) {
    console.log(`Ref Classic Button top edge around y=${y}`);
    break;
  }
}

for (let y = 600; y < 1200; y += 5) {
  const idx = (width * y + 400) << 2;
  const b = act.data[idx + 2];
  if (b > 200 && act.data[idx] < 50) {
    console.log(`Act Classic Button top edge around y=${y}`);
    break;
  }
}
