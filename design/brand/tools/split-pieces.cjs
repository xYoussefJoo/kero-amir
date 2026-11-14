// Splits the traced logo into puzzle pieces (outer contour + its holes) and writes logo-pieces.ts.
const fs = require("fs");

const SVG = "D:/New_Desktop/kero-amir/design/brand/logo-traced.svg";
const OUT = "D:/New_Desktop/kero-amir/apps/web/components/hero/logo-pieces.ts";

const svg = fs.readFileSync(SVG, "utf8");
const [, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
const layers = [...svg.matchAll(/<path id="(\w+)" fill="(#\w+)" d="([^"]+)"/g)].map(([, name, fill, d]) => ({ name, fill, d }));

const round = (s) => s.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 10) / 10));

function bbox(d) {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
  }
  return { minX, minY, maxX, maxY, area: (maxX - minX) * (maxY - minY) };
}

const inside = (a, b) => a.minX >= b.minX && a.maxX <= b.maxX && a.minY >= b.minY && a.maxY <= b.maxY && a.area < b.area;

const pieces = [];
for (const layer of layers) {
  const subpaths = layer.d.split(/(?=M )/).map((s) => s.trim()).filter(Boolean).map((d) => ({ d, box: bbox(d) }));
  // A subpath inside another subpath's box is a hole of the smallest such box (good enough for this logo).
  const outers = subpaths.filter((s) => !subpaths.some((o) => o !== s && inside(s.box, o.box)));
  for (const outer of outers) {
    const holes = subpaths.filter((s) => s !== outer && inside(s.box, outer.box)
      && !outers.some((o) => o !== outer && inside(s.box, o.box) && inside(o.box, outer.box)));
    const b = outer.box;
    pieces.push({
      color: layer.name,
      fill: layer.fill,
      d: round([outer.d, ...holes.map((h) => h.d)].join(" ")),
      cx: Math.round((b.minX + b.maxX) / 2),
      cy: Math.round((b.minY + b.maxY) / 2),
      area: Math.round(b.area),
    });
  }
}

// Assembly order: the big structural pieces land first, details (handles, tips) last.
pieces.sort((a, b) => b.area - a.area);

const body = pieces.map((p, i) =>
  `  { id: "p${i}", color: "${p.color}", fill: "${p.fill}", cx: ${p.cx}, cy: ${p.cy},\n    d: "${p.d}" },`).join("\n");

fs.mkdirSync(require("path").dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `// GENERATED from design/brand/logo-traced.svg (scratch script split-pieces.cjs). Do not edit by hand.
// Kero's K logo as separate puzzle pieces: each has its own path (outer + holes, even-odd) and centre.

export type LogoPiece = {
  id: string;
  color: "cream" | "orange" | "blue" | "blueLight";
  fill: string;
  /** Centre of the piece's bounding box, in viewBox units. */
  cx: number;
  cy: number;
  /** Path data; use fill-rule="evenodd" so holes stay open. */
  d: string;
};

export const LOGO_VIEWBOX = { width: ${width}, height: ${height} } as const;

/** Pieces in assembly order: biggest first. */
export const LOGO_PIECES: readonly LogoPiece[] = [
${body}
];
`);
console.log(`${pieces.length} pieces ->`, OUT);
console.table(pieces.map((p) => ({ color: p.color, cx: p.cx, cy: p.cy, area: p.area, len: p.d.length })));
