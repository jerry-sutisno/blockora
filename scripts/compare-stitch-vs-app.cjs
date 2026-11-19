const fs = require('fs');
const { PNG } = require('pngjs');
let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;

const imgStitch = PNG.sync.read(fs.readFileSync('design/stitch/stitch-render-actual.png'));
const imgApp = PNG.sync.read(fs.readFileSync('design/stitch/main-menu-actual.png'));
const width = imgStitch.width;
const height = imgStitch.height;

const diff = new PNG({ width, height });
const diffCount = pixelmatch(imgStitch.data, imgApp.data, diff.data, width, height, { threshold: 0.1 });

console.log(`Diff between Stitch render and App render: ${diffCount} (${((diffCount / (width * height)) * 100).toFixed(2)}%)`);
fs.writeFileSync('design/stitch/stitch-vs-app-diff.png', PNG.sync.write(diff));
