/**
 * Shared helpers for the data services. No dependencies: Node 20+ only.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

export const CI = Boolean(process.env.GITHUB_ACTIONS);

/** A warning that shows up on the workflow run summary in CI, plain text locally. */
export function warn(msg) {
  console.log(CI ? `::warning::${msg}` : `warning: ${msg}`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

/** Ask for a value on the terminal; `hidden` keeps a password off the screen. */
export function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (v) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(v.trim());
    });
  });
}

/* ---- routes ------------------------------------------------------------- */

/** Google's encoded polyline format → [[lat, lng], …] */
export function decodePolyline(str) {
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += d;
      else lng += d;
    }
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

const R = 6371000;
function haversine([a, b], [c, d]) {
  const toRad = Math.PI / 180;
  const dLat = (c - a) * toRad, dLng = (d - b) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * toRad) * Math.cos(c * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

/**
 * An activity's route as a bare SVG path in a 100×70 box: the shape only, no
 * map and no coordinates. The first and last `trim` metres are cut off so the
 * route never points at where a run starts or ends (usually home).
 */
export function routePath(encoded, { trim = 450 } = {}) {
  if (!encoded) return null;
  const pts = decodePolyline(encoded);
  if (pts.length < 8) return null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + haversine(pts[i - 1], pts[i]));
  const total = cum[cum.length - 1];
  if (total < trim * 2 + 800) return null;
  const kept = pts.filter((_, i) => cum[i] >= trim && cum[i] <= total - trim);
  if (kept.length < 4) return null;

  const lat0 = (kept.reduce((s, p) => s + p[0], 0) / kept.length) * (Math.PI / 180);
  const xy = kept.map(([la, ln]) => [ln * Math.cos(lat0), -la]);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1e-9, h = Math.max(...ys) - minY || 1e-9;
  const W = 100, H = 70, pad = 5;
  const s = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const ox = (W - w * s) / 2, oy = (H - h * s) / 2;
  const fit = xy.map(([x, y]) => [ox + (x - minX) * s, oy + (y - minY) * s]);
  const out = simplify(fit, 0.35);
  return out.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}
