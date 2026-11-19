const fs = require('fs');
const { PNG } = require('pngjs');

const ref = PNG.sync.read(fs.readFileSync('design/stitch/result.png'));
const act = PNG.sync.read(fs.readFileSync('design/stitch/result-stitch-direct.png'));
const width = ref.width;

// Find footer top edge in ref and act: look for the border or text at bottom
// Footer starts with: <footer class="w-full bg-surface-container-low/60 mt-space-xl py-space-lg">
for (let y = 1800; y < 2256; y++) {
  const idx = (width * y + 300) << 2;
  // footer bg is surface-container-low/60
}

// Let's inspect bottom 200px of ref
console.log('Ref pixel at (300, 2200):', [ref.data[(width*2200+300)<<2], ref.data[((width*2200+300)<<2)+1], ref.data[((width*2200+300)<<2)+2]]);
console.log('Act pixel at (300, 2200):', [act.data[(width*2200+300)<<2], act.data[((width*2200+300)<<2)+1], act.data[((width*2200+300)<<2)+2]]);
