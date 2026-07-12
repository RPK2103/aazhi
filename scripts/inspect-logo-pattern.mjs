import fs from "node:fs";
import { PNG } from "pngjs";

const buffer = fs.readFileSync("public/brand/aazhi-logo.png");
const png = PNG.sync.read(buffer);

function sample(x, y) {
  const i = (png.width * y + x) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

const colors = new Map();
for (let y = 0; y < 40; y++) {
  for (let x = 0; x < 40; x++) {
    const [r, g, b, a] = sample(x, y);
    const key = `${r},${g},${b},${a}`;
    colors.set(key, (colors.get(key) || 0) + 1);
  }
}

console.log("Top-left 40x40 color frequency:");
[...colors.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([k, n]) => console.log(n, k));

for (const y of [0, 1, 2, 3, 4, 5]) {
  const row = [];
  for (let x = 0; x < 12; x++) {
    const [r, g, b] = sample(x, y);
    row.push(`${r}/${g}/${b}`);
  }
  console.log(`y${y}:`, row.join(" | "));
}
