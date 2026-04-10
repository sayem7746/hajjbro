/**
 * Rasterizes SVG marks to favicon, PWA, iOS AppIcon, and Android mipmaps.
 * Run from ionic/: npm run icons
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const svgFull = readFileSync(join(root, 'src/assets/logo-icon.svg'));
const svgFg = readFileSync(join(root, 'src/assets/logo-icon-foreground.svg'));

async function writePng(svgBuffer, size, outPath, { fit = 'contain', background } = {}) {
  const bg = background ?? { r: 0, g: 0, b: 0, alpha: 0 };
  await sharp(svgBuffer, { density: 320 })
    .resize(size, size, { fit, position: 'center', background: bg })
    .png()
    .toFile(outPath);
}

async function main() {
  const webIconDir = join(root, 'public', 'assets', 'icon');
  mkdirSync(webIconDir, { recursive: true });

  // Web / PWA
  await writePng(svgFull, 48, join(root, 'public', 'favicon.png'), {
    fit: 'cover',
    background: { r: 27, g: 94, b: 32, alpha: 1 },
  });
  await writePng(svgFull, 64, join(webIconDir, 'favicon.png'), {
    fit: 'cover',
    background: { r: 27, g: 94, b: 32, alpha: 1 },
  });
  await writePng(svgFull, 512, join(webIconDir, 'icon.png'), {
    fit: 'cover',
    background: { r: 27, g: 94, b: 32, alpha: 1 },
  });

  // iOS (single 1024 marketing icon — opaque)
  const iosIcon = join(
    root,
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
  );
  await writePng(svgFull, 1024, iosIcon, {
    fit: 'cover',
    background: { r: 27, g: 94, b: 32, alpha: 1 },
  });

  // Android legacy / round launcher
  const androidSizes = [
    ['mipmap-mdpi', 48],
    ['mipmap-hdpi', 72],
    ['mipmap-xhdpi', 96],
    ['mipmap-xxhdpi', 144],
    ['mipmap-xxxhdpi', 192],
  ];
  const fgSizes = [
    ['mipmap-mdpi', 108],
    ['mipmap-hdpi', 162],
    ['mipmap-xhdpi', 216],
    ['mipmap-xxhdpi', 324],
    ['mipmap-xxxhdpi', 432],
  ];
  const androidRes = join(root, 'android/app/src/main/res');

  for (const [folder, size] of androidSizes) {
    const base = join(androidRes, folder);
    await writePng(svgFull, size, join(base, 'ic_launcher.png'), {
      fit: 'cover',
      background: { r: 27, g: 94, b: 32, alpha: 1 },
    });
    await writePng(svgFull, size, join(base, 'ic_launcher_round.png'), {
      fit: 'cover',
      background: { r: 27, g: 94, b: 32, alpha: 1 },
    });
  }

  for (const [folder, size] of fgSizes) {
    const base = join(androidRes, folder);
    await writePng(svgFg, size, join(base, 'ic_launcher_foreground.png'), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  console.log('App icons generated (web, iOS, Android).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
