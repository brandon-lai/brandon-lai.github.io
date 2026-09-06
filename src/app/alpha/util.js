/**
 * Maths and colour helpers shared by the /alpha skyline. All pure — nothing in
 * here touches the DOM, so it is safe to import during the server render.
 */

export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
export function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

// deterministic hash based PRNG, keyed on integers so nothing shimmers on scroll
export function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function mulberry(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
export function mixRgb(a, b, t) {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}
export function rgbCss(c, alpha) {
  return alpha === undefined
    ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
    : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson) through (xs, ys).
 *
 * Linear interpolation between keyframes is continuous in value but not in
 * slope, so anything it drives changes speed abruptly at every knot — which
 * reads as a stutter when the thing being driven is motion. This keeps the
 * first derivative continuous while guaranteeing the curve never overshoots a
 * knot or doubles back, so a timeline built on it can still only run forwards.
 */
export function monotoneSpline(xs, ys) {
  const n = xs.length;
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    slope.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }

  // start with a plain average of the neighbouring slopes at each interior knot
  const m = [slope[0]];
  for (let i = 1; i < n - 1; i++) m.push((slope[i - 1] + slope[i]) / 2);
  m.push(slope[n - 2]);

  // then pull the tangents back inside the circle of radius 3 that guarantees
  // monotonicity, and flatten them either side of any level segment
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }

  return function (x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    // Hermite basis
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

// piecewise interpolation over an array of {at: number, ...} keyframes
export function keyframe(stops, at, apply) {
  if (at <= stops[0].at) return apply(stops[0], stops[0], 0);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (at <= b.at) {
      const t = (at - a.at) / (b.at - a.at);
      return apply(a, b, t);
    }
  }
  const last = stops[stops.length - 1];
  return apply(last, last, 0);
}
