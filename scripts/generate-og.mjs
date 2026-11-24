import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const width = 1200;
const height = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#04101f"/>
      <stop offset="58%" stop-color="#0a2342"/>
      <stop offset="100%" stop-color="#0f57a7"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7fc4f5"/>
      <stop offset="100%" stop-color="#1565c0"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <g fill="none" opacity="0.28">
    <circle cx="1010" cy="150" r="220" stroke="#7fc4f5" stroke-width="1.5"/>
    <circle cx="1010" cy="150" r="160" stroke="#7fc4f5" stroke-width="1.5"/>
    <circle cx="1010" cy="150" r="100" stroke="#7fc4f5" stroke-width="2"/>
    <circle cx="1010" cy="150" r="46" stroke="#ffffff" stroke-width="2"/>
  </g>

  <g fill="#7fc4f5" opacity="0.9">
    <circle cx="1010" cy="0" r="5"/>
    <circle cx="1150" cy="40" r="5"/>
    <circle cx="1190" cy="150" r="5"/>
    <circle cx="1150" cy="260" r="5"/>
    <circle cx="1010" cy="300" r="5"/>
    <circle cx="870" cy="260" r="5"/>
    <circle cx="830" cy="150" r="5"/>
    <circle cx="870" cy="40" r="5"/>
  </g>

  <g transform="translate(80 76)">
    <g fill="none" stroke="#ffffff" stroke-width="3">
      <circle cx="30" cy="30" r="27"/>
      <circle cx="30" cy="30" r="12"/>
    </g>
    <g fill="#7fc4f5">
      <circle cx="30" cy="3" r="3.2"/>
      <circle cx="49.1" cy="10.9" r="3.2"/>
      <circle cx="57" cy="30" r="3.2"/>
      <circle cx="49.1" cy="49.1" r="3.2"/>
      <circle cx="30" cy="57" r="3.2"/>
      <circle cx="10.9" cy="49.1" r="3.2"/>
      <circle cx="3" cy="30" r="3.2"/>
      <circle cx="10.9" cy="10.9" r="3.2"/>
    </g>
    <text x="80" y="30" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="6">SIHYCA</text>
    <text x="80" y="52" fill="#b6ddf9" font-family="Segoe UI, Arial, sans-serif" font-size="12" letter-spacing="3.5">SERVICIOS INDUSTRIALES</text>
  </g>

  <text x="80" y="290" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="62" font-weight="800">Soluciones industriales</text>
  <text x="80" y="362" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="62" font-weight="800">confiables para tu operación</text>

  <rect x="80" y="410" width="120" height="4" fill="url(#line)" rx="2"/>

  <text x="80" y="474" fill="#e4f1fc" font-family="Segoe UI, Arial, sans-serif" font-size="25" font-weight="600">Mantenimiento industrial · Rodamientos NTN 100% originales</text>
  <text x="80" y="512" fill="#b6ddf9" font-family="Segoe UI, Arial, sans-serif" font-size="21">Mantenimiento · Suministro · Asesoría técnica</text>

  <text x="80" y="586" fill="#7fc4f5" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="1">example.com</text>
</svg>
`;

const outputDir = path.resolve('public');
await mkdir(outputDir, { recursive: true });

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, palette: true })
  .toFile(path.join(outputDir, 'og-default.png'));

console.log('ok    public/og-default.png generado (1200x630).');
