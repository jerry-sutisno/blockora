const fs = require('fs');
['daily.html', 'settings.html', 'statistics.html', 'gameplay.html', 'result.html'].forEach(f => {
  const content = fs.readFileSync('design/stitch/' + f, 'utf8');
  const matches = [...content.matchAll(/<img[^>]+src=['"]([^'"]+)['"]/g)].map(m => m[1]);
  console.log(f, matches);
});
