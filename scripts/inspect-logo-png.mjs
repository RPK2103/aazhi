import fs from "node:fs";
import { PNG } from "pngjs";

const path = "public/brand/aazhi-logo.png";
const buffer = fs.readFileSync(path);
const png = PNG.sync.read(buffer);

console.log("Size:", png.width, "x", png.height);
console.log("Channels: RGBA (from pngjs)");

function sample(x, y) {
  const i = (png.width * y + x) << 2;
  return {
    x,
    y,
    r: png.data[i],
    g: png.data[i + 1],
    b: png.data[i + 2],
    a: png.data[i + 3],
  };
}

const points = [
  [0, 0],
  [10, 10],
  [png.width - 1, 0],
  [0, png.height - 1],
  [Math.floor(png.width / 2), Math.floor(png.height / 2)],
];

for (const [x, y] of points) {
  const p = sample(x, y);
  console.log(
    `(${p.x},${p.y}) R=${p.r} G=${p.g} B=${p.b} A=${p.a}`,
  );
}

let transparent = 0;
let opaque = 0;
let checkerLike = 0;
for (let y = 0; y < png.height; y += 8) {
  for (let x = 0; x < png.width; x += 8) {
    const p = sample(x, y);
    if (p.a === 0) transparent += 1;
    else if (p.a === 255) opaque += 1;
    const isLight = p.r > 200 && p.g > 200 && p.b > 200;
    const isDark = p.r < 80 && p.g < 80 && p.b < 80;
    if (p.a === 255 && (isLight || isDark)) checkerLike += 1;
  }
}

console.log("Sampled transparent pixels:", transparent);
console.log("Sampled opaque pixels:", opaque);
console.log("Sampled checker-like opaque pixels:", checkerLike);
