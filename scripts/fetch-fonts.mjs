import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('public/fonts');
const CSS_OUT = path.resolve('src/styles/fonts.css');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FAMILIES = [
  'Michroma',
  'Montserrat:wght@600..800',
  'Inter:wght@400..600',
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const blocks = [];

for (const family of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Google Fonts error ${res.status} for ${family}`);
  const css = await res.text();

  const faceRe = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let match;
  while ((match = faceRe.exec(css))) {
    const subset = match[1];
    const body = match[2];
    if (subset !== 'latin') continue;

    const familyName = body.match(/font-family:\s*'([^']+)'/)?.[1];
    const weight = body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim();
    const style = body.match(/font-style:\s*([^;]+);/)?.[1]?.trim() ?? 'normal';
    const src = body.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();

    if (!familyName || !weight || !src) continue;

    // Solo se descargan fuentes de Google Fonts y se validan los metadatos antes de usarlos
    // en rutas de archivo y en el CSS generado.
    const srcUrl = new URL(src);
    if (srcUrl.protocol !== 'https:' || srcUrl.hostname !== 'fonts.gstatic.com') {
      throw new Error(`URL de fuente no permitida: ${src}`);
    }
    if (!/^[A-Za-z0-9 ]+$/.test(familyName) || !/^[0-9 ]+$/.test(weight)) {
      throw new Error(`Metadatos de fuente no válidos: ${familyName} / ${weight}`);
    }

    const slug = `${familyName.toLowerCase().replace(/\s+/g, '-')}-${weight.replace(/\s+/g, '-')}`.replace(
      /[^a-z0-9-]/g,
      ''
    );
    const file = `${slug}.woff2`;
    const localPath = path.join(OUT_DIR, file);

    if (!fs.existsSync(localPath)) {
      const fontRes = await fetch(src, { headers: { 'User-Agent': UA } });
      if (!fontRes.ok) throw new Error(`Font download failed: ${src}`);
      const buf = Buffer.from(await fontRes.arrayBuffer());
      fs.writeFileSync(localPath, buf);
      console.log(`downloaded ${file} (${(buf.length / 1024).toFixed(1)} KB)`);
    }

    blocks.push({ familyName, weight, style, file, unicodeRange });
  }
}

const seen = new Set();
const faces = blocks
  .filter((b) => {
    const key = `${b.familyName}-${b.weight}-${b.style}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .map(
    (b) => `@font-face {
  font-family: '${b.familyName}';
  font-style: ${b.style};
  font-weight: ${b.weight};
  font-display: swap;
  src: url('/fonts/${b.file}') format('woff2');
  unicode-range: ${b.unicodeRange};
}`
  )
  .join('\n\n');

fs.mkdirSync(path.dirname(CSS_OUT), { recursive: true });
fs.writeFileSync(CSS_OUT, `/* Fuentes locales autogeneradas por scripts/fetch-fonts.mjs */\n\n${faces}\n`, 'utf8');
console.log(`\nfonts.css written with ${seen.size} @font-face rules`);
