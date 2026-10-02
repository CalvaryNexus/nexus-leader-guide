// Builds the logo assets from public/nexus-logo-white.png (900x223, white on transparent,
// extracted from the Abide Week 3 reference file).
//   public/nexus-logo-navy.png  same artwork recolored to --navy for light backgrounds
//   app/icon.png, app/apple-icon.png  the "n" glyph in navy on a white rounded square
// Run: node scripts/make-logos.mjs
import fs from "node:fs";
import { PNG } from "pngjs";

const NAVY = [0x1c, 0x32, 0x6a];
const src = PNG.sync.read(fs.readFileSync("public/nexus-logo-white.png"));

// 1. Navy logo: keep alpha, swap color.
const navy = new PNG({ width: src.width, height: src.height });
for (let i = 0; i < src.data.length; i += 4) {
  navy.data[i] = NAVY[0];
  navy.data[i + 1] = NAVY[1];
  navy.data[i + 2] = NAVY[2];
  navy.data[i + 3] = src.data[i + 3];
}
fs.writeFileSync("public/nexus-logo-navy.png", PNG.sync.write(navy));

// 2. Icons: crop the first glyph (columns 0..184), area-average it down, center on a rounded square.
const glyph = { x: 0, y: 0, w: 185, h: 223 };

function alphaAt(x, y) {
  return src.data[(y * src.width + x) * 4 + 3] / 255;
}

function makeIcon(size, glyphHeightRatio, radiusRatio) {
  const out = new PNG({ width: size, height: size });
  const gh = Math.round(size * glyphHeightRatio);
  const gw = Math.round((gh * glyph.w) / glyph.h);
  const ox = Math.round((size - gw) / 2);
  const oy = Math.round((size - gh) / 2);
  const r = size * radiusRatio;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded-square coverage (1 inside, 0 outside, soft edge).
      const cx = Math.min(Math.max(x + 0.5, r), size - r);
      const cy = Math.min(Math.max(y + 0.5, r), size - r);
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const bg = r < 1 ? 1 : Math.min(1, Math.max(0, r - dist + 0.5));
      // Glyph coverage by averaging the source pixels that map into this pixel.
      let g = 0;
      const gx = x - ox;
      const gy = y - oy;
      if (gx >= 0 && gx < gw && gy >= 0 && gy < gh) {
        const sx0 = Math.floor((gx * glyph.w) / gw);
        const sx1 = Math.max(sx0 + 1, Math.floor(((gx + 1) * glyph.w) / gw));
        const sy0 = Math.floor((gy * glyph.h) / gh);
        const sy1 = Math.max(sy0 + 1, Math.floor(((gy + 1) * glyph.h) / gh));
        let sum = 0;
        let n = 0;
        for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) { sum += alphaAt(glyph.x + sx, glyph.y + sy); n++; }
        g = sum / n;
      }
      const i = (y * size + x) * 4;
      // Navy glyph over white.
      out.data[i] = Math.round(255 + (NAVY[0] - 255) * g);
      out.data[i + 1] = Math.round(255 + (NAVY[1] - 255) * g);
      out.data[i + 2] = Math.round(255 + (NAVY[2] - 255) * g);
      out.data[i + 3] = Math.round(255 * bg);
    }
  }
  return PNG.sync.write(out);
}

fs.writeFileSync("app/icon.png", makeIcon(64, 0.62, 0.22));
fs.writeFileSync("app/apple-icon.png", makeIcon(180, 0.56, 0));
console.log("wrote public/nexus-logo-navy.png, app/icon.png, app/apple-icon.png");
