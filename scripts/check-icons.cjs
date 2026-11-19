const fs = require('fs');
const path = require('path');

const files = ['main-menu.html', 'daily.html', 'settings.html', 'statistics.html', 'gameplay.html', 'result.html'];
const icons = new Set();

for (const f of files) {
  const content = fs.readFileSync(path.join('design/stitch', f), 'utf8');
  const matches = content.matchAll(/material-symbols-outlined[^>]*>([a-z0-9_]+)<\/span>/gi);
  for (const m of matches) {
    icons.add(m[1].trim());
  }
}

console.log('Total unique icons used:', icons.size);
console.log('List of icons:', Array.from(icons).sort());
