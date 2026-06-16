/**
 * Genera images/pattern.svg — marca de agua repetible con logos inclinados.
 * Ejecutar: node generate_pattern.js
 * (Volver a correr si cambias logofondo.png)
 */
const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'images', 'logofondo.png');
const svgPath = path.join(__dirname, 'images', 'pattern.svg');

const TILE = 160;
const LOGO = 56;

const placements = [
  { x: 8, y: 10, s: 0.38, r: -22 },
  { x: 68, y: 6, s: 0.32, r: 18 },
  { x: 112, y: 28, s: 0.34, r: -38 },
  { x: 28, y: 58, s: 0.30, r: 12 },
  { x: 82, y: 68, s: 0.36, r: -10 },
  { x: 12, y: 108, s: 0.33, r: -28 },
  { x: 58, y: 118, s: 0.35, r: 8 },
  { x: 108, y: 112, s: 0.31, r: -45 },
];

try {
  const bytes = fs.readFileSync(pngPath);
  const b64 = bytes.toString('base64');
  const cx = LOGO / 2;
  const cy = LOGO / 2;

  const uses = placements
    .map(
      ({ x, y, s, r }) =>
        `  <use href="#logo" transform="translate(${x},${y}) scale(${s}) rotate(${r}, ${cx}, ${cy})" opacity="0.55"/>`
    )
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
  <defs>
    <image id="logo" href="data:image/png;base64,${b64}" width="${LOGO}" height="${LOGO}"/>
  </defs>
${uses}
</svg>`;

  fs.writeFileSync(svgPath, svg);
  console.log(`Listo: pattern.svg (${TILE}x${TILE}px, ${placements.length} logos)`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
