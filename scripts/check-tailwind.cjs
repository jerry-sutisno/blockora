const fs = require('fs');
const path = require('path');

const files = ['main-menu.html', 'daily.html', 'settings.html', 'statistics.html', 'gameplay.html', 'result.html'];
const configs = {};

for (const f of files) {
  const content = fs.readFileSync(path.join('design/stitch', f), 'utf8');
  const m = content.match(/tailwind\.config\s*=\s*({[\s\S]*?});/);
  if (m) {
    configs[f] = m[1];
  } else {
    // try finding without semicolon
    const m2 = content.match(/<script id=\"tailwind-config\">([\s\S]*?)<\/script>/i);
    configs[f] = m2 ? m2[1] : 'NOT FOUND';
  }
}

// Compare configs
const keys = Object.keys(configs);
console.log('Configs found for all files:', keys);
for (let i = 0; i < keys.length; i++) {
  console.log(`${keys[i]} length: ${configs[keys[i]].length}`);
}

// Print full parsed config from main-menu.html
fs.writeFileSync('design/stitch/tailwind-sample.js', configs['main-menu.html'], 'utf8');
console.log('Sample tailwind config written to design/stitch/tailwind-sample.js');
