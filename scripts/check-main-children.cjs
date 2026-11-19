const fs = require('fs');
const path = require('path');

const files = ['main-menu.html', 'daily.html', 'settings.html', 'statistics.html', 'gameplay.html', 'result.html'];

for (const f of files) {
  const content = fs.readFileSync(path.join('design/stitch', f), 'utf8');
  const mains = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  console.log(`=== ${f} ===`);
  if (mains) {
    const divs = mains[1].match(/<div[^>]*class=["'][^"']*max-w-[^"']*["'][^>]*>/gi);
    if (divs) {
      divs.forEach(d => console.log('  ', d));
    } else {
      console.log('  No max-w div in main, showing first child:');
      const firstChild = mains[1].match(/<div[^>]*class=["'][^"']*["'][^>]*>/i);
      console.log('  ', firstChild ? firstChild[0] : 'none');
    }
  }
}
