const fs = require('fs');
const path = require('path');

const files = ['main-menu.html', 'daily.html', 'settings.html', 'statistics.html', 'gameplay.html', 'result.html'];

for (const f of files) {
  const content = fs.readFileSync(path.join('design/stitch', f), 'utf8');
  // find body
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) continue;
  const bodyHtml = bodyMatch[1];
  
  // Look for main, article, or wrappers
  const mainMatch = bodyHtml.match(/<(main|div)[^>]*class=["']([^"']*(?:max-w|w-|min-h|container)[^"']*)["'][^>]*>/gi);
  console.log(`=== ${f} ===`);
  if (mainMatch) {
    mainMatch.slice(0, 5).forEach(m => console.log('  ', m));
  }
}
