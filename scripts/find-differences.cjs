const fs = require('fs');
const { PNG } = require('pngjs');

const stitch = PNG.sync.read(fs.readFileSync('design/stitch/stitch-render-actual.png'));
const app = PNG.sync.read(fs.readFileSync('design/stitch/main-menu-actual.png'));
const width = stitch.width;
const height = stitch.height;

// Find first 20 differing points
let count = 0;
for (let y = 0; y < height && count < 20; y += 10) {
  for (let x = 0; x < width && count < 20; x += 10) {
    const idx = (width * y + x) << 2;
    const diff = Math.abs(stitch.data[idx] - app.data[idx]) +
                 Math.abs(stitch.data[idx+1] - app.data[idx+1]) +
                 Math.abs(stitch.data[idx+2] - app.data[idx+2]);
    if (diff > 50) {
      console.log(`Diff at x=${x}, y=${y}: Stitch=[${stitch.data[idx]},${stitch.data[idx+1]},${stitch.data[idx+2]}] vs App=[${app.data[idx]},${app.data[idx+1]},${app.data[idx+2]}]`);
      count++;
    }
  }
}
