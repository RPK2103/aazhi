import fs from "node:fs";
import { PNG } from "pngjs";

const INPUT = "public/brand/aazhi-logo.png";
const OUTPUT = "public/brand/aazhi-logo-transparent.png";

function isLogoPixel(r, g, b) {
  if (g > 45 && b > 45 && g > r + 12 && b > r + 12) return true;
  if (g > 30 && b > 30 && (g + b) > r * 2) return true;
  return false;
}

function isBackgroundPixel(r, g, b) {
  if (isLogoPixel(r, g, b)) return false;
  if (r <= 12 && g <= 12 && b <= 12) return true;
  if (
    Math.abs(r - g) <= 6 &&
    Math.abs(g - b) <= 6 &&
    r >= 65 &&
    r <= 98
  ) {
    return true;
  }
  return false;
}

const buffer = fs.readFileSync(INPUT);
const png = PNG.sync.read(buffer);
const out = new PNG({ width: png.width, height: png.height });

for (let y = 0; y < png.height; y += 1) {
  for (let x = 0; x < png.width; x += 1) {
    const i = (png.width * y + x) << 2;
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];

    if (isBackgroundPixel(r, g, b)) {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    } else {
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = 255;
    }
  }
}

fs.writeFileSync(OUTPUT, PNG.sync.write(out));
console.log("Regenerated", OUTPUT);
