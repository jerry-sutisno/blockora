const fs = require('fs');
const { PNG } = require('pngjs');

const act = PNG.sync.read(fs.readFileSync('design/stitch/main-menu-actual.png'));
const width = act.width;
const height = act.height;

for (let y = 0; y < height; y += 10) {
  for (let x = 100; x < width; x += 50) {
    const idx = (width * y + x) << 2;
    const r = act.data[idx];
    const g = act.data[idx + 1];
    const b = act.data[idx + 2];
    if (b > 220 && r < 50 && g > 80 && g < 120) {
      console.log(`Act blue found at x=${x}, y=${y}: [${r},${g},${b}]`);
      process.exit(0);
    }
  }
}
console.log('No blue button found in act!');
