import {
  clamp,
  glide,
  hash,
  lerp,
  norm,
  mixRgb,
  rgbCss,
  smoothstep,
} from "./util";
import {
  BRIDGES,
  CFG,
  EVENTS,
  frameAt,
  HEROES,
  buildFill,
  paletteAt,
  profileFor,
  yearAt,
} from "./city";
import { GREETING, STOPS, sampleTour } from "./tour";

/**
 * /alpha — four hundred years of Manhattan, drawn to a canvas as you scroll.
 *
 * Ported from the standalone prototype. The whole engine lives inside this one
 * factory so every mount gets its own state and tears itself down cleanly:
 *
 *   const skyline = createSkyline({ canvas, spacer, yearEl, capEl, hintEl, hudEl });
 *   skyline.destroy();
 *
 * `spacer` is an empty element whose height *is* the length of the intro; the
 * canvas is fixed behind it, so the page scroll doubles as a timeline.
 */
export function createSkyline({
  canvas, spacer, contentSpacer, yearEl, capEl, hintEl, hudEl, linkEl,
}) {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // canvas setup
  // ---------------------------------------------------------------------------
  const ctx = canvas.getContext('2d', { alpha: false });

  let W = 0, H = 0, DPR = 1, isMobile = false;
  let baselineY = 0, EXAG = 1, finalSpan = 1;
  /* Where sea level actually lands on screen this frame. baselineY is only
     the layout constant the framing is derived from; everything drawn has to
     use this instead, or the city slides against a horizon that never moves. */
  let hz = 0;
  let WBOOST = 3;
  let lastW = 0, lastH = 0;
  let FILL = [];
  let tourScroll = 1;
  /**
   * When each blurb started writing, and whether any is still going.
   *
   * Scroll position alone cannot drive this. The reveal used to finish exactly
   * as the camera arrived, which sounds sufficient but leaves ~157px of scroll
   * where the text is fully opaque and still unfinished — and a reader can
   * simply stop there, leaving a blurb cut mid-word for good. Time is what
   * guarantees it finishes; scroll still drives it when scrolling is faster.
   */
  const writeAt = [];
  let writing = false;
  const WRITE_MS = 1100;
  const FADE_MS = 420;

  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Mobile browsers fire resize when the URL bar collapses. Ignore small
    // height-only changes so the scene does not jitter mid-scroll.
    if (w === lastW && Math.abs(h - lastH) < 130 && lastW !== 0) return;
    lastW = w; lastH = h;

    W = w; H = h;
    isMobile = w < CFG.mobileMaxW;
    DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2);

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    baselineY = H * CFG.baselineFrac;
    finalSpan = isMobile ? 0.86 : 1.0;

    // Vertical exaggeration is derived so the Empire State Building lands at a
    // consistent fraction of the viewport once the island is fully framed.
    EXAG = CFG.esbTargetFrac * H * CFG.islandFt * finalSpan / (1250 * W);

    WBOOST = clamp(CFG.widthBoostK * H * finalSpan / W, 2.0, 11);

    FILL = buildFill(isMobile ? CFG.fillCountMobile : CFG.fillCount);
    starfield = null;

    /* The tour is the second scroll region: enough travel per stop to move the
       camera and then hold still long enough to read what it points at. */
    tourScroll = Math.round(STOPS.length * H * 0.62);
    if (contentSpacer) contentSpacer.style.height = tourScroll + 'px';
  }

  // ---------------------------------------------------------------------------
  // camera
  // ---------------------------------------------------------------------------
  const cam = { cx: 0.1, span: 0.2, cyFt: 0, ppwx: 1, ppf: 1 };

  function setCamera(cx, span, cyFtOverride) {
    cam.cx = cx;
    cam.span = span;
    cam.ppwx = W / span;
    cam.ppf = cam.ppwx * EXAG / CFG.islandFt;
    cam.cyFt = (cyFtOverride === undefined)
      ? (baselineY - H / 2) / cam.ppf
      : cyFtOverride;
  }
  /**
   * Turn a stop into a shot. A stop names how tall its subject is and how much
   * of the frame it should fill; the span that achieves that depends on the
   * viewport, so it is worked out here rather than written down.
   *
   * Putting the subject's midpoint a little above centre is also what carries
   * sea level off the bottom of the frame — looking up at a tower you should
   * be seeing the tower, not the harbour behind it.
   */
  function framing(stop) {
    const wide = (W / finalSpan) * EXAG / CFG.islandFt;
    if (!stop.ft) {
      return { cx: stop.x, span: finalSpan, cyFt: (baselineY - H / 2) / wide };
    }
    const fill = stop.fill || 0.82;
    const ppf = (fill * H) / stop.ft;
    const span = clamp((W * EXAG) / (CFG.islandFt * ppf), 0.05, finalSpan);
    const cx = stop.x + (stop.bias || 0) * span;
    /* Solved rather than guessed: this is the camera height that puts sea
       level at 1.02 of the viewport — just past the bottom edge — whatever
       the subject's height and share of the frame. It leaves the top of the
       subject at (1.02 - fill) of the way down, so a taller fill also climbs
       higher up the frame instead of running off it. */
    return { cx, span, cyFt: (0.52 * stop.ft) / fill };
  }

  function sx(wx) { return W / 2 + (wx - cam.cx) * cam.ppwx; }
  function sy(ft) { return H / 2 - (ft - cam.cyFt) * cam.ppf; }

  function massPath(cxp, baseYp, wpx, hpx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = cxp + pts[i][0] * wpx;
      const py = baseYp - pts[i][1] * hpx;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // details drawn on top of the finished mass, only when there are pixels to spare
  function drawExtras(b, cxp, baseYp, wpx, hpx, base, pal, nightness) {
    const style = b.style;
    if (wpx < 7) return;
    const topY = baseYp - hpx;

    if (style === 'chrysler') {
      // radiating triangular windows in each arch of the crown
      ctx.save();
      ctx.strokeStyle = rgbCss(mixRgb(base, pal.rim, 0.55), 0.7);
      ctx.lineWidth = Math.max(0.6, wpx * 0.018);
      for (let a = 0; a < 6; a++) {
        const t = a / 6;
        const ay = baseYp - hpx * (0.775 + t * 0.16);
        const aw = wpx * 0.27 * Math.pow(1 - t, 1.45);
        ctx.beginPath();
        ctx.moveTo(cxp - aw, ay);
        ctx.quadraticCurveTo(cxp, ay - hpx * 0.045, cxp + aw, ay);
        ctx.stroke();
      }
      ctx.restore();
    } else if (style === 'woolworth') {
      // corner pinnacles flanking the cap
      ctx.fillStyle = rgbCss(base);
      for (let s = -1; s <= 1; s += 2) {
        const px = cxp + s * wpx * 0.30;
        const py = baseYp - hpx * 0.775;
        ctx.beginPath();
        ctx.moveTo(px - wpx * 0.035, py);
        ctx.lineTo(px, py - hpx * 0.09);
        ctx.lineTo(px + wpx * 0.035, py);
        ctx.closePath();
        ctx.fill();
      }
    } else if (style === 'p432') {
      // the open mechanical floors, which read as slots of sky
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let g = 1; g <= 5; g++) {
        const gy = topY + hpx * (1 - g * 0.163);
        ctx.fillRect(cxp - wpx / 2, gy, wpx, Math.max(1, hpx * 0.016));
      }
      ctx.restore();
    } else if (style === 'rock' || style === 'wtc') {
      // the vertical piers that give both their striped face
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - nightness);
      ctx.strokeStyle = rgbCss(mixRgb(base, pal.bd, 0.5));
      ctx.lineWidth = 0.7;
      const n = Math.floor(wpx / 4);
      for (let v = 1; v < n; v++) {
        const vx = cxp - wpx / 2 + (v / n) * wpx;
        ctx.beginPath(); ctx.moveTo(vx, topY + 2); ctx.lineTo(vx, baseYp); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // The single most recognisable thing on a New York roof.
  function drawWaterTower(cxp, baseYp, wpx, hpx, seed, base, pal) {
    const s = Math.min(wpx * 0.22, 13);
    if (s < 2.2) return;
    const ox = cxp + (hash(seed, 83) - 0.5) * wpx * 0.55;
    const topY = baseYp - hpx;
    const legH = s * 0.55, tankH = s * 1.05, tankW = s * 0.78;
    const col = mixRgb(base, pal.bd, 0.35);
    ctx.save();
    ctx.fillStyle = rgbCss(col);
    ctx.strokeStyle = rgbCss(col);
    ctx.lineWidth = Math.max(0.7, s * 0.10);
    ctx.beginPath();
    ctx.moveTo(ox - tankW * 0.38, topY); ctx.lineTo(ox - tankW * 0.30, topY - legH);
    ctx.moveTo(ox + tankW * 0.38, topY); ctx.lineTo(ox + tankW * 0.30, topY - legH);
    ctx.stroke();
    // tank, slightly tapered like the real cedar ones
    ctx.beginPath();
    ctx.moveTo(ox - tankW / 2, topY - legH);
    ctx.lineTo(ox + tankW / 2, topY - legH);
    ctx.lineTo(ox + tankW * 0.44, topY - legH - tankH);
    ctx.lineTo(ox - tankW * 0.44, topY - legH - tankH);
    ctx.closePath();
    ctx.fill();
    // conical cap
    ctx.beginPath();
    ctx.moveTo(ox - tankW * 0.52, topY - legH - tankH);
    ctx.lineTo(ox, topY - legH - tankH - s * 0.45);
    ctx.lineTo(ox + tankW * 0.52, topY - legH - tankH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRoofKit(b, cxp, baseYp, wpx, hpx, base, pal) {
    if (wpx < 8) return;
    const r = hash(b.seed || 7, 97);
    const prewar = b.built < 1965;
    if (prewar && (b.style === 'lowrise' || b.style === 'setback') && r < 0.62) {
      drawWaterTower(cxp, baseYp, wpx, hpx, b.seed || 7, base, pal);
    } else if (!prewar && wpx > 11 && r < 0.5) {
      // mechanical bulkhead
      const bw = wpx * (0.18 + r * 0.16), bh = Math.min(hpx * 0.05, bw * 0.9);
      ctx.fillStyle = rgbCss(mixRgb(base, pal.bd, 0.3));
      ctx.fillRect(cxp + (r - 0.5) * wpx * 0.5, baseYp - hpx - bh, bw, bh);
    }
  }

  // ---------------------------------------------------------------------------
  // drawing the skyline
  // ---------------------------------------------------------------------------
  let starfield = null;
  function drawStars(alpha) {
    if (alpha <= 0.01) return;
    if (!starfield) {
      starfield = [];
      for (let i = 0; i < 150; i++) {
        starfield.push([hash(i, 7) * W, hash(i, 13) * H * 0.7, 0.4 + hash(i, 19) * 1.1]);
      }
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#dfe6ff';
    for (let s = 0; s < starfield.length; s++) {
      const st = starfield[s];
      ctx.globalAlpha = alpha * (0.35 + hash(s, 23) * 0.65);
      ctx.fillRect(st[0], st[1], st[2], st[2]);
    }
    ctx.restore();
  }

  function drawSky(p, pal) {
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, rgbCss(pal.top));
    g.addColorStop(0.55, rgbCss(pal.mid));
    g.addColorStop(1, rgbCss(pal.hor));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hz + 2);

    // soft cloud bands, thickest around midday and sunset
    const cloud = smoothstep(0.10, 0.30, p) * (1 - smoothstep(0.80, 0.95, p));
    if (cloud > 0.02) {
      ctx.save();
      for (let c = 0; c < 7; c++) {
        const cy = hz * (0.14 + hash(c, 3) * 0.62);
        const cw = W * (0.16 + hash(c, 5) * 0.30);
        const cx2 = W * (hash(c, 7) * 1.2 - 0.1) + Math.sin(p * 2 + c) * W * 0.02;
        const ch = hz * (0.012 + hash(c, 11) * 0.022);
        ctx.globalAlpha = cloud * (0.10 + hash(c, 13) * 0.16);
        ctx.fillStyle = rgbCss(mixRgb(pal.mid, pal.hor, 0.6));
        ctx.beginPath();
        ctx.ellipse(cx2, cy, cw, ch, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx2 + cw * 0.35, cy - ch * 0.7, cw * 0.55, ch * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawStars(smoothstep(0.72, 0.9, p) * 0.9);

    // The viewer faces west, so the sun is behind them all morning and only
    // enters the frame in the afternoon, setting behind the island.
    const sunT = smoothstep(0.44, 0.76, p);
    if (sunT > 0 && sunT < 1) {
      const sxp = lerp(W * 0.64, W * 0.36, sunT);
      const syp = lerp(H * 0.10, hz - 2, Math.pow(sunT, 1.5));
      const r = Math.max(9, W * 0.014);
      const glow = ctx.createRadialGradient(sxp, syp, 0, sxp, syp, r * 7);
      glow.addColorStop(0, 'rgba(255,214,150,0.55)');
      glow.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, hz);
      ctx.beginPath();
      ctx.arc(sxp, syp, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,240,206,0.8)';
      ctx.fill();
    }

    const moonT = smoothstep(0.84, 0.95, p);
    if (moonT > 0) {
      ctx.save();
      ctx.globalAlpha = moonT * 0.85;
      ctx.beginPath();
      ctx.arc(W * 0.78, H * 0.14, Math.max(10, W * 0.016), 0, Math.PI * 2);
      ctx.fillStyle = '#e8eaf4';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawLand(year, pal) {
    // organic terrain that flattens as the grid is imposed
    const flat = smoothstep(1811, 1900, year);
    ctx.beginPath();
    ctx.moveTo(sx(-0.02), hz + 4);
    for (let i = 0; i <= 90; i++) {
      const wx = -0.02 + (1.04) * (i / 90);
      const hills = (Math.sin(wx * 41) * 0.5 + Math.sin(wx * 17 + 1.3) * 0.35 + Math.sin(wx * 73 + 2.1) * 0.15);
      const ft = lerp(78 + hills * 52, 46, flat);
      ctx.lineTo(sx(wx), sy(Math.max(4, ft)));
    }
    ctx.lineTo(sx(1.02), hz + 4);
    ctx.closePath();
    ctx.fillStyle = rgbCss(mixRgb(pal.bd, pal.bl, 0.28));
    ctx.fill();

    // forest before the city covers it
    const wild = 1 - smoothstep(1650, 1860, year);
    if (wild > 0.02) {
      ctx.save();
      ctx.globalAlpha = wild * 0.85;
      ctx.fillStyle = rgbCss(mixRgb(pal.bd, [40, 62, 40], 0.55));
      for (let t = 0; t < 130; t++) {
        const tx = hash(t, 3);
        const px = sx(tx);
        if (px < -20 || px > W + 20) continue;
        const th = (18 + hash(t, 5) * 26) * cam.ppf;
        const tw = Math.max(1.5, th * 0.7);
        const hills2 = (Math.sin(tx * 41) * 0.5 + Math.sin(tx * 17 + 1.3) * 0.35 + Math.sin(tx * 73 + 2.1) * 0.15);
        const groundFt = lerp(78 + hills2 * 52, 46, flat);
        ctx.beginPath();
        ctx.ellipse(px, sy(groundFt), tw, th, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // the 1811 grid, drawn faintly across land that has not been built on yet
    const grid = smoothstep(1811, 1830, year) * (1 - smoothstep(1900, 1960, year));
    if (grid > 0.02) {
      ctx.save();
      ctx.globalAlpha = grid * 0.22;
      ctx.strokeStyle = rgbCss(pal.rim);
      ctx.lineWidth = 1;
      for (let g = 0; g < 90; g++) {
        const gx = sx(0.06 + (g / 90) * 0.94);
        if (gx < 0 || gx > W) continue;
        ctx.beginPath();
        ctx.moveTo(gx, hz);
        ctx.lineTo(gx, sy(30));
        ctx.stroke();
      }
      ctx.restore();
    }

    // Central Park
    const park = smoothstep(1858, 1876, year);
    if (park > 0.02) {
      ctx.save();
      ctx.globalAlpha = park * 0.9;
      ctx.fillStyle = rgbCss(mixRgb(pal.bd, [46, 74, 48], lerp(0.7, 0.35, smoothstep(0.7, 0.9, curP))));
      const px0 = sx(0.575), px1 = sx(0.728);
      ctx.beginPath();
      ctx.moveTo(px0, hz);
      for (let k = 0; k <= 22; k++) {
        const f = k / 22;
        const bump = Math.sin(f * 9) * 0.3 + Math.sin(f * 21 + 1) * 0.2;
        ctx.lineTo(lerp(px0, px1, f), sy(34 + bump * 16));
      }
      ctx.lineTo(px1, hz);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function ageAlpha(b, year) {
    // returns {alpha, scale} for rise and demolition
    const growth = b.fill ? 3 : 2.5;
    if (year < b.built) return null;
    let rise = clamp((year - b.built) / growth, 0, 1);
    rise = 1 - Math.pow(1 - rise, 3);
    let a = 1;
    if (b.demo) {
      if (year > b.demo + 1.2) return null;
      if (year > b.demo) {
        const d = (year - b.demo) / 1.2;
        a = 1 - d;
        rise *= (1 - d * 0.75);
      }
    }
    return { rise: rise, alpha: a };
  }

  function drawWindows(cxp, baseYp, wpx, hpx, b, nightness, pal) {
    if (nightness < 0.04) return;
    if (wpx < CFG.windowMinPx) {
      // too small for a window grid, use a warm tint instead
      ctx.save();
      ctx.globalAlpha = nightness * 0.5;
      ctx.fillStyle = 'rgba(255,206,140,0.5)';
      ctx.fillRect(cxp - wpx / 2, baseYp - hpx, wpx, hpx);
      ctx.restore();
      return;
    }
    const cell = clamp(wpx / 20, 3.6, 46);
    const cols = Math.max(2, Math.floor(wpx / cell) - 1);
    const rows = Math.max(2, Math.floor(hpx / cell) - 1);
    const gx0 = cxp - (cols * cell) / 2;
    const lit = 0.09 + hash(b.seed || 1, 41) * 0.20;

    // only iterate the rows that are actually on screen
    const top = baseYp - hpx + 2;
    const rFrom = Math.max(0, Math.floor((-top) / cell));
    let rTo = Math.min(rows, Math.ceil((H - top) / cell));
    if (rTo - rFrom > 220) rTo = rFrom + 220;

    ctx.save();
    ctx.fillStyle = 'rgba(255,214,150,1)';
    for (let r = rFrom; r < rTo; r++) {
      const ry = top + r * cell;
      for (let c = 0; c < cols; c++) {
        const hv = hash((b.seed || 1) * 31 + c, r);
        if (hv > lit) continue;
        ctx.globalAlpha = nightness * (0.30 + hv * 1.1) * (1 - arrowDim * 0.62);
        ctx.fillRect(gx0 + c * cell, ry, cell * 0.55, cell * 0.6);
      }
    }
    ctx.restore();
  }

  let curP = 0;
  let arrowDim = 0;

  function drawBuilding(b, year, pal, nightness, opts) {
    const st = ageAlpha(b, year);
    if (!st) return;

    const wpx = b.w * WBOOST * cam.ppwx;
    const xpx = sx(b.x);
    if (xpx + wpx < -40 || xpx - wpx > W + 40) return;

    const hpx = b.ft * st.rise * cam.ppf;
    if (hpx < 0.4) return;

    const far = b.layer === 'far';
    const z = far ? 0.95 : (b.z === undefined ? 0.10 : b.z);

    // Blocks further into the island sit higher in frame and lose contrast to
    // haze. Those two cues together are what make the massing read as deep.
    const baseYp = sy(0) - z * H * 0.026;

    let base = mixRgb(pal.bd, pal.bl, b.fill ? 0.44 : 0.62);
    const tone = (hash((b.seed || 3) * 7, 53) - 0.5) * 0.52;
    base = mixRgb(base, tone > 0 ? pal.bl : pal.bd, Math.abs(tone));
    base = mixRgb(base, pal.hor, z * 0.22);

    const a = st.alpha * (opts && opts.alpha !== undefined ? opts.alpha : 1);
    const pw = Math.max(1, wpx);
    const pts = profileFor(b);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = rgbCss(base);
    massPath(xpx, baseYp, pw, hpx, pts);
    ctx.fill();

    // rim light on the sunward edge, clipped to the real silhouette
    if (wpx > 2.5) {
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = a * 0.5 * (1 - nightness * 0.7);
      const rg = ctx.createLinearGradient(xpx - pw / 2, 0, xpx + pw / 2, 0);
      rg.addColorStop(0, rgbCss(pal.rim, 0.0));
      rg.addColorStop(1, rgbCss(pal.rim, 0.45));
      ctx.fillStyle = rg;
      ctx.fillRect(xpx - pw, baseYp - hpx - 4, pw * 2, hpx + 8);
      ctx.restore();
    }

    if (!far && st.rise > 0.98) {
      ctx.save();
      massPath(xpx, baseYp, pw, hpx, pts);
      ctx.clip();
      drawWindows(xpx, baseYp, pw, hpx, b, nightness, pal);
      ctx.restore();
      drawExtras(b, xpx, baseYp, pw, hpx, base, pal, nightness);
      if (b.fill) drawRoofKit(b, xpx, baseYp, pw, hpx, base, pal);
    }

    // mast or spire
    if (b.spire && b.spire > b.ft && st.rise > 0.95) {
      const topY = baseYp - hpx;
      const tipY = baseYp - b.spire * st.rise * cam.ppf;
      ctx.strokeStyle = rgbCss(base);
      ctx.lineWidth = Math.max(1, wpx * 0.06);
      ctx.beginPath();
      ctx.moveTo(xpx, topY);
      ctx.lineTo(xpx, tipY);
      ctx.stroke();
      if (nightness > 0.3) {
        ctx.globalAlpha = a * nightness;
        ctx.fillStyle = '#ff6b5e';
        ctx.fillRect(xpx - 1, tipY - 2, 2, 2);
      }
    }
    ctx.restore();
  }

  function drawBridges(year, pal) {
    for (let i = 0; i < BRIDGES.length; i++) {
      const br = BRIDGES[i];
      if (year < br.built) continue;
      const t = clamp((year - br.built) / 4, 0, 1);
      const x0 = sx(br.x), x1 = sx(br.x + br.span * t);
      const span = x1 - x0;
      if (x1 < -40 || x0 > W + 40 || span < 3) continue;

      const deckY = sy(62);
      const topY = sy(br.h);
      const tA = lerp(x0, x1, 0.24), tB = lerp(x0, x1, 0.76);
      const col = mixRgb(pal.bd, pal.bl, 0.45);
      const thin = Math.max(0.6, span * 0.005);

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = rgbCss(col);
      ctx.fillStyle = rgbCss(col);
      ctx.lineCap = 'butt';

      if (br.type === 'cantilever') {
        // Queensboro carries no cables at all, it is a steel cantilever truss
        ctx.lineWidth = thin;
        ctx.beginPath();
        ctx.moveTo(x0, deckY);
        ctx.lineTo(tA, topY + (deckY - topY) * 0.35);
        ctx.lineTo(lerp(tA, tB, 0.5), deckY - (deckY - topY) * 0.30);
        ctx.lineTo(tB, topY + (deckY - topY) * 0.35);
        ctx.lineTo(x1, deckY);
        ctx.stroke();
        for (let d = 0; d <= 12; d++) {
          const dx = lerp(x0, x1, d / 12);
          const hump = Math.sin((d / 12) * Math.PI * 2) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.moveTo(dx, deckY);
          ctx.lineTo(dx, deckY - (deckY - topY) * (0.18 + hump * 0.22));
          ctx.stroke();
        }
      } else {
        // main cable and its suspenders
        ctx.lineWidth = Math.max(0.8, span * 0.007);
        ctx.beginPath();
        ctx.moveTo(x0, deckY);
        ctx.quadraticCurveTo(lerp(x0, tA, 0.55), topY + (deckY - topY) * 0.55, tA, topY);
        ctx.quadraticCurveTo(lerp(tA, tB, 0.5), deckY - (deckY - topY) * 0.10, tB, topY);
        ctx.quadraticCurveTo(lerp(tB, x1, 0.45), topY + (deckY - topY) * 0.55, x1, deckY);
        ctx.stroke();

        if (span > 40) {
          ctx.lineWidth = Math.max(0.4, span * 0.0022);
          ctx.globalAlpha = 0.5;
          for (let s = 1; s < 18; s++) {
            const f = s / 18;
            const hx = lerp(tA, tB, f);
            const sag = deckY - (deckY - topY) * (1 - Math.pow(2 * f - 1, 2)) * 0.9;
            ctx.beginPath(); ctx.moveTo(hx, deckY); ctx.lineTo(hx, sag); ctx.stroke();
          }
          // the Brooklyn Bridge's fan of diagonal stays
          if (br.type === 'stone') {
            for (let q = 1; q <= 7; q++) {
              const ff = q / 8;
              ctx.beginPath();
              ctx.moveTo(tA, topY + (deckY - topY) * 0.08);
              ctx.lineTo(lerp(tA, tB, ff * 0.45), deckY);
              ctx.moveTo(tB, topY + (deckY - topY) * 0.08);
              ctx.lineTo(lerp(tB, tA, ff * 0.45), deckY);
              ctx.stroke();
            }
          }
          ctx.globalAlpha = 0.92;
        }
      }

      // deck
      ctx.lineWidth = Math.max(1, span * 0.012);
      ctx.beginPath(); ctx.moveTo(x0, deckY); ctx.lineTo(x1, deckY); ctx.stroke();

      // Williamsburg carries a heavy stiffening truss above its deck
      if (br.type === 'trussed' && span > 30) {
        ctx.lineWidth = Math.max(0.5, span * 0.003);
        const th = (deckY - topY) * 0.16;
        ctx.beginPath();
        ctx.moveTo(x0, deckY - th); ctx.lineTo(x1, deckY - th);
        ctx.stroke();
        for (let z = 0; z < 24; z++) {
          const zx0 = lerp(x0, x1, z / 24), zx1 = lerp(x0, x1, (z + 1) / 24);
          ctx.beginPath();
          ctx.moveTo(zx0, z % 2 ? deckY : deckY - th);
          ctx.lineTo(zx1, z % 2 ? deckY - th : deckY);
          ctx.stroke();
        }
      }

      // towers
      if (br.type !== 'cantilever') {
        const tw = Math.max(1.4, span * 0.026);
        for (let k = 0; k < 2; k++) {
          const tx = k ? tB : tA;
          if (br.type === 'stone') {
            // masonry pier with two pointed gothic arches
            ctx.fillRect(tx - tw / 2, topY, tw, deckY - topY + 4);
            if (tw > 5) {
              ctx.save();
              ctx.globalCompositeOperation = 'destination-out';
              for (let arc = 0; arc < 2; arc++) {
                const ax = tx + (arc ? tw * 0.21 : -tw * 0.21);
                const aw = tw * 0.24;
                const ay = deckY - (deckY - topY) * 0.10;
                const ah = (deckY - topY) * 0.42;
                ctx.beginPath();
                ctx.moveTo(ax - aw / 2, ay);
                ctx.lineTo(ax - aw / 2, ay - ah * 0.55);
                ctx.quadraticCurveTo(ax, ay - ah * 1.25, ax + aw / 2, ay - ah * 0.55);
                ctx.lineTo(ax + aw / 2, ay);
                ctx.closePath();
                ctx.fill();
              }
              ctx.restore();
            }
          } else {
            // steel lattice tower
            ctx.lineWidth = Math.max(1, tw * 0.22);
            ctx.beginPath();
            ctx.moveTo(tx - tw / 2, deckY + 4); ctx.lineTo(tx - tw * 0.32, topY);
            ctx.moveTo(tx + tw / 2, deckY + 4); ctx.lineTo(tx + tw * 0.32, topY);
            ctx.stroke();
            if (tw > 5) {
              ctx.lineWidth = Math.max(0.4, tw * 0.1);
              for (let b2 = 0; b2 < 7; b2++) {
                const by0 = lerp(deckY, topY, b2 / 7), by1 = lerp(deckY, topY, (b2 + 1) / 7);
                ctx.beginPath();
                ctx.moveTo(tx - tw * 0.44, by0); ctx.lineTo(tx + tw * 0.44, by1);
                ctx.moveTo(tx + tw * 0.44, by0); ctx.lineTo(tx - tw * 0.44, by1);
                ctx.moveTo(tx - tw * 0.46, by0); ctx.lineTo(tx + tw * 0.46, by0);
                ctx.stroke();
              }
            }
          }
        }
      }
      ctx.restore();
    }
  }

  function drawWater(p, pal, year, nightness) {
    if (hz >= H) return; // looking up: the water is off the bottom of the frame
    const g = ctx.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, rgbCss(pal.wat));
    g.addColorStop(1, rgbCss(mixRgb(pal.wat, [0, 0, 0], 0.45)));
    ctx.fillStyle = g;
    ctx.fillRect(0, hz, W, H - hz);

    // Reflection: only the waterfront rank reflects, and it breaks up fast.
    // A full mirrored redraw is not worth the frame budget here.
    const depth = H - hz;
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = rgbCss(mixRgb(pal.bd, pal.wat, 0.45));
    for (let i = 0; i < FILL.length; i++) {
      const b = FILL[i];
      if ((b.z === undefined ? 0 : b.z) > 0.35) continue;
      const st = ageAlpha(b, year);
      if (!st) continue;
      const xpx = sx(b.x), wpx = b.w * WBOOST * cam.ppwx;
      if (xpx < -20 || xpx > W + 20 || wpx < 1) continue;
      const hpx = Math.min(b.ft * st.rise * cam.ppf * 0.14, depth * 0.42);
      ctx.fillRect(xpx - wpx / 2, hz, Math.max(1, wpx), hpx);
    }
    ctx.restore();

    // broken horizontal chop, densest near the far shore
    ctx.save();
    ctx.strokeStyle = rgbCss(pal.rim);
    ctx.lineWidth = 1;
    for (let r = 0; r < 46; r++) {
      const f = Math.pow(r / 46, 1.9);
      const y = hz + 2 + f * depth;
      ctx.globalAlpha = (0.17 + nightness * 0.08) * (1 - f * 0.5);
      const len = W * (0.03 + hash(r, 11) * 0.14) * (0.5 + f);
      const x0 = W * hash(r, 9);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + len, y);
      ctx.stroke();
    }
    ctx.restore();

    drawPiers(year, pal);
    drawBoats(year, pal);
  }

  // hull with a bit of sheer, drawn once and reused by every vessel
  function hull(bx, by, s, bowRight, sheer) {
    const d = bowRight ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(bx - d * s, by - s * (sheer ? 0.16 : 0.06));
    ctx.quadraticCurveTo(bx, by - s * 0.04, bx + d * s * 1.05, by - s * (sheer ? 0.20 : 0.08));
    ctx.lineTo(bx + d * s * 0.86, by + s * 0.26);
    ctx.lineTo(bx - d * s * 0.82, by + s * 0.26);
    ctx.closePath();
    ctx.fill();
  }

  // Finger piers ran the length of the East River waterfront from the early
  // 1800s until containerisation emptied them out.
  function drawPiers(year, pal) {
    const life = smoothstep(1820, 1870, year) * (1 - smoothstep(1965, 2005, year) * 0.8);
    if (life < 0.03) return;
    const depth = (H - hz) * 0.045;
    ctx.save();
    ctx.globalAlpha = life;
    ctx.fillStyle = rgbCss(mixRgb(pal.bd, pal.wat, 0.3));
    for (let i = 0; i < 26; i++) {
      const wx = 0.008 + (i / 26) * 0.70;
      const px = sx(wx);
      const pw = Math.max(1.5, 0.0034 * cam.ppwx);
      if (px < -20 || px > W + 20) continue;
      const d = depth * (0.6 + hash(i, 29) * 0.8);
      ctx.fillRect(px - pw / 2, hz - 1, pw, d);
      // the shed that sat on most of them
      if (pw > 3 && hash(i, 31) < 0.7) {
        ctx.fillRect(px - pw * 0.8, hz - Math.min(d * 0.5, 8) - 1, pw * 1.6, Math.min(d * 0.5, 8));
      }
    }
    ctx.restore();
  }

  function drawBoats(year, pal) {
    const col = mixRgb(pal.bd, pal.wat, 0.18);
    ctx.save();
    ctx.fillStyle = rgbCss(col);
    ctx.strokeStyle = rgbCss(col);

    for (let i = 0; i < 3; i++) {
      const seedR = hash(i, 5);
      const dir = seedR < 0.5 ? 1 : -1;
      const t = (((year * 0.0035) + i * 0.37) % 1);
      const bx = W * (dir > 0 ? t : 1 - t);
      const by = hz + (H - hz) * (0.14 + i * 0.17);
      const s = (H - hz) * (0.036 + i * 0.015);
      if (s < 2) continue;
      ctx.lineWidth = Math.max(0.5, s * 0.055);

      if (year < 1810) {
        // sloop, single mast with a gaff rig
        hull(bx, by, s * 0.75, dir > 0, true);
        ctx.beginPath();
        ctx.moveTo(bx, by - s * 0.2); ctx.lineTo(bx, by - s * 2.0); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by - s * 1.9);
        ctx.lineTo(bx + dir * s * 0.75, by - s * 0.25);
        ctx.lineTo(bx, by - s * 0.25);
        ctx.closePath(); ctx.fill();
      } else if (year < 1885) {
        // full rigged ship, three masts with yards
        hull(bx, by, s, dir > 0, true);
        for (let m = -1; m <= 1; m++) {
          const mx = bx + m * s * 0.55;
          const mh = s * (2.1 - Math.abs(m) * 0.4);
          ctx.beginPath();
          ctx.moveTo(mx, by - s * 0.15); ctx.lineTo(mx, by - mh); ctx.stroke();
          for (let yd = 1; yd <= 3; yd++) {
            const yy = by - mh * (0.34 + yd * 0.19);
            const yw = s * 0.42 * (1 - yd * 0.18);
            ctx.beginPath(); ctx.moveTo(mx - yw, yy); ctx.lineTo(mx + yw, yy); ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.moveTo(bx + dir * s, by - s * 0.2);
        ctx.lineTo(bx + dir * s * 1.6, by - s * 0.5);
        ctx.stroke();
      } else if (year < 1950) {
        // steamer, long hull with a tall funnel and two pole masts
        hull(bx, by, s * 1.25, dir > 0, false);
        ctx.fillRect(bx - s * 0.55, by - s * 0.62, s * 1.1, s * 0.46);
        ctx.fillRect(bx - s * 0.12, by - s * 1.35, s * 0.3, s * 0.78);
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.9, by - s * 0.2); ctx.lineTo(bx - s * 0.9, by - s * 1.5);
        ctx.moveTo(bx + s * 0.85, by - s * 0.2); ctx.lineTo(bx + s * 0.85, by - s * 1.5);
        ctx.stroke();
      } else if (i === 1) {
        // barge under tow, low and flat
        ctx.fillRect(bx - s * 1.5, by - s * 0.28, s * 3, s * 0.5);
        ctx.fillRect(bx - s * 1.2, by - s * 0.62, s * 0.7, s * 0.36);
      } else {
        // tug: low hull, wheelhouse forward, stack aft
        hull(bx, by, s * 0.8, dir > 0, false);
        ctx.fillRect(bx - dir * s * 0.05, by - s * 0.78, s * 0.42, s * 0.62);
        ctx.fillRect(bx - dir * s * 0.02, by - s * 1.02, s * 0.3, s * 0.26);
        ctx.fillRect(bx - dir * s * 0.55, by - s * 0.95, s * 0.2, s * 0.8);
        ctx.beginPath();
        ctx.moveTo(bx + dir * s * 0.6, by - s * 0.18);
        ctx.lineTo(bx + dir * s * 0.6, by - s * 1.1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawTribute(year, nightness) {
    // Two quiet beams where the towers stood. No event, no collapse.
    const t = smoothstep(2001, 2003, year) * (1 - smoothstep(2006, 2012, year));
    if (t <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = t * 0.28;
    const xs = [sx(0.038), sx(0.046)];
    for (let i = 0; i < 2; i++) {
      const g = ctx.createLinearGradient(0, sy(0), 0, 0);
      g.addColorStop(0, 'rgba(190,215,255,0.55)');
      g.addColorStop(1, 'rgba(190,215,255,0)');
      ctx.fillStyle = g;
      const w = Math.max(2, 0.005 * cam.ppwx);
      ctx.fillRect(xs[i] - w / 2, 0, w, sy(0));
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // LOD A: the full scene
  // ---------------------------------------------------------------------------
  function drawScene(p, year, alpha) {
    const pal = paletteAt(p);
    const nightness = smoothstep(0.66, 0.88, p);

    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;

    drawSky(p, pal);

    // far layer
    drawFarRidge(pal);
    for (let i = 0; i < HEROES.length; i++) {
      if (HEROES[i].layer === 'far') drawBuilding(HEROES[i], year, pal, nightness);
    }

    drawLand(year, pal);

    // spine: fill then heroes so landmarks read on top
    for (let f = 0; f < FILL.length; f++) drawBuilding(FILL[f], year, pal, nightness);
    for (let h = 0; h < HEROES.length; h++) {
      if (HEROES[h].layer !== 'far') drawBuilding(HEROES[h], year, pal, nightness);
    }

    // One gradient for the whole city rather than one per building: darkens the
    // street-level canyons and lets the towers read as standing above them.
    const ambH = H * 0.16;
    const ag = ctx.createLinearGradient(0, sy(0) - ambH, 0, sy(0));
    ag.addColorStop(0, rgbCss(pal.bd, 0));
    ag.addColorStop(1, rgbCss(pal.bd, 0.42 * (1 - nightness * 0.5)));
    ctx.fillStyle = ag;
    ctx.fillRect(0, sy(0) - ambH, W, ambH);

    // the pale band of air that always sits along a distant horizon
    const hg = ctx.createLinearGradient(0, sy(0) - H * 0.075, 0, sy(0));
    hg.addColorStop(0, rgbCss(pal.hor, 0));
    hg.addColorStop(1, rgbCss(pal.hor, 0.30));
    ctx.fillStyle = hg;
    ctx.fillRect(0, sy(0) - H * 0.075, W, H * 0.075);

    drawTribute(year, nightness);
    drawBridges(year, pal);
    drawWater(p, pal, year, nightness);

    ctx.restore();
    return { pal: pal, nightness: nightness };
  }

  function drawFarRidge(pal) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = rgbCss(mixRgb(pal.hor, pal.bd, 0.30));
    ctx.beginPath();
    ctx.moveTo(0, hz);
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * W;
      const y = sy(70 + Math.sin(i * 0.7) * 22 + Math.sin(i * 1.9) * 12) - H * 0.03;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, hz);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // the arrow moment
  // ---------------------------------------------------------------------------
  const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
  const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

  /** the hand-drawn line both the greeting and the contact button point with */
  function scribble(fromX, fromY, toX, toY, t, arc) {
    ctx.beginPath();
    const steps = 30;
    const drawTo = Math.floor(steps * clamp(t * 1.3, 0, 1));
    const span = Math.hypot(toX - fromX, toY - fromY);
    for (let i = 0; i <= drawTo; i++) {
      const f = i / steps;
      const px = lerp(fromX, toX, f) + Math.sin(f * 7.3) * 3;
      const py = lerp(fromY, toY, f) + Math.sin(f * 5.1 + 1.2) * 3.2
        - Math.sin(f * Math.PI) * span * arc;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  /** a rounded outline, since canvas has no dependable roundRect here */
  function pill(x, y, w, h) {
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * The last frame of the timelapse: one lit window on the east face of the
   * Empire State, an arrow drawn to it by hand, and his name. This is the
   * only annotation on the page still tied to a particular window — the rest
   * of the copy sits in the frame rather than pointing into it.
   */
  function drawGreeting(t) {
    if (t <= 0) return;
    const tx = sx(GREETING.x), ty = sy(GREETING.ft);
    const wsz = Math.max(5, 0.0009 * cam.ppwx);

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,214,150,1)';
    ctx.shadowColor = 'rgba(255,190,120,0.9)';
    ctx.shadowBlur = 26;
    ctx.fillRect(tx - wsz / 2, ty - wsz * 0.7, wsz, wsz * 1.4);
    ctx.restore();

    const len = Math.min(W * 0.3, 170);
    const side = tx > W * 0.55 ? -1 : 1;
    const ax = tx + side * len * 0.9;
    const ay = ty - len * 0.62;

    ctx.save();
    ctx.globalAlpha = t;
    ctx.strokeStyle = 'rgba(255,240,220,0.92)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    scribble(ax, ay, tx + side * wsz, ty - wsz * 0.4, t, 0.16);

    if (t > 0.7) {
      ctx.globalAlpha = (t - 0.7) / 0.3;
      ctx.beginPath();
      ctx.moveTo(tx + side * wsz * 2.4, ty - wsz * 2.6);
      ctx.lineTo(tx + side * wsz, ty - wsz * 0.4);
      ctx.lineTo(tx + side * wsz * 3.6, ty - wsz * 0.2);
      ctx.stroke();

      const px = Math.max(19, Math.min(30, W * 0.05));
      ctx.font = `italic ${px}px ${HAND}`;
      ctx.fillStyle = 'rgba(255,240,220,0.96)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.textAlign = 'left';
      const label = 'Hi, I\u2019m Brandon';
      const lw = ctx.measureText(label).width;
      ctx.fillText(label, clamp(side > 0 ? ax + 6 : ax - lw - 6, 12, Math.max(12, W - lw - 12)), ay - 4);
    }
    ctx.restore();
  }

  /**
   * A stop's blurb. The title is in the hand that introduced him, the body in
   * the page's serif, and both are written out a character at a time as the
   * camera arrives — so the words look like they are being put down rather
   * than switched on.
   *
   * Where they sit is the stop's business, not this function's: every stop
   * names its own corner, so the copy never settles into one caption slot.
   * There is no panel behind them, only a shadow, which is what the year in
   * the corner has always used to stay legible over a lit skyline.
   *
   * Returns the box around the link line, so the one real anchor can find it.
   */
  function drawBlurb(stop, t, written) {
    if (t <= 0) return null;

    const tpx = Math.max(20, Math.min(32, W * 0.029));
    const bpx = Math.max(15, Math.min(20, W * 0.0168));
    /* On a wide frame the words take a column beside the subject; on a phone
       there is no beside, so they take the width and the clamp below pins
       them to the left margin on its own. */
    const maxW = W < 700 ? Math.min(W - 44, 420) : Math.min(W * 0.42, 460);
    const x = clamp(stop.ax * W, 22, Math.max(22, W - maxW - 22));

    const wrap = (text, font) => {
      ctx.font = font;
      const out = [];
      let cur = '';
      for (const word of text.split(' ')) {
        const next = cur ? `${cur} ${word}` : word;
        if (cur && ctx.measureText(next).width > maxW) {
          out.push(cur);
          cur = word;
        } else {
          cur = next;
        }
      }
      if (cur) out.push(cur);
      return out;
    };

    const body = [];
    for (const line of stop.lines) {
      for (const piece of wrap(line.text, `${bpx}px ${SERIF}`)) {
        body.push({ ...line, text: piece });
      }
    }

    /* One budget of characters spent across the whole blurb, title first, so
       the reveal reads as one hand moving rather than several. */
    const total = (stop.title ? stop.title.length : 0)
      + body.reduce((n, l) => n + l.text.length, 0);
    let budget = Math.ceil(clamp(written, 0, 1) * total);

    /* Every bullet opens with an emoji, which is two UTF-16 units. Cutting
       between them mid-write would paint half a surrogate pair, so the cut
       steps over the pair rather than through it. */
    const upto = (text, n) => {
      if (n >= text.length) return text;
      if (n <= 0) return '';
      const c = text.charCodeAt(n - 1);
      return text.slice(0, c >= 0xd800 && c <= 0xdbff ? n + 1 : n);
    };

    ctx.save();
    ctx.globalAlpha = t;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
    ctx.shadowBlur = 14;

    let y = clamp(stop.ay * H, tpx * 1.4, H - 40);

    if (stop.title) {
      ctx.font = `italic ${tpx}px ${HAND}`;
      ctx.fillStyle = 'rgba(255, 240, 220, 0.96)';
      ctx.fillText(upto(stop.title, budget), x, y);
      budget -= stop.title.length;
      y += tpx * 1.55;
    }

    let box = null;
    for (const line of body) {
      if (budget <= 0) break;
      const shown = upto(line.text, budget);
      budget -= line.text.length;

      ctx.font = `${bpx}px ${SERIF}`;
      ctx.fillStyle = line.dim ? 'rgba(226, 216, 200, 0.66)' : 'rgba(247, 241, 230, 0.97)';
      ctx.fillText(shown, x, y);

      if (line.link && shown.length === line.text.length) {
        const w = ctx.measureText(line.text).width;
        ctx.fillStyle = 'rgba(239, 230, 214, 0.45)';
        ctx.fillRect(x, Math.round(y + bpx * 0.3), w, 1);
        box = { x, y: y - bpx, w, h: bpx * 1.5, href: line.href };
      }
      y += bpx * 1.62;
    }

    /* The contact stop ends on something to press rather than something to
       read, so it gets a drawn button and an arrow reaching down to it. The
       real anchor is parked on the box this returns. */
    if (stop.button && written > 0.92) {
      const bt = clamp((written - 0.92) / 0.08, 0, 1);
      const bpad = bpx * 1.15;
      ctx.font = `${bpx}px ${SERIF}`;
      const lw = ctx.measureText(stop.button.label).width;
      const bw = lw + bpad * 2;
      const bh = bpx * 2.6;
      const bxp = x + 34;
      const byp = y + bpx * 1.1;

      ctx.globalAlpha = t * bt;
      ctx.strokeStyle = 'rgba(255,240,220,0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      scribble(x + 6, y - bpx * 0.3, bxp + bw * 0.28, byp - 7, bt, -0.22);

      if (bt > 0.55) {
        ctx.globalAlpha = t * ((bt - 0.55) / 0.45);
        ctx.beginPath();
        ctx.moveTo(bxp + bw * 0.28 - 9, byp - 17);
        ctx.lineTo(bxp + bw * 0.28, byp - 6);
        ctx.lineTo(bxp + bw * 0.28 + 10, byp - 15);
        ctx.stroke();

        ctx.globalAlpha = t * ((bt - 0.55) / 0.45);
        ctx.strokeStyle = 'rgba(239,230,214,0.55)';
        ctx.lineWidth = 1;
        pill(bxp, byp, bw, bh);
        ctx.stroke();
        ctx.fillStyle = 'rgba(247,241,230,0.97)';
        ctx.fillText(stop.button.label, bxp + bpad, byp + bh * 0.66);
        box = { x: bxp, y: byp, w: bw, h: bh, href: stop.button.href };
      }
    }

    ctx.restore();
    return box;
  }

  // ---------------------------------------------------------------------------
  // captions
  // ---------------------------------------------------------------------------
  const allCaptions = [];
  (function () {
    HEROES.forEach(function (b) {
      if (b.cap) allCaptions.push({ year: b.built, text: b.cap });
      if (b.bye && b.demo) allCaptions.push({ year: b.demo, text: b.bye });
    });
    EVENTS.forEach(function (e) { allCaptions.push({ year: e.year, text: e.text }); });
    allCaptions.sort(function (a, b) { return a.year - b.year; });
  })();

  let shownCaption = '';
  function updateCaption(year, override) {
    if (override !== undefined && override !== null) {
      if (override !== shownCaption) {
        shownCaption = override;
        capEl.textContent = override;
      }
      capEl.style.opacity = '1';
      return;
    }
    // null once the tour starts — the city has nothing left to annotate
    let best = null;
    for (let i = 0; year !== null && i < allCaptions.length; i++) {
      const c = allCaptions[i];
      if (year >= c.year && year - c.year < 6) best = c;
    }
    const text = best ? best.text : '';
    if (text !== shownCaption) {
      shownCaption = text;
      capEl.textContent = text;
    }
    capEl.style.opacity = text ? '1' : '0';
  }

  // ---------------------------------------------------------------------------
  // main loop
  // ---------------------------------------------------------------------------
  let target = 0, current = 0, ticking = false;
  let contentOffset = 0;
  let rafId = 0, stopped = false;

  function readScroll() {
    const max = spacer.offsetHeight;
    target = max > 0 ? clamp(window.pageYOffset / max, 0, 1) : 0;
    // Reading is not smoothed the way the film is — a lag between the wheel
    // and the words would feel like a fault rather than like camerawork.
    contentOffset = Math.max(0, window.pageYOffset - max);
  }

  let lastRendered = -1, lastContent = -1;
  function frame() {
    if (stopped) return;
    if (reduceMotion) {
      current = target;
    } else {
      // cap the per-frame step so an anchor jump does not fast forward 400 years
      const step = clamp((target - current) * CFG.smoothing, -0.05, 0.05);
      current += step;
      if (Math.abs(target - current) < 0.0003) current = target;
    }
    // either clock moving is reason to redraw: past the fly-in the film is
    // parked at 1 and only the reading position changes
    // a blurb still being written is reason to redraw even when nothing moved
    if (current !== lastRendered || contentOffset !== lastContent || writing) {
      render(current, contentOffset);
      lastRendered = current;
      lastContent = contentOffset;
    }
    rafId = requestAnimationFrame(frame);
  }

  function render(p, offset) {
    curP = p;
    const year = yearAt(p);

    // stage 1 and 2: framing follows development, then eases into midtown
    const fr = frameAt(year);
    const wideSpan = Math.min(finalSpan, fr.x1 - fr.x0);
    let wideCx = fr.x0 + wideSpan / 2;
    if (fr.x1 - fr.x0 > finalSpan) wideCx = finalSpan / 2;

    /* The film settles onto the whole finished island and stops there. The
       tour takes over from that exact framing, so handing over costs no
       movement at all — the reader simply starts steering. */
    const rest = framing(STOPS[0]);
    const settle = glide(norm(0.86, 1.0, p));

    // q is the tour, and it only starts once the film has run out
    const q = tourScroll > 0 ? clamp(offset / tourScroll, 0, 1) : 0;
    const touring = offset > 0;
    const tour = sampleTour(q);

    let cx, span, cyFt;
    if (touring) {
      const a = framing(STOPS[tour.from]);
      const b = framing(STOPS[tour.index]);
      cx = lerp(a.cx, b.cx, tour.move);
      span = lerp(a.span, b.span, tour.move);
      cyFt = lerp(a.cyFt, b.cyFt, tour.move);
    } else {
      cx = lerp(wideCx, rest.cx, settle);
      span = lerp(wideSpan, rest.span, settle);
      cyFt = lerp((baselineY - H / 2) / (W / wideSpan * EXAG / CFG.islandFt), rest.cyFt, settle);
    }
    setCamera(cx, span, cyFt);
    hz = sy(0);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = rgbCss([6, 9, 26]);
    ctx.fillRect(0, 0, W, H);

    /* Notes dim the city's own lit windows while they are up, so the writing
       is never competing with the thing it is written on. */
    /* Only the arrow dims the city's own windows, so the one lit window it
       points at stands out. The blurbs sit in open sky and need no help. */
    arrowDim = smoothstep(0.86, 0.985, p) * (touring ? tour.greet : 1) * 0.62;

    drawScene(p, year, 1);

    /* The arrow is the film's last frame and the tour's first. It is drawn by
       the timelapse's own progress and then held while the opening lines are
       written beneath it, leaving only when the camera does. */
    const greet = smoothstep(0.86, 0.985, p) * (touring ? tour.greet : 1);
    if (greet > 0.01) drawGreeting(greet);

    let linkBox = null;
    writing = false;
    if (touring) {
      const now = performance.now();
      for (let i = 0; i < STOPS.length; i++) {
        if (tour.rise[i] <= 0.001 || tour.fall[i] >= 1) {
          writeAt[i] = null; // reset, so replaying writes it out again
          continue;
        }
        if (writeAt[i] == null) writeAt[i] = now;
        const held = now - writeAt[i];

        /* Both the fade and the writing are pulled along by scroll or by the
           clock, whichever is further on. Scroll alone left the reader able
           to stop on a blurb that was faint, half-written, or both, and stay
           there. Only the fade *in* is hurried: leaving is the camera's. */
        const a = Math.max(tour.rise[i], clamp(held / FADE_MS, 0, 1)) * (1 - tour.fall[i]);
        const written = Math.max(tour.written[i], held / WRITE_MS);
        if (a < 1 - tour.fall[i] || written < 1) writing = true;

        const box = drawBlurb(STOPS[i], a, written);
        if (box && a > 0.6) linkBox = box;
      }
    }

    // chrome
    yearEl.textContent = String(touring ? 2026 : Math.round(year));
    // the caption slot keeps its job, naming whatever the camera is looking at
    updateCaption(touring ? null : year, touring ? tour.subject : null);
    hudEl.style.opacity = '1';
    // the hint comes back when the music stops, because the film ending is not
    // the page ending and nothing else says so
    const handover = p > 0.99 && offset < 40 ? 1 : 0;
    hintEl.style.opacity = String(
      Math.max(1 - smoothstep(0.005, 0.05, p), handover)
    );

    placeLink(linkBox);
  }

  /* Everything else here is paint, but a contact link has to be clickable, so
     one real anchor is parked on top of the drawn word. */
  function placeLink(box) {
    if (!linkEl) return;
    if (!box) {
      linkEl.style.display = 'none';
      return;
    }
    if (box.href) linkEl.href = box.href;
    linkEl.style.display = 'block';
    linkEl.style.left = Math.round(box.x) + 'px';
    linkEl.style.top = Math.round(box.y) + 'px';
    linkEl.style.width = Math.round(box.w) + 'px';
    linkEl.style.height = Math.round(box.h) + 'px';
  }

  // ---------------------------------------------------------------------------
  // wiring
  // ---------------------------------------------------------------------------
  const listeners = [];
  function on(node, type, fn, opts) {
    node.addEventListener(type, fn, opts);
    listeners.push([node, type, fn, opts]);
  }

  on(window, 'scroll', function () {
    readScroll();
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; }); }
  }, { passive: true });

  let resizeTimer, orientTimer;
  on(window, 'resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(); readScroll(); }, 120);
  }, { passive: true });
  // iOS reports the old dimensions until a beat after the rotation lands
  on(window, 'orientationchange', function () {
    clearTimeout(orientTimer);
    orientTimer = setTimeout(function () { lastW = 0; layout(); readScroll(); }, 250);
  });

  layout();
  readScroll();

  // dev helper: ?p=0.62 jumps straight to a progress value
  const jump = /[?&]p=([\d.]+)/.exec(location.search);
  if (jump) {
    window.scrollTo(0, spacer.offsetHeight * clamp(parseFloat(jump[1]), 0, 1));
    readScroll();
    current = target;
  }

  rafId = requestAnimationFrame(frame);

  return {
    destroy: function () {
      stopped = true;
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      clearTimeout(orientTimer);
      for (let i = 0; i < listeners.length; i++) {
        listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]);
      }
      listeners.length = 0;
    }
  };
}

