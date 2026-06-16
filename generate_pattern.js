const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'images', 'logofondo.png');
const svgPath = path.join(__dirname, 'images', 'pattern.svg');

try {
  const bytes = fs.readFileSync(pngPath);
  const b64 = bytes.toString('base64');
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <image id="logo" href="data:image/png;base64,${b64}" width="100" height="100"/>
  </defs>
  <use href="#logo" transform="translate(30, 20) scale(0.45) rotate(15, 50, 50)" />
  <use href="#logo" transform="translate(180, 30) scale(0.35) rotate(-20, 50, 50)" />
  <use href="#logo" transform="translate(100, 130) scale(0.40) rotate(35, 50, 50)" />
  <use href="#logo" transform="translate(20, 200) scale(0.38) rotate(-15, 50, 50)" />
  <use href="#logo" transform="translate(210, 180) scale(0.42) rotate(10, 50, 50)" />
  <use href="#logo" transform="translate(130, 240) scale(0.30) rotate(-45, 50, 50)" />
</svg>`;

  fs.writeFileSync(svgPath, svg);
  console.log('Successfully generated pattern.svg!');
} catch (err) {
  console.error('Error generating SVG:', err);
}
