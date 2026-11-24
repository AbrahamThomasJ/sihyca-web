import { lstat, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const imagesDir = path.resolve('public/images');
const rasterExtensions = new Set(['.png', '.jpg', '.jpeg']);
const quality = 82;

let converted = 0;

const files = await readdir(imagesDir).catch(() => {
  console.error(`No existe la carpeta ${imagesDir}`);
  process.exit(1);
});

for (const file of files) {
  const extension = path.extname(file).toLowerCase();

  if (!rasterExtensions.has(extension)) continue;

  const input = path.resolve(imagesDir, file);

  // Solo ficheros regulares dentro de public/images (sin symlinks ni rutas fuera de la carpeta).
  if (path.dirname(input) !== imagesDir) continue;
  const entry = await lstat(input);
  if (entry.isSymbolicLink() || !entry.isFile()) {
    console.warn(`skip  ${file} (no es un fichero regular)`);
    continue;
  }
  const output = path.join(imagesDir, `${path.basename(file, extension)}.webp`);

  const [inputStats, outputStats] = await Promise.all([
    stat(input),
    stat(output).catch(() => null),
  ]);

  if (outputStats && outputStats.mtimeMs >= inputStats.mtimeMs) {
    console.log(`skip  ${file}`);
    continue;
  }

  await sharp(input).webp({ quality }).toFile(output);

  const outputStatsAfter = await stat(output);
  const saved = Math.round(100 - (outputStatsAfter.size / inputStats.size) * 100);

  console.log(
    `ok    ${file} -> ${path.basename(output)} (${saved}% más liviano)`
  );
  converted += 1;
}

console.log(
  converted > 0
    ? `\nListo: ${converted} imagen(es) convertida(s) a WebP.`
    : '\nNo hay imágenes PNG/JPG nuevas por convertir. Los SVG no se procesan.'
);
