// binary STL -> compact indexed mesh: header JSON-free layout
//   u32 nVerts, u32 nTris, f32[3] min, f32[3] max, u16[nVerts*3] quantized pos, u32|u16[nTris*3] indices
import { readFileSync, writeFileSync } from "node:fs";
const [src, out] = process.argv.slice(2);
const buf = readFileSync(src);
const n = buf.readUInt32LE(80);
if (84 + n * 50 !== buf.length) throw new Error("not a binary STL");
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
const raw = new Float32Array(n * 9);
for (let i = 0; i < n; i++) for (let v = 0; v < 3; v++) for (let a = 0; a < 3; a++) {
  const x = buf.readFloatLE(84 + i * 50 + 12 + v * 12 + a * 4);
  raw[i * 9 + v * 3 + a] = x; if (x < min[a]) min[a] = x; if (x > max[a]) max[a] = x;
}
const q = (x, a) => Math.round(((x - min[a]) / (max[a] - min[a] || 1)) * 65535);
const map = new Map(); const pos = []; const idx = [];
for (let i = 0; i < n * 3; i++) {
  const k = `${q(raw[i * 3], 0)},${q(raw[i * 3 + 1], 1)},${q(raw[i * 3 + 2], 2)}`;
  let id = map.get(k);
  if (id === undefined) { id = pos.length / 3; map.set(k, id); pos.push(q(raw[i * 3], 0), q(raw[i * 3 + 1], 1), q(raw[i * 3 + 2], 2)); }
  idx.push(id);
}
// drop triangles that collapsed under quantization
const tris = []; for (let i = 0; i < idx.length; i += 3) { const [a, b, c] = idx.slice(i, i + 3); if (a !== b && b !== c && a !== c) tris.push(a, b, c); }
const nv = pos.length / 3, nt = tris.length / 3, wide = nv > 65535;
const head = Buffer.alloc(4 + 4 + 24); head.writeUInt32LE(nv, 0); head.writeUInt32LE(nt, 4);
[...min, ...max].forEach((v, i) => head.writeFloatLE(v, 8 + i * 4));
const P = Buffer.from(new Uint16Array(pos).buffer);
const I = Buffer.from((wide ? new Uint32Array(tris) : new Uint16Array(tris)).buffer);
writeFileSync(out, Buffer.concat([head, P, I]));
console.log(src.split("/").pop(), { tris: n, kept: nt, verts: nv, wide, size: [0, 1, 2].map((a) => +(max[a] - min[a]).toFixed(2)), bytes: 32 + P.length + I.length });
