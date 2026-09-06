/**
 * The city itself: how scroll progress maps to a year, how the light changes,
 * which landmarks exist, and how each district fills in over time. Pure data
 * and pure functions — the drawing lives in manhattan.js.
 */
import {
  hash,
  hexToRgb,
  keyframe,
  lerp,
  mixRgb,
  monotoneSpline,
  mulberry,
  smoothstep,
} from "./util";

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------
export const CFG = {
  // The scroll length of the intro lives in alpha.css, so the page is laid
  // out correctly before any of this runs.
  mobileMaxW: 760,       // keep in step with the breakpoint in alpha.css
  smoothing: 0.14,       // lerp toward target scroll progress
  esbTargetFrac: 0.42,   // Empire State height as a fraction of viewport at final framing
  baselineFrac: 0.80,    // where the waterline sits
  islandFt: 70866,       // length of Manhattan expressed in feet, used to relate x to height
  // Heights are exaggerated, so widths have to be too or every building reads
  // as a needle. This is what keeps the massing looking like buildings.
  // Apparent slenderness depends on viewport aspect, so this is derived per
  // layout rather than fixed. Tuned so a phone and a desktop agree.
  widthBoostK: 4.95,
  fillCount: 620,
  fillCountMobile: 330,
  windowMinPx: 13,       // below this on-screen width, buildings get a tint instead of windows
  midSpanDesktop: 0.68,
  midSpanMobile: 0.60
};

// ---------------------------------------------------------------------------
// time: scroll progress to year
// ---------------------------------------------------------------------------
/**
 * This used to interpolate a table of hand-placed waypoints, which meant the
 * clock changed speed abruptly at every one of them — 1625–1776 ran eight
 * times faster than the stretch before it, landing as a lurch a second and a
 * half in, and no amount of smoothing between the same waypoints removes a
 * seventeenfold swing in speed.
 *
 * Consistency is a property of the rate, so the rate is what is written down
 * here and the curve is its integral. Time runs quickest at the start and
 * eases continuously from there, which passes the empty centuries briskly and
 * still leaves the modern skyline room, then tapers to a halt as the present
 * arrives so the clock coasts to a stop rather than hitting one.
 */
const FIRST_YEAR = 1609;
const LAST_YEAR = 2026;
/** progress at which the clock reaches the present and the push-in takes over */
const ARRIVAL = 0.8;
/** how much quicker the opening runs than the final approach */
const PACE_CONTRAST = 6;
/** the span of progress over which the clock eases to a halt */
const TAPER = 0.16;
/** samples of the integrated curve — dense enough that reading it is smooth */
const STEPS = 1024;

const YEARS = (function () {
  const decay = Math.log(PACE_CONTRAST) / ARRIVAL;
  const rate = (p) =>
    Math.exp(-decay * p) * (1 - smoothstep(ARRIVAL - TAPER, ARRIVAL, p));

  // cumulative trapezoid, then normalised so the curve always lands on 2026
  const cum = new Float64Array(STEPS + 1);
  for (let i = 1; i <= STEPS; i++) {
    const a = ((i - 1) / STEPS) * ARRIVAL;
    const b = (i / STEPS) * ARRIVAL;
    cum[i] = cum[i - 1] + ((rate(a) + rate(b)) / 2) * (b - a);
  }
  const total = cum[STEPS];
  for (let i = 0; i <= STEPS; i++) {
    cum[i] = FIRST_YEAR + ((LAST_YEAR - FIRST_YEAR) * cum[i]) / total;
  }
  return cum;
})();

export function yearAt(p) {
  if (p <= 0) return FIRST_YEAR;
  if (p >= ARRIVAL) return LAST_YEAR;
  const x = (p / ARRIVAL) * STEPS;
  const i = Math.floor(x);
  return lerp(YEARS[i], YEARS[i + 1], x - i);
}

// camera framing follows the extent of development
const FRAME = [
  { at: 1609, x0: 0.000, x1: 0.20 },
  { at: 1750, x0: 0.000, x1: 0.24 },
  { at: 1850, x0: 0.000, x1: 0.46 },
  { at: 1900, x0: 0.000, x1: 0.80 },
  { at: 1930, x0: 0.000, x1: 1.00 },
  { at: 2026, x0: 0.000, x1: 1.00 }
];

/* Smoothed for the same reason: the camera widens to follow the city up the
   island, and a corner in that curve reads as the zoom snagging. */
const frameX0 = monotoneSpline(FRAME.map((s) => s.at), FRAME.map((s) => s.x0));
const frameX1 = monotoneSpline(FRAME.map((s) => s.at), FRAME.map((s) => s.x1));

export function frameAt(year) {
  return { x0: frameX0(year), x1: frameX1(year) };
}

// sky and light
const PAL = [
  { at: 0.00, top: '#0d1330', mid: '#1c2749', hor: '#3a3358', bl: '#1c2038', bd: '#0c0f1e', rim: '#5a5470', wat: '#111830' },
  { at: 0.08, top: '#2a3a6b', mid: '#7a6a8c', hor: '#e0885c', bl: '#6f5c55', bd: '#2e2a33', rim: '#ffb27a', wat: '#3a3a55' },
  { at: 0.17, top: '#4a74b0', mid: '#9fb0d0', hor: '#ffb87e', bl: '#b89d81', bd: '#6b5a4e', rim: '#ffd0a0', wat: '#6a86ad' },
  { at: 0.31, top: '#3f7fc4', mid: '#8fb8e0', hor: '#d8e6f2', bl: '#c9c2b4', bd: '#8a8578', rim: '#ffffff', wat: '#5f8cb8' },
  { at: 0.46, top: '#2f7ac9', mid: '#7fb2e6', hor: '#e8f2fa', bl: '#cfcabe', bd: '#918c80', rim: '#ffffff', wat: '#558ec2' },
  { at: 0.60, top: '#3a76b8', mid: '#a8bcd8', hor: '#f3d8b0', bl: '#cbb595', bd: '#7f7365', rim: '#ffe0b0', wat: '#5b83aa' },
  { at: 0.70, top: '#3b5f97', mid: '#c98f68', hor: '#ffb066', bl: '#7d6450', bd: '#3a2f2a', rim: '#ffcf8a', wat: '#7a6a72' },
  { at: 0.77, top: '#2b3f72', mid: '#8a5a7a', hor: '#ff8a52', bl: '#3e3340', bd: '#1d1922', rim: '#ff9c5e', wat: '#4a3f56' },
  { at: 0.85, top: '#141f47', mid: '#2c3461', hor: '#6b4a72', bl: '#1e2138', bd: '#0e1020', rim: '#7a6a9a', wat: '#1a2340' },
  { at: 1.00, top: '#050817', mid: '#0b1129', hor: '#1e1c40', bl: '#12162a', bd: '#070912', rim: '#3a3a5e', wat: '#080e20' }
];
const PALC = PAL.map(function (s) {
  return {
    at: s.at,
    top: hexToRgb(s.top), mid: hexToRgb(s.mid), hor: hexToRgb(s.hor),
    bl: hexToRgb(s.bl), bd: hexToRgb(s.bd), rim: hexToRgb(s.rim), wat: hexToRgb(s.wat)
  };
});
export function paletteAt(p) {
  return keyframe(PALC, p, function (a, b, t) {
    return {
      top: mixRgb(a.top, b.top, t), mid: mixRgb(a.mid, b.mid, t), hor: mixRgb(a.hor, b.hor, t),
      bl: mixRgb(a.bl, b.bl, t), bd: mixRgb(a.bd, b.bd, t),
      rim: mixRgb(a.rim, b.rim, t), wat: mixRgb(a.wat, b.wat, t)
    };
  });
}

// ---------------------------------------------------------------------------
// buildings
// ---------------------------------------------------------------------------
// x runs 0 (the Battery) to 1 (Inwood), compressed so downtown and midtown
// get more width than they do in reality.
export const HEROES = [
  { id: 'trinity', x: 0.046, w: 0.0055, ft: 281, built: 1846, style: 'trinity',
    cap: '1846, Trinity Church, the tallest thing in the city' },
  { id: 'world', x: 0.074, w: 0.006, ft: 309, built: 1890, demo: 1955, style: 'domed',
    cap: '1890, the World Building', bye: '1955, the World Building comes down' },
  { id: 'parkrow', x: 0.082, w: 0.005, ft: 391, built: 1899, style: 'gothic' },
  { id: 'singer', x: 0.060, w: 0.0048, ft: 612, built: 1908, demo: 1968, style: 'singer',
    cap: '1908, the Singer Building', bye: '1968, the Singer Building is torn down' },
  { id: 'metlife', x: 0.348, w: 0.0052, ft: 700, built: 1909, style: 'metlife' },
  { id: 'woolworth', x: 0.068, w: 0.0055, ft: 792, built: 1913, style: 'woolworth',
    cap: '1913, the Woolworth Building' },
  { id: 'penn', x: 0.383, w: 0.014, ft: 160, built: 1910, demo: 1963, style: 'lowrise',
    cap: '1910, Pennsylvania Station', bye: '1963, Penn Station is demolished' },
  { id: 'chrysler', x: 0.433, w: 0.0068, ft: 1046, built: 1930, style: 'chrysler',
    cap: '1930, the Chrysler Building' },
  { id: 'esb', x: 0.400, w: 0.0105, ft: 1250, spire: 1454, built: 1931, style: 'esb',
    cap: '1931, the Empire State Building' },
  { id: 'rock', x: 0.468, w: 0.009, ft: 850, built: 1933, style: 'rock',
    cap: '1933, Rockefeller Center' },
  { id: 'seagram', x: 0.452, w: 0.005, ft: 515, built: 1958, style: 'slab' },
  { id: 'panam', x: 0.437, w: 0.008, ft: 808, built: 1963, style: 'setback2' },
  { id: 'wtc1', x: 0.038, w: 0.0055, ft: 1368, spire: 1728, built: 1971, demo: 2001, style: 'wtc' },
  { id: 'wtc2', x: 0.046, w: 0.0055, ft: 1362, built: 1973, demo: 2001, style: 'wtc',
    cap: '1973, the World Trade Center' },
  { id: 'citicorp', x: 0.458, w: 0.0062, ft: 915, built: 1977, style: 'citicorp' },
  { id: 'one57', x: 0.534, w: 0.0035, ft: 1005, built: 2014, style: 'one57' },
  { id: 'owtc', x: 0.042, w: 0.006, ft: 1368, spire: 1776, built: 2014, style: 'owtc',
    cap: '2014, One World Trade Center' },
  { id: 'p432', x: 0.545, w: 0.0022, ft: 1396, built: 2015, style: 'p432' },
  { id: 'hy30', x: 0.362, w: 0.008, ft: 1268, built: 2019, style: 'glass', layer: 'far' },
  { id: 'hy15', x: 0.372, w: 0.006, ft: 900, built: 2019, style: 'glass', layer: 'far' },
  { id: 'w111', x: 0.539, w: 0.0019, ft: 1428, built: 2021, style: 'w111' },
  { id: 'cpt', x: 0.552, w: 0.0042, ft: 1550, built: 2021, style: 'cpt',
    cap: '2021, Central Park Tower' }
];

// captions that are not attached to a single building
export const EVENTS = [
  { year: 1625, text: '1625, New Amsterdam, a few hundred people at the tip' },
  { year: 1776, text: '1776, fire takes a quarter of the town' },
  { year: 1811, text: '1811, the grid is drawn across farmland' },
  { year: 1858, text: '1858, Central Park is carved out of the middle' },
  { year: 1883, text: '1883, the Brooklyn Bridge opens' },
  { year: 1916, text: '1916, zoning arrives, and towers start stepping back' },
  { year: 2001, text: '2001' }
];

export const BRIDGES = [
  { x: 0.088, span: 0.055, built: 1883, h: 276, type: 'stone' },
  { x: 0.205, span: 0.05, built: 1903, h: 310, type: 'trussed' },
  { x: 0.108, span: 0.045, built: 1909, h: 322, type: 'steel' },
  { x: 0.567, span: 0.05, built: 1909, h: 350, type: 'cantilever' },
  { x: 0.815, span: 0.06, built: 1936, h: 315, type: 'steel' }
];

const DISTRICTS = [
  { x0: 0.000, x1: 0.115, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1660, d: 0.25, med: 32, max: 60, s: 'lowrise' },
    { y: 1800, d: 0.55, med: 42, max: 90, s: 'lowrise' },
    { y: 1880, d: 0.85, med: 70, max: 170, s: 'lowrise' },
    { y: 1915, d: 0.95, med: 190, max: 500, s: 'setback' },
    { y: 1970, d: 0.97, med: 300, max: 800, s: 'slab' },
    { y: 2026, d: 0.97, med: 340, max: 950, s: 'glass' } ] },
  { x0: 0.115, x1: 0.26, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1790, d: 0.10, med: 30, max: 50, s: 'lowrise' },
    { y: 1850, d: 0.60, med: 48, max: 90, s: 'lowrise' },
    { y: 1900, d: 0.92, med: 70, max: 140, s: 'lowrise' },
    { y: 1960, d: 0.94, med: 90, max: 260, s: 'slab' },
    { y: 2026, d: 0.95, med: 110, max: 420, s: 'glass' } ] },
  { x0: 0.26, x1: 0.36, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1830, d: 0.12, med: 34, max: 60, s: 'lowrise' },
    { y: 1880, d: 0.62, med: 60, max: 120, s: 'lowrise' },
    { y: 1920, d: 0.90, med: 120, max: 320, s: 'setback' },
    { y: 1975, d: 0.93, med: 160, max: 500, s: 'slab' },
    { y: 2026, d: 0.94, med: 200, max: 700, s: 'glass' } ] },
  { x0: 0.36, x1: 0.50, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1850, d: 0.10, med: 36, max: 70, s: 'lowrise' },
    { y: 1890, d: 0.55, med: 70, max: 160, s: 'lowrise' },
    { y: 1920, d: 0.88, med: 240, max: 600, s: 'setback' },
    { y: 1960, d: 0.94, med: 330, max: 660, s: 'slab' },
    { y: 2026, d: 0.96, med: 380, max: 820, s: 'glass' } ] },
  { x0: 0.50, x1: 0.565, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1870, d: 0.20, med: 40, max: 70, s: 'lowrise' },
    { y: 1915, d: 0.75, med: 110, max: 300, s: 'setback' },
    { y: 1965, d: 0.90, med: 240, max: 620, s: 'slab' },
    { y: 2026, d: 0.93, med: 330, max: 900, s: 'glass' } ] },
  // the park gap: deliberately sparse, low, and set back
  { x0: 0.565, x1: 0.735, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1890, d: 0.18, med: 45, max: 90, s: 'lowrise' },
    { y: 1930, d: 0.42, med: 130, max: 300, s: 'setback' },
    { y: 1980, d: 0.50, med: 180, max: 400, s: 'slab' },
    { y: 2026, d: 0.52, med: 200, max: 500, s: 'glass' } ] },
  { x0: 0.735, x1: 0.90, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1890, d: 0.22, med: 42, max: 80, s: 'lowrise' },
    { y: 1930, d: 0.70, med: 90, max: 190, s: 'lowrise' },
    { y: 1975, d: 0.82, med: 130, max: 280, s: 'slab' },
    { y: 2026, d: 0.84, med: 145, max: 320, s: 'slab' } ] },
  { x0: 0.90, x1: 1.00, stops: [
    { y: 1609, d: 0.00, med: 0, max: 0, s: 'lowrise' },
    { y: 1910, d: 0.20, med: 40, max: 70, s: 'lowrise' },
    { y: 1950, d: 0.55, med: 80, max: 160, s: 'lowrise' },
    { y: 2026, d: 0.60, med: 95, max: 200, s: 'slab' } ] }
];

function districtStop(d, year) {
  return keyframe(d.stops.map(function (s) { return { at: s.y, s: s }; }), year, function (a, b, t) {
    return {
      d: lerp(a.s.d, b.s.d, t),
      med: lerp(a.s.med, b.s.med, t),
      max: lerp(a.s.max, b.s.max, t),
      s: t < 0.5 ? a.s.s : b.s.s
    };
  });
}

// Generate the procedural fill once. Each slot gets a stable birth year, so
// buildings appear and stay put rather than flickering as you scroll.
export function buildFill(count) {
  const FILL = [];
  let slot = 0;
  for (let di = 0; di < DISTRICTS.length; di++) {
    const d = DISTRICTS[di];
    const share = Math.round(count * (d.x1 - d.x0));
    for (let i = 0; i < share; i++) {
      slot++;
      const rnd = mulberry(slot * 9176 + di * 31);
      const x = d.x0 + (d.x1 - d.x0) * ((i + 0.5 + (rnd() - 0.5) * 0.7) / share);
      const u = rnd();

      // find the first year at which local density exceeds this slot's threshold
      let birth = null;
      for (let y = 1620; y <= 2026; y += 4) {
        if (districtStop(d, y).d >= u) { birth = y; break; }
      }
      if (birth === null) continue;

      const st = districtStop(d, birth);
      const hv = rnd();
      const ft = lerp(st.med * 0.55, st.max, Math.pow(hv, 2.1));
      const w = lerp(0.0016, 0.0042, rnd()) * (0.6 + 0.9 * Math.min(1, ft / 500));

      // depth into the island: 0 sits on the waterfront, 1 is over on the west side
      const z = Math.pow(rnd(), 0.85);
      const b = { x: x, w: w, ft: Math.max(22, ft), built: birth, style: st.s,
                fill: true, seed: slot, z: z };
      FILL.push(b);

      // roughly a third of early buildings get replaced by something taller
      if (birth < 1935 && rnd() < 0.34) {
        const demo = Math.round(birth + lerp(35, 95, rnd()));
        if (demo < 2020) {
          b.demo = demo;
          const st2 = districtStop(d, demo + 3);
          const ft2 = Math.max(b.ft * 1.35, lerp(st2.med * 0.7, st2.max, Math.pow(rnd(), 1.7)));
          FILL.push({
            x: x, w: w * 1.1, ft: ft2, built: demo + 3, style: st2.s,
            fill: true, seed: slot + 100000, z: z
          });
        }
      }
    }
  }
  // draw the far side of the island first so nearer blocks overlap it
  FILL.sort(function (a, b) { return b.z - a.z; });
  return FILL;
}


// ---------------------------------------------------------------------------
// silhouettes
// ---------------------------------------------------------------------------
// Every profile is a normalized outline. x runs from -0.5 (left edge) to 0.5,
// y runs from 0 at street level to 1 at the roof, not counting a mast.
// Points trace the left side upward, across the top, then down the right side.

// mirror() takes a left half that ends on or near the centre line and
// completes the symmetric right half for it.
function mirror(half) {
  const pts = half.slice();
  for (let i = half.length - 1; i >= 0; i--) pts.push([-half[i][0], half[i][1]]);
  return pts;
}

// the Chrysler crown: seven stacked arches sweeping in to the needle
const chryslerHalf = [
  [-0.5, 0], [-0.5, 0.10], [-0.43, 0.10], [-0.43, 0.44],
  [-0.34, 0.44], [-0.34, 0.60], [-0.27, 0.60], [-0.27, 0.745]
];
(function () {
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    chryslerHalf.push([-0.27 * Math.pow(1 - t, 1.45), 0.745 + 0.205 * t]);
  }
  chryslerHalf.push([-0.011, 0.955], [0, 1]);
})();

const PROFILES = {
  // ---- landmarks ----
  esb: mirror([
    [-0.5, 0], [-0.5, 0.055], [-0.41, 0.055], [-0.41, 0.30],
    [-0.205, 0.30], [-0.205, 0.80], [-0.165, 0.80], [-0.165, 0.875],
    [-0.115, 0.875], [-0.115, 0.93], [-0.075, 0.965], [-0.05, 1]
  ]),
  chrysler: mirror(chryslerHalf),
  woolworth: mirror([
    [-0.5, 0], [-0.5, 0.36], [-0.34, 0.36], [-0.34, 0.55],
    [-0.28, 0.55], [-0.28, 0.775], [-0.225, 0.80], [-0.155, 0.865],
    [-0.10, 0.925], [-0.045, 0.975], [0, 1]
  ]),
  singer: mirror([
    [-0.5, 0], [-0.5, 0.30], [-0.19, 0.30], [-0.19, 0.79],
    [-0.235, 0.815], [-0.225, 0.855], [-0.16, 0.90], [-0.08, 0.935],
    [-0.045, 0.948], [-0.045, 0.975], [-0.018, 0.985], [0, 1]
  ]),
  metlife: mirror([
    [-0.5, 0], [-0.5, 0.26], [-0.235, 0.26], [-0.235, 0.78],
    [-0.29, 0.80], [-0.29, 0.835], [-0.205, 0.855], [-0.09, 0.945],
    [-0.05, 0.955], [-0.05, 0.98], [0, 1]
  ]),
  trinity: mirror([
    [-0.5, 0], [-0.5, 0.20], [-0.20, 0.20], [-0.20, 0.55],
    [-0.245, 0.575], [-0.135, 0.615], [-0.135, 0.72], [-0.105, 0.755],
    [-0.05, 0.885], [0, 1]
  ]),
  rock: mirror([
    [-0.5, 0], [-0.5, 0.58], [-0.415, 0.58], [-0.415, 0.76],
    [-0.30, 0.76], [-0.30, 0.885], [-0.185, 0.885], [-0.185, 1]
  ]),
  owtc: mirror([
    [-0.5, 0], [-0.442, 0.22], [-0.378, 0.44], [-0.312, 0.66],
    [-0.252, 0.85], [-0.215, 1]
  ]),
  domed: mirror([
    [-0.5, 0], [-0.5, 0.52], [-0.30, 0.52], [-0.30, 0.70],
    [-0.345, 0.725], [-0.30, 0.775], [-0.215, 0.885], [-0.10, 0.95],
    [-0.04, 0.965], [-0.04, 0.99], [0, 1]
  ]),
  // Citicorp sits on one enormous central column and its roof is cut at 45
  citicorp: [
    [-0.5, 0.13], [-0.5, 0.795], [0.5, 1.0], [0.5, 0.13],
    [0.075, 0.13], [0.075, 0], [-0.075, 0], [-0.075, 0.13]
  ],
  // 432 Park is a plain square shaft, its open mechanical floors are extras
  p432: [[-0.5, 0], [-0.5, 1], [0.5, 1], [0.5, 0]],
  // 111 West 57th steps back on one face all the way up
  w111: [
    [-0.5, 0], [-0.5, 1], [0.09, 1], [0.12, 0.92], [0.16, 0.86],
    [0.20, 0.79], [0.25, 0.71], [0.30, 0.62], [0.36, 0.52],
    [0.42, 0.40], [0.5, 0.30], [0.5, 0]
  ],
  // Central Park Tower is famously top heavy, cantilevered out over its base
  cpt: [
    [-0.30, 0], [-0.30, 0.30], [-0.5, 0.335], [-0.5, 1],
    [0.5, 1], [0.5, 0.335], [0.30, 0.30], [0.30, 0]
  ],
  one57: [
    [-0.5, 0], [-0.5, 0.87], [-0.38, 0.95], [-0.12, 1],
    [0.20, 0.99], [0.41, 0.93], [0.5, 0.83], [0.5, 0]
  ],
  wtc: [[-0.5, 0], [-0.5, 1], [0.5, 1], [0.5, 0]],

  // ---- generic stock ----
  slab: mirror([[-0.5, 0], [-0.5, 0.955], [-0.30, 0.955], [-0.30, 1], [0, 1]]),
  glass: mirror([[-0.5, 0], [-0.5, 0.93], [-0.33, 0.93], [-0.33, 1], [0, 1]]),
  supertall: mirror([[-0.5, 0], [-0.5, 0.96], [-0.42, 0.99], [-0.30, 1], [0, 1]]),
  setback: mirror([
    [-0.5, 0], [-0.5, 0.40], [-0.40, 0.40], [-0.40, 0.62],
    [-0.30, 0.62], [-0.30, 0.80], [-0.205, 0.80], [-0.205, 0.92],
    [-0.125, 0.92], [-0.125, 1]
  ]),
  setback2: mirror([
    [-0.5, 0], [-0.5, 0.55], [-0.36, 0.55], [-0.36, 0.83],
    [-0.20, 0.83], [-0.20, 1]
  ]),
  // prewar walk-ups carry a heavy cornice that overhangs the facade
  tenement: mirror([[-0.5, 0], [-0.5, 0.90], [-0.55, 0.925], [-0.55, 1], [0, 1]]),
  lowrise: mirror([[-0.5, 0], [-0.5, 0.86], [-0.54, 0.90], [-0.54, 1], [0, 1]]),
  gable: mirror([[-0.5, 0], [-0.5, 0.58], [0, 1]]),
  gothic: mirror([
    [-0.5, 0], [-0.5, 0.45], [-0.33, 0.45], [-0.33, 0.72],
    [-0.365, 0.745], [-0.225, 0.80], [-0.10, 0.93], [0, 1]
  ]),
  spire: mirror([
    [-0.5, 0], [-0.5, 0.30], [-0.17, 0.30], [-0.17, 0.55],
    [-0.215, 0.575], [-0.125, 0.615], [-0.055, 0.85], [0, 1]
  ]),
  tower: mirror([
    [-0.5, 0], [-0.5, 0.28], [-0.26, 0.28], [-0.26, 0.80],
    [-0.31, 0.82], [-0.17, 0.865], [-0.05, 0.97], [0, 1]
  ])
};

export function profileFor(b) {
  if (!b.fill) return PROFILES[b.style] || PROFILES.slab;
  const v = hash(b.seed || 1, 61);
  if (b.style === 'lowrise') {
    if (b.built < 1800) return PROFILES.gable;
    return v < 0.5 ? PROFILES.tenement : PROFILES.lowrise;
  }
  if (b.style === 'setback') return v < 0.55 ? PROFILES.setback : PROFILES.setback2;
  if (b.style === 'slab') return v < 0.2 ? PROFILES.setback2 : PROFILES.slab;
  return PROFILES[b.style] || PROFILES.slab;
}

