const fs = require('fs');
const { PNG } = require('pngjs');

const diff = PNG.sync.read(fs.readFileSync('design/stitch/main-menu-diff.png'));
const width = diff.width;
const height = diff.height;

// Find bounding boxes of diff clusters
const diffBoxes = [];
const step = 40;
for (let y = 0; y < height; y += step) {
  for (let x = 0; x < width; x += step) {
    let diffCount = 0;
    for (let dy = 0; dy < step && y + dy < height; dy++) {
      for (let dx = 0; dx < step && x + dx < width; dx++) {
        const idx = (width * (y + dy) + (x + dx)) << 2;
        if (diff.data[idx] > 200 && diff.data[idx + 1] < 100) {
          diffCount++;
        }
      }
    }
    if (diffCount > 10) {
      diffBoxes.push({ x, y, count: diffCount });
    }
  }
}

console.log('Top diff clusters (sample 25):');
diffBoxes.sort((a, b) => b.count - a.count).slice(0, 25).forEach(b => {
  console.log(`Cluster at x=${b.x}..${b.x+step}, y=${b.y}..${b.y+step}: ${b.count} diff pixels`);
});
