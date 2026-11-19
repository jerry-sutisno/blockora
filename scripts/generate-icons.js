import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const iconSvgPath = path.join(rootDir, 'public', 'assets', 'icons', 'icon.svg');
const maskableSvgPath = path.join(rootDir, 'public', 'assets', 'icons', 'icon-maskable.svg');
const publicDir = path.join(rootDir, 'public');

async function generate() {
  console.log('Generating PWA icons with sharp...');

  const iconSvgBuffer = fs.readFileSync(iconSvgPath);
  const maskableSvgBuffer = fs.readFileSync(maskableSvgPath);

  // 1. icon-192.png
  await sharp(iconSvgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Created public/icon-192.png');

  // 2. icon-512.png
  await sharp(iconSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Created public/icon-512.png');

  // 3. icon-maskable-512.png
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('✓ Created public/icon-maskable-512.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(iconSvgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // 5. favicon-32x32.png
  await sharp(iconSvgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Created public/favicon-32x32.png');

  // Salin favicon ke root
  await sharp(iconSvgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Created public/favicon.png');

  console.log('All PWA icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
