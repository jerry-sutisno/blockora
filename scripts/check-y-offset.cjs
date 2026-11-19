const fs = require('fs');
const { PNG } = require('pngjs');

const stitch = PNG.sync.read(fs.readFileSync('design/stitch/stitch-render-actual.png'));
const app = PNG.sync.read(fs.readFileSync('design/stitch/main-menu-actual.png'));
const width = stitch.width;

// Check vertical position of the classic button in stitch vs app
// In stitch: find where y has blue shadow
let yStitch = -1;
for (let y = 800; y < 1400; y++) {
  const idx = (width * y + 300) << 2;
  // #1d4ed8 is [29, 78, 216]
  if (stitch.data[idx] < 40 && stitch.data[idx+1] > 60 && stitch.data[idx+1] < 90 && stitch.data[idx+2] > 200) {
    yStitch = y;
    break;
  }
}

let yApp = -1;
for (let y = 800; y < 1400; y++) {
  const idx = (width * y + 300) << 2;
  if (app.data[idx] < 40 && app.data[idx+1] > 60 && app.data[idx+1] < 90 && app.data[idx+2] > 200) {
    yApp = y;
    break;
  }
}

console.log(`Shadow top edge at x=300: Stitch y=${yStitch} vs App y=${yApp}`);
console.log(`Difference in vertical position: ${yApp - yStitch} pixels`);
