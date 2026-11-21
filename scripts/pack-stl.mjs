// binary STL -> compact indexed parts for the watch bench on /beta.
//
//   node scripts/pack-stl.mjs <in.stl> <out.bin>
//
// Each separate shell in the STL (case, crystal, caseback, crown...) becomes
// its own part, so the page can pull the watch apart. Parts are written
// largest first; WatchBench.js names them in that order, so check the list
// this prints against the `parts` names there after re-exporting.
//
// Layout (little endian):
//   "WCH2" · u32 partCount
//   per part: u32 nVerts · u32 nTris · f32[3] min · f32[3] max
//             u16[nVerts*3] positions quantized to the part's box
//             u16|u32[nTris*3] indices (u32 when nVerts > 65535), padded to 4 bytes
import { readFileSync, writeFileSync } from "node:fs";

const [src, out] = process.argv.slice(2);
const buf = readFileSync(src);
const n = buf.readUInt32LE(80);
if (84 + n * 50 !== buf.length) throw new Error("not a binary STL");

// weld identical corners so triangles that share a vertex join one shell
const key = new Map();
const P = [];
const tri = new Uint32Array(n * 3);
for (let t = 0; t < n; t++) {
  for (let v = 0; v < 3; v++) {
    const o = 84 + t * 50 + 12 + v * 12;
    const x = buf.readFloatLE(o), y = buf.readFloatLE(o + 4), z = buf.readFloatLE(o + 8);
    const k = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let id = key.get(k);
    if (id === undefined) {
      id = P.length / 3;
      key.set(k, id);
      P.push(x, y, z);
    }
    tri[t * 3 + v] = id;
  }
}

// union-find over shared vertices -> shells
const parent = Int32Array.from({ length: P.length / 3 }, (_, i) => i);
const root = (a) => {
  while (parent[a] !== a) a = parent[a] = parent[parent[a]];
  return a;
};
for (let t = 0; t < n; t++) {
  const a = root(tri[t * 3]);
  parent[root(tri[t * 3 + 1])] = a;
  parent[root(tri[t * 3 + 2])] = a;
}
const shells = new Map();
for (let t = 0; t < n; t++) {
  const r = root(tri[t * 3]);
  if (!shells.has(r)) shells.set(r, []);
  shells.get(r).push(t);
}

const chunks = [Buffer.from("WCH2"), Buffer.alloc(4)];
const parts = [...shells.values()].sort((a, b) => b.length - a.length);
chunks[1].writeUInt32LE(parts.length);
const report = [];
for (const tris of parts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (let v = 0; v < 3; v++) for (let a = 0; a < 3; a++) {
    const x = P[tri[t * 3 + v] * 3 + a];
    if (x < min[a]) min[a] = x;
    if (x > max[a]) max[a] = x;
  }
  const q = (x, a) => Math.round(((x - min[a]) / (max[a] - min[a] || 1)) * 65535);
  const map = new Map(), pos = [], idx = [];
  for (const t of tris) {
    const c = [0, 1, 2].map((v) => {
      const p = tri[t * 3 + v] * 3;
      const k = [0, 1, 2].map((a) => q(P[p + a], a));
      const s = k.join(",");
      let id = map.get(s);
      if (id === undefined) {
        id = pos.length / 3;
        map.set(s, id);
        pos.push(...k);
      }
      return id;
    });
    // drop triangles that collapsed under quantization
    if (c[0] !== c[1] && c[1] !== c[2] && c[0] !== c[2]) idx.push(...c);
  }
  const nv = pos.length / 3, nt = idx.length / 3, wide = nv > 65535;
  const head = Buffer.alloc(32);
  head.writeUInt32LE(nv, 0);
  head.writeUInt32LE(nt, 4);
  [...min, ...max].forEach((v, i) => head.writeFloatLE(v, 8 + i * 4));
  const I = Buffer.from((wide ? new Uint32Array(idx) : new Uint16Array(idx)).buffer);
  const posBuf = Buffer.from(new Uint16Array(pos).buffer);
  const pad = Buffer.alloc((4 - ((posBuf.length + I.length) % 4)) % 4);
  chunks.push(head, posBuf, I, pad);
  report.push({
    tris: nt,
    size: [0, 1, 2].map((a) => +(max[a] - min[a]).toFixed(1)).join("×"),
    center: [0, 1, 2].map((a) => +((min[a] + max[a]) / 2).toFixed(1)).join(","),
  });
}
const all = Buffer.concat(chunks);
writeFileSync(out, all);
console.log(`${src.split("/").pop()} → ${out} (${(all.length / 1024).toFixed(0)} KB, ${parts.length} parts, largest first)`);
console.table(report);
