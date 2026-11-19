const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const files = [
  { name: 'main-menu', html: 'main-menu.html', png: 'main-menu.png' },
  { name: 'daily', html: 'daily.html', png: 'daily.png' },
  { name: 'settings', html: 'settings.html', png: 'settings.png' },
  { name: 'statistics', html: 'statistics.html', png: 'statistics.png' },
  { name: 'gameplay', html: 'gameplay.html', png: 'gameplay.png' },
  { name: 'result', html: 'result.html', png: 'result.png' }
];

async function analyze() {
  try {
    const results = [];
    for (const f of files) {
      const htmlPath = path.join('design/stitch', f.html);
      const pngPath = path.join('design/stitch', f.png);
      const content = fs.readFileSync(htmlPath, 'utf8');
      const stat = fs.statSync(htmlPath);
      const lines = content.split('\n');
      const hasHtmlClose = /<\/html>\s*$/i.test(content.trim());

      // Extract head
      const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      const headContent = headMatch ? headMatch[1] : '';

      // Extract links, scripts
      const links = [...headContent.matchAll(/<link[^>]+>/gi)].map(m => m[0]);
      const scriptTags = [...headContent.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => {
        return {
          open: m[0].substring(0, m[0].indexOf('>') + 1),
          contentPreview: m[1].trim().substring(0, 300)
        };
      });

      // Find main container class
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let containerClass = '';
      if (bodyMatch) {
        const firstDiv = bodyMatch[1].match(/<div[^>]*class=["']([^"']+)["']/i);
        if (firstDiv) containerClass = firstDiv[1];
      }

      // PNG metadata
      const imgMeta = await sharp(pngPath).metadata();

      results.push({
        file: f.html,
        png: f.png,
        sizeKB: (stat.size / 1024).toFixed(2),
        lineCount: lines.length,
        hasHtmlClose,
        imgRes: `${imgMeta.width}x${imgMeta.height}`,
        containerClass,
        links,
        scriptTags
      });
    }
    fs.writeFileSync('design/stitch/analysis.json', JSON.stringify(results, null, 2), 'utf8');
    console.log('Analysis written successfully.');
  } catch (err) {
    console.error('Error analyzing:', err);
  }
}

analyze();
