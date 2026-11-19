const fs = require('fs');
const { PNG } = require('pngjs');

const ref = PNG.sync.read(fs.readFileSync('design/stitch/result.png'));
const act = PNG.sync.read(fs.readFileSync('design/stitch/result-stitch-direct.png'));
const width = ref.width;
const height = ref.height;

// Find bands of diff
const bands = [];
for (let y = 0; y < height; y += 200) {
  let count = 0;
  for (let dy = 0; dy < 200 && y + dy < height; dy++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * (y + dy) + x) << 2;
      const d = Math.abs(ref.data[idx] - act.data[idx]) +
                Math.abs(ref.data[idx+1] - act.data[idx+1]) +
                Math.abs(ref.data[idx+2] - act.data[idx+2]);
      if (d > 50) count++;
    }
  }
  bands.push({ yRange: `${y}..${Math.min(y + 200, height)}`, diffCount: count });
}

console.table(bands);
