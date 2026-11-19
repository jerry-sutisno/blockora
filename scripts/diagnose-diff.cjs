const fs = require('fs');
const { PNG } = require('pngjs');

const diff = PNG.sync.read(fs.readFileSync('design/stitch/main-menu-diff.png'));
const width = diff.width;
const height = diff.height;

// Break into vertical bands of 200px
const bands = [];
for (let y = 0; y < height; y += 200) {
  let count = 0;
  for (let dy = 0; dy < 200 && y + dy < height; dy++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * (y + dy) + x) << 2;
      // pixelmatch marks diff pixels in red/tint
      if (diff.data[idx] > 200 && diff.data[idx + 1] < 100) {
        count++;
      }
    }
  }
  bands.push({ yRange: `${y}..${Math.min(y + 200, height)}`, diffPixels: count });
}

console.log('Diff breakdown by vertical region:');
console.table(bands);
