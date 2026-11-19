const fs = require('fs');
const path = require('path');

const files = ['main-menu.html', 'daily.html', 'settings.html', 'statistics.html', 'gameplay.html', 'result.html'];

for (const f of files) {
  const content = fs.readFileSync(path.join('design/stitch', f), 'utf8');
  // Find all main tags
  const mains = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  console.log(`=== ${f} ===`);
  if (mains) {
    const mainOpen = mains[0].match(/<main[^>]*>/i);
    console.log('Main open tag:', mainOpen ? mainOpen[0] : 'none');
  }
}
