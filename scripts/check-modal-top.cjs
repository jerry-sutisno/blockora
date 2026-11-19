const fs = require('fs');
const { PNG } = require('pngjs');

const ref = PNG.sync.read(fs.readFileSync('design/stitch/result.png'));
const act = PNG.sync.read(fs.readFileSync('design/stitch/result-stitch-direct.png'));
const width = ref.width;
const height = ref.height;

// Find top edge of modal card: in both, center x is 1280.
// Around x=1280, from y=200 down to 800, look for the Polyomino icon blue box [0, 74, 198] or similar
let yRef = -1, yAct = -1;
for (let y = 200; y < 800; y++) {
  const idx = (width * y + 1280) << 2;
  // Look for the blue celebration box
  if (ref.data[idx] < 50 && ref.data[idx+1] > 60 && ref.data[idx+2] > 180) {
    if (yRef === -1) yRef = y;
  }
  if (act.data[idx] < 50 && act.data[idx+1] > 60 && act.data[idx+2] > 180) {
    if (yAct === -1) yAct = y;
  }
}

console.log(`Celebration icon top edge at x=1280: Ref y=${yRef} vs Act y=${yAct}`);
console.log(`Vertical difference: ${yAct - yRef} pixels (${(yAct - yRef)/2} CSS px)`);
