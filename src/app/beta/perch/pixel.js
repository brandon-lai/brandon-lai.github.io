// Perch's pixel art, rasterised the way the Mac app does it (PixelArt.swift / site/lib/pixel.ts):
// every solid pixel takes its palette colour, and each empty pixel touching one gets the outline.

const hex = (v) => {
  const n = parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function palette(colors, outline, { softOutline = outline, soft = [], post = [] } = {}) {
  return {
    colors: Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, hex(v)])),
    outline: hex(outline),
    softOutline: hex(softOutline),
    soft: new Set(soft),
    post: new Set(post),
  };
}

/** Top-down RGBA bytes with a one-pixel outline, softened where it only touches the face mask. */
export function rgba(grid, pal) {
  const h = grid.length, w = grid[0]?.length ?? 0;
  const out = new Uint8ClampedArray(w * h * 4);
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? grid[y][x] : ".");
  const solid = (x, y) => {
    const ch = at(x, y);
    return ch === "." || pal.post.has(ch) ? null : ch;
  };
  const put = (x, y, c) => {
    const i = (y * w + x) * 4;
    out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = solid(x, y);
      if (ch) { put(x, y, pal.colors[ch] ?? pal.outline); continue; }
      const near = [solid(x + 1, y), solid(x - 1, y), solid(x, y + 1), solid(x, y - 1)].filter(Boolean);
      if (near.length) put(x, y, near.every((n) => pal.soft.has(n)) ? pal.softOutline : pal.outline);
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (pal.post.has(at(x, y))) put(x, y, pal.colors[at(x, y)] ?? pal.outline);
  return out;
}

/** One sprite as a 1-px-per-art-pixel canvas, optionally mirrored. */
export function sprite(grid, pal, flip = false) {
  const h = grid.length, w = grid[0].length;
  const rows = flip ? grid.map((r) => [...r].reverse().join("")) : grid;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").putImageData(new ImageData(rgba(rows, pal), w, h), 0, 0);
  return c;
}

const blank = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
const rows = (g) => g.map((r) => r.join(""));

/** The bamboo stalk the cursor turns into, `length` art pixels long (0–22), leaves until it is short. */
export const BAMBOO = { width: 14, height: 24, centerX: 9.5, max: 22 };
export const bambooPixels = (remaining) => Math.ceil(Math.min(Math.max(remaining, 0), 1) * BAMBOO.max);
export const bambooPalette = () =>
  palette({ J: "#7CC453", K: "#C8F2A6", L: "#9BE07A", M: "#57AE4E", N: "#2E7446", Q: "#3F8A3C", R: "#1F5236" }, "#17261C");

export function bambooGrid(length) {
  const g = blank(BAMBOO.width, BAMBOO.height);
  if (length <= 0) return rows(g);
  for (let y = 1; y <= length; y++) { g[y][8] = "M"; g[y][9] = "L"; g[y][10] = "N"; }
  g[1][8] = "R"; g[1][9] = "N"; g[1][10] = "R";
  for (const node of [8, 16]) {
    if (node >= length) continue;
    for (let x = 7; x <= 11; x++) g[node][x] = "R";
    if (node + 1 <= length) { g[node + 1][8] = "K"; g[node + 1][9] = "K"; }
  }
  g[length][8] = "N"; g[length][9] = "M"; g[length][10] = "R";
  if (length >= 9) {
    const leaves = [".JJ.....", "..JJJ...", "...KJJ..", "....JJQ.", "......Q.", "...JJ.Q.", ".JJKJJQ.", "..JJ...Q"];
    leaves.forEach((r, i) => [...r].forEach((ch, x) => { if (ch !== ".") g[i + 1][x] = ch; }));
  }
  return rows(g);
}

/** A bite out of a window's top edge (row 0 on the edge), or rotated onto a side. */
const BITE_TOP = (() => {
  const g = blank(11, 5);
  for (let x = 1; x <= 9; x++) g[0][x] = "K";
  for (let x = 2; x <= 8; x++) g[1][x] = "K";
  for (const [x, y] of [[2, 2], [3, 2], [5, 2], [7, 2], [8, 2], [3, 3], [7, 3]]) g[y][x] = "K";
  g[1][4] = "G"; g[1][6] = "G";
  return g;
})();
export const bitePalette = () => palette({ K: "#2A2E38", G: "#4A5160" }, "#E9EEF5");
export function biteGrid(edge) {
  if (edge === "top") return rows(BITE_TOP);
  const g = blank(5, 11);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 11; x++) g[x][edge === "left" ? y : 4 - y] = BITE_TOP[y][x];
  return rows(g);
}

/** The sleep bubble: three z's that build up and fade, with a drop shadow. */
export const zPalette = () => palette({ Y: "#FBF1DF", y: "#5A3340" }, "#5A3340");
export function zGrid(frame, rightward) {
  const g = blank(18, 19);
  const z = (n, x0, y) => {
    const x = rightward ? x0 : 18 - 1 - x0 - (n - 1);
    for (let i = 0; i < n; i++) { g[y][x + i] = "Y"; g[y + n - 1][x + i] = "Y"; }
    for (let i = 1; i < n - 1; i++) g[y + i][x + n - 1 - i] = "Y";
  };
  const all = [[4, 0, 14], [5, 5, 7], [6, 11, 0]];
  [[0], [0, 1], [0, 1, 2], [1, 2]][frame % 4].forEach((i) => z(...all[i]));
  for (let y = 18; y >= 0; y--) for (let x = 17; x >= 0; x--) {
    if (g[y][x] === "Y" && y + 1 < 19 && x + 1 < 18 && g[y + 1][x + 1] === ".") g[y + 1][x + 1] = "y";
  }
  return rows(g);
}

export function heartGrid(frame) {
  const g = blank(9, 9);
  const top = 2 - (frame % 2);
  for (const x of [2, 3, 5, 6]) g[top][x] = "H";
  for (let x = 1; x <= 7; x++) { g[top + 1][x] = "H"; g[top + 2][x] = "H"; }
  for (let x = 2; x <= 6; x++) g[top + 3][x] = "H";
  for (let x = 3; x <= 5; x++) g[top + 4][x] = "H";
  g[top + 5][4] = "H";
  g[top + 1][2] = "I";
  return rows(g);
}
