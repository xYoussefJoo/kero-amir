// Traces Kero's PNG logo into an SVG with one <path> per color layer.
const sharp = require("sharp");
const potrace = require("potrace");
const fs = require("fs");

const SRC = "D:/New_Desktop/kero-amir/design/brand/logo-original.png";
const OUT = "D:/New_Desktop/kero-amir/design/brand/logo-traced.svg";

const palette = {
  cream: [0xf4, 0xf0, 0xe7],
  orange: [0xff, 0x65, 0x35],
  blue: [0x25, 0x46, 0xeb],
  blueLight: [0x41, 0x5d, 0xeb],
};

const nearest = (r, g, b) => {
  let best = null, bestD = Infinity;
  for (const [name, [pr, pg, pb]] of Object.entries(palette)) {
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
};

const trace = (png) => new Promise((resolve, reject) => {
  const p = new potrace.Potrace({ threshold: 128, turdSize: 40, optTolerance: 0.4, alphaMax: 1 });
  p.loadImage(png, (err) => (err ? reject(err) : resolve((p.getPathTag().match(/ d="([^"]+)"/) || [])[1] ?? null)));
});

(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const masks = Object.fromEntries(Object.keys(palette).map((k) => [k, Buffer.alloc(width * height, 255)]));

  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    if (data[i + 3] < 128) continue;
    masks[nearest(data[i], data[i + 1], data[i + 2])][px] = 0; // black = shape
  }

  const layers = [];
  for (const [name, mask] of Object.entries(masks)) {
    const png = await sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
    const d = await trace(png);
    if (!d) { console.log(name, "empty, skipped"); continue; }
    const hex = "#" + palette[name].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    layers.push(`  <path id="${name}" fill="${hex}" d="${d}"/>`);
    console.log(name, "path length", d.length, "subpaths", (d.match(/M/g) || []).length);
  }

  fs.writeFileSync(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">\n${layers.join("\n")}\n</svg>\n`);
  console.log("wrote", OUT, fs.statSync(OUT).size, "bytes");
})();
