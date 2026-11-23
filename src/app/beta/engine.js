import { BLOCKS, TIMELINE, INTRO, PACE } from "./blocks";

/**
 * The choreography. Everything on screen is a pure function of one number,
 * T (how far down the track you are, in % of a viewport), so scrolling back
 * up plays every act in reverse and nothing can drift out of sync.
 *
 *   createAssembler(root) → { destroy }
 *
 * World space is the grid's own coordinate frame (px from the top-left of
 * .asm-world); the camera pans it under a pinned stage and, at the end,
 * pulls back to show the finished page. Background and foreground cube
 * layers move at their own depth against that camera.
 */

/** the fastest the timeline plays, in units per second (100 units ≈ one act's worth) */
const MAX_RATE = 110;

/** how far ahead of a block's act (in % of a viewport of scroll) its heavy content loads */
const NEAR = 60;

/* ---- easing and small math ------------------------------------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (t) => t * t * (3 - 2 * t);
const back = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const bounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const f1 = (n) => n.toFixed(1);

/** a number ticking up toward its data-count, in the format it renders with */
function setCount(el, k) {
  const dec = +(el.dataset.dec || 0);
  const v = (+el.dataset.count * k).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (el.textContent !== v) el.textContent = v;
}

/* ---- helpers (the little builders) ------------------------------------ */
function makeBot(el) {
  const part = (p) => el.querySelector(`[data-p="${p}"]`);
  const joints = [
    ["body", part("body"), 0, -2],
    ["legL", part("legL"), -4, -16],
    ["legR", part("legR"), 4, -16],
    ["armL", part("armL"), -7, -27],
    ["armR", part("armR"), 7, -27],
  ];
  const cache = {};
  const put = (key, fn, v) => {
    if (cache[key] !== v) {
      cache[key] = v;
      fn(v);
    }
  };
  const flag = (name, on) => put(name, (v) => el.classList.toggle(name, v), !!on);
  return {
    hide() {
      put("vis", (v) => (el.style.visibility = v), "hidden");
    },
    pose(p, sc) {
      put("vis", (v) => (el.style.visibility = v), "visible");
      const s = sc * (p.s ?? 1);
      const tr = `translate3d(${f1(p.x - 24)}px,${f1(p.y - 66)}px,0) scale(${((p.face ?? 1) * s).toFixed(3)},${s.toFixed(3)})`;
      put("tr", (v) => (el.style.transform = v), tr);
      const ang = { body: p.lean ?? 0, legL: p.legL ?? 0, legR: p.legR ?? 0, armL: p.armL ?? 0, armR: p.armR ?? 0 };
      for (const [k, node, cx, cy] of joints) {
        put(k, (v) => node.setAttribute("transform", v), `rotate(${f1(ang[k])} ${cx} ${cy})`);
      }
      flag("is-sitting", p.sit);
      flag("is-cheer", p.cheer);
      flag("has-laptop", p.laptop);
      flag("is-flying", p.fly);
      flag("is-riding", p.ride);
    },
  };
}

function walkPose(phase, amp = 1) {
  const s = Math.sin(phase);
  return {
    legL: s * 30 * amp,
    legR: -s * 30 * amp,
    armL: -s * 22 * amp,
    armR: s * 22 * amp,
    bob: -Math.abs(Math.cos(phase)) * 2.4 * amp,
  };
}

function hopPose(from, to, q, height = 60) {
  if (q >= 1) return to;
  return {
    ...to,
    x: lerp(from.x, to.x, q),
    y: lerp(from.y, to.y, q) - Math.sin(Math.PI * q) * height,
    face: to.x >= from.x ? 1 : -1,
    sit: false,
    armL: 140,
    armR: -140,
    legL: -24,
    legR: 24,
    laptop: false,
    fly: from.fly,
  };
}

/* ---- tiny DOM helpers ------------------------------------------------- */
const show = (el, on) => {
  if (!el) return;
  const v = on ? "visible" : "hidden";
  if (el.style.visibility !== v) el.style.visibility = v;
};
function tileStyle(tile, { x = 0, y = 0, r = 0, s = 1, o = 1 }) {
  tile.style.transform = `translate3d(${f1(x)}px,${f1(y)}px,0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`;
  tile.style.opacity = o.toFixed(3);
}

/* ======================================================================= */

export function createAssembler(root) {
  const stage = root.querySelector(".asm-stage");
  const track = root.querySelector(".asm-track");
  const world = root.querySelector(".asm-world");
  const grid = root.querySelector(".asm-grid");
  const lines = root.querySelector(".asm-lines");
  const dots = root.querySelector(".asm-dots");
  const confetti = root.querySelector(".asm-confetti");
  const hud = {
    count: root.querySelector("[data-hud=count]"),
    bar: root.querySelector("[data-hud=bar]"),
  };
  const depthEls = [...root.querySelectorAll("[data-depth]")].map((el) => ({
    el,
    f: +el.dataset.depth,
    x: +el.dataset.x,
    y: +el.dataset.y,
    spin: +el.dataset.spin,
    seed: +el.dataset.seed,
  }));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bots = new Map();
  root.querySelectorAll("[data-bot]").forEach((el) => bots.set(el.dataset.bot, makeBot(el)));
  const foreman = bots.get("foreman");
  const sign = root.querySelector('[data-fx="foreman:sign"]');

  const acts = BLOCKS.map((b, i) => {
    const wrap = grid.querySelector(`[data-block="${b.id}"]`);
    const memo = {};
    const q = (sel) => (memo[sel] ??= root.querySelector(sel));
    const a = {
      b,
      i,
      start: TIMELINE.acts[i].start,
      end: TIMELINE.acts[i].end,
      hold: TIMELINE.acts[i].hold,
      lastHold: -1,
      wrap,
      tile: wrap.querySelector(".tile"),
      paint: wrap.querySelector("[data-paint]"),
      steps: [...wrap.querySelectorAll("[data-step]")],
      counts: [...wrap.querySelectorAll("[data-count]")],
      bots: b.crew.map((_, k) => bots.get(`${b.id}:${k}`)),
      fxAll: [...root.querySelectorAll(`[data-fx^="${b.id}:"]`)],
      linesAll: [...root.querySelectorAll(`[data-line^="${b.id}:"]`)],
      f: (name) => q(`[data-fx="${b.id}:${name}"]`),
      line: (name) => q(`[data-line="${b.id}:${name}"]`),
      lastT: -1,
    };
    if (b.act === "voxel") a.cubes = [...root.querySelectorAll(`[data-fx^="${b.id}:cube"]`)];
    if (b.act === "spray") a.mist = [...root.querySelectorAll(`[data-fx^="${b.id}:mist"]`)];
    if (b.script) {
      a.termLines = [...root.querySelectorAll(`[data-fx="${b.id}:term"] [data-ln]`)];
      let total = 0;
      a.lineAt = b.script.map((l) => {
        const at = total;
        total += l.t.length + 8; // a beat between lines
        return at;
      });
      a.chars = total;
    }
    return a;
  });

  /* ---- layout --------------------------------------------------------- */
  let vw = 0, vh = 0, sc = 1.25, worldH = 0, maxCam = 0, trackTop = 0, signW = 0, signH = 0;
  const gridBox = { x: 0, y: 0, w: 0, h: 0 };

  function camFor(r) {
    const y = r.h > vh - 200 ? r.y - 120 : r.y + r.h / 2 - vh * 0.54;
    return clamp(y, 0, maxCam);
  }

  function measure() {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    sc = vw < 700 ? 1.05 : 1.45;
    trackTop = track.getBoundingClientRect().top + window.scrollY;
    signW = sign.offsetWidth;
    signH = sign.offsetHeight;
    gridBox.x = grid.offsetLeft;
    gridBox.y = grid.offsetTop;
    gridBox.w = grid.offsetWidth;
    gridBox.h = grid.offsetHeight;
    worldH = gridBox.y + gridBox.h + 150;
    maxCam = Math.max(0, worldH - vh);
    lines.setAttribute("width", vw);
    lines.setAttribute("height", worldH);
    lines.setAttribute("viewBox", `0 0 ${vw} ${worldH}`);
    if (!reduce) track.style.height = `${((TIMELINE.total * PACE) / 100) * vh + vh}px`;

    for (const a of acts) {
      const r = (a.rect = {
        x: gridBox.x + a.wrap.offsetLeft,
        y: gridBox.y + a.wrap.offsetTop,
        w: a.wrap.offsetWidth,
        h: a.wrap.offsetHeight,
      });
      a.cam = camFor(r);
      if (a.b.act === "spray") {
        // a zigzag down the face, in tile-local px
        const N = Math.max(3, Math.round(r.h / 125));
        const pts = [];
        for (let k = 0; k < N; k++) {
          const y = (r.h * (k + 0.5)) / N;
          const xs = k % 2 ? [0.84, 0.16] : [0.16, 0.84];
          xs.forEach((u) => pts.push([r.w * u, y]));
        }
        const cum = [0];
        for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
        a.path = { pts, cum, len: cum[cum.length - 1] };
      }
      if (a.b.act === "voxel") {
        const cols = clamp(Math.round(r.w / 58), 3, 12);
        const rows = clamp(Math.round(r.h / 58), 3, Math.floor(a.cubes.length / cols));
        a.vox = { cols, rows, cw: r.w / cols, ch: r.h / rows };
        a.cubes.forEach((el) => {
          el.style.width = `${a.vox.cw - 5}px`;
          el.style.height = `${a.vox.ch - 5}px`;
        });
      }
      if (a.b.act === "roller") a.f("roller").style.height = `${r.h - 18}px`;
      if (a.b.act === "unroll") a.f("roll").style.height = `${r.h}px`;
      if (a.b.act === "stamp") {
        const w = r.w * 0.8;
        a.stampSize = { w, h: w * 0.78 };
        const st = a.f("stamp");
        st.style.width = `${w}px`;
        st.style.height = `${a.stampSize.h}px`;
      }
      a.lastT = -1;
    }
  }

  /* ---- shared poses ----------------------------------------------------- */
  function perch(a, k, c, dy = 0) {
    const r = a.rect;
    const u = a.b.perch?.[k] ?? 0.8 - k * 0.14;
    return {
      x: r.x + r.w * u,
      y: r.y + dy + 13 * sc,
      sit: true,
      armL: c.cheer ? 150 : 14,
      armR: c.cheer ? -150 : -14,
      cheer: c.cheer,
    };
  }

  function reset(a) {
    a.tile.style.transform = "";
    a.tile.style.opacity = "0";
    a.tile.style.clipPath = "";
    a.tile.classList.remove("is-skel", "is-serving");
    a.counts.forEach((el) => setCount(el, 0));
    a.wrap.removeAttribute("data-done");
    a.wrap.style.setProperty("--slot", "1");
    if (a.paint) a.paint.style.clipPath = "inset(0 100% 0 0)";
    a.steps.forEach((el) => el.classList.remove("is-on"));
    a.wrap.style.setProperty("--draw", "0");
    a.bots.forEach((bot) => bot.hide());
    a.fxAll.forEach((el) => show(el, false));
    a.linesAll.forEach((el) => show(el, false));
  }

  function finish(a, c) {
    a.tile.style.transform = "";
    a.tile.style.opacity = "1";
    a.tile.style.clipPath = "";
    a.tile.classList.remove("is-skel", "is-serving");
    a.counts.forEach((el) => setCount(el, 1));
    a.wrap.setAttribute("data-done", "");
    a.wrap.style.setProperty("--slot", "0");
    if (a.paint) a.paint.style.clipPath = "none";
    a.steps.forEach((el) => el.classList.add("is-on"));
    a.wrap.style.setProperty("--draw", "1");
    a.bots.forEach((bot, k) => bot.pose(perch(a, k, c), sc));
    a.fxAll.forEach((el) => show(el, false));
    a.linesAll.forEach((el) => show(el, false));
  }

  /* ---- the acts --------------------------------------------------------- */
  const ACTS = {
    /** a helper on a laptop runs an agent; the block types itself in */
    agent(t, a, c) {
      const r = a.rect, b = a.b, term = a.f("term");
      const tw = Math.min(400, Math.max(250, r.w * 0.66));
      const th = 50 + b.script.length * 21;
      const tx = clamp(r.x + r.w * b.term.u - tw / 2, c.view.left + 10, c.view.right - tw - 10);
      const qin = back(seg(t, 0, 0.1)), qout = easeIn(seg(t, 0.86, 0.97));
      const float = Math.sin(t * 16) * 3;
      const ty = r.y + r.h * b.term.v - th / 2 + float + (1 - qin) * 40 + qout * 30;
      term.style.width = `${tw}px`;
      term.style.transform = `translate3d(${f1(tx)}px,${f1(ty)}px,0) scale(${(lerp(0.86, 1, qin) - qout * 0.15).toFixed(3)})`;
      term.style.opacity = (seg(t, 0, 0.05) * (1 - qout)).toFixed(3);
      show(term, t < 0.97);

      // type the script, a beat between lines
      const typed = Math.floor(seg(t, 0.13, 0.8) * a.chars);
      const on = new Set();
      let caretLine = -1, drawFrom = null;
      b.script.forEach((l, i) => {
        const n = clamp(typed - a.lineAt[i], 0, l.t.length);
        const el = a.termLines[i];
        const txt = l.t.slice(0, n);
        if (el.textContent !== txt) el.textContent = txt;
        if (n > 0 && n < l.t.length) caretLine = i;
        if (n === l.t.length && l.step) on.add(l.step);
        if (l.draw) drawFrom = 0.13 + 0.67 * (a.lineAt[i] / a.chars);
      });
      if (caretLine < 0) caretLine = b.script.findIndex((_, i) => typed < a.lineAt[i]) - 1;
      if (caretLine < 0) caretLine = b.script.length - 1;
      a.termLines.forEach((el, i) => el.classList.toggle("has-caret", i === caretLine));
      a.steps.forEach((el) => el.classList.toggle("is-on", on.has(+el.dataset.step)));
      if (drawFrom != null) a.wrap.style.setProperty("--draw", seg(t, drawFrom, drawFrom + 0.32).toFixed(3));

      tileStyle(a.tile, { o: seg(t, 0.05, 0.13) });
      a.tile.classList.toggle("is-skel", t < 0.9);

      // the helper drops onto the terminal, types, then hops onto the block
      const seat = { x: tx + Math.min(70, tw * 0.2), y: ty + 13 * sc, sit: true };
      const bot = a.bots[0];
      if (t < 0.12) {
        const q = seg(t, 0.01, 0.12);
        bot.pose({ ...seat, y: lerp(c.view.top - 90, seat.y, bounce(q)), armL: 150, armR: -150, sit: q > 0.6 }, sc);
      } else if (t < 0.86) {
        const typing = t < 0.8;
        const j = t * 900;
        bot.pose(
          {
            ...seat,
            laptop: true,
            armL: typing ? -30 + Math.sin(j) * 10 : -14,
            armR: typing ? 30 + Math.sin(j + 1.9) * 10 : 14,
          },
          sc,
        );
      } else {
        bot.pose(hopPose(seat, perch(a, 0, c), ease(seg(t, 0.86, 1)), 80), sc);
      }
    },

    /** two helpers walk in from the edge, hauling the block on a rope */
    haul(t, a, c) {
      const r = a.rect;
      const D = c.view.right - r.x + 110;
      const q = ease(seg(t, 0.03, 0.7));
      let x = D * (1 - q);
      if (t > 0.7) x = -Math.sin(seg(t, 0.7, 0.8) * Math.PI) * 10;
      tileStyle(a.tile, { x, r: Math.sin(q * 30) * 1.4 * (1 - q), o: 1 });
      const lead = r.x + x;
      const footY = r.y + r.h - 6;
      const hands = [];
      a.bots.forEach((bot, k) => {
        const gap = (74 + k * 46) * (sc / 1.25);
        const bx = r.x + D * (1 - q) - gap;
        const done = perch(a, k, c);
        if (t < 0.72) {
          const w = walkPose(bx / (8 * sc) + k * 1.3);
          bot.pose({ x: bx, y: footY + w.bob, face: -1, lean: 13, legL: w.legL, legR: w.legR, armL: 48 + w.armL * 0.2, armR: 38 + w.armR * 0.2 }, sc);
          hands.push([bx + 12 * sc, footY - 20 * sc]);
        } else if (t < 0.84) {
          const wave = Math.sin(t * 160 + k) * 22;
          bot.pose({ x: bx, y: footY, face: 1, armL: k ? 150 + wave : 10, armR: k ? -10 : -150 - wave }, sc);
        } else {
          bot.pose(hopPose({ x: bx, y: footY }, done, ease(seg(t, 0.84 + k * 0.03, 0.97 + k * 0.03)), 70), sc);
        }
      });
      const rope = a.line("rope");
      show(rope, t < 0.72);
      if (t < 0.72 && hands.length) {
        const [h1, h0] = [hands[hands.length - 1], hands[0]];
        const ex = lead, ey = r.y + r.h * 0.6;
        rope.setAttribute(
          "d",
          `M${f1(h1[0])} ${f1(h1[1])}Q${f1((h1[0] + h0[0]) / 2)} ${f1(h0[1] + 9)} ${f1(h0[0])} ${f1(h0[1])}Q${f1((h0[0] + ex) / 2)} ${f1(Math.max(h0[1], ey) + 16)} ${f1(ex)} ${f1(ey)}`,
        );
      }
    },

    /** lowered from the sky under three balloons, which then float off */
    balloon(t, a, c) {
      ACTS.lower(t, a, c, "balloon");
    },
    /** lowered on a crane hook that winds back up out of frame */
    crane(t, a, c) {
      ACTS.lower(t, a, c, "crane");
    },
    lower(t, a, c, kind) {
      const r = a.rect;
      const q = kind === "balloon" ? easeOut(seg(t, 0.03, 0.68)) : ease(seg(t, 0.03, 0.66));
      const off = -(r.y + r.h - c.view.top + 160);
      let y = off * (1 - q);
      if (t > 0.66) y -= Math.sin(seg(t, 0.66, 0.76) * Math.PI) * 9;
      tileStyle(a.tile, { y, r: Math.sin(t * 22) * 4 * (1 - q), o: 1 });
      const top = r.y + y;

      const bot = a.bots[0];
      const ride = perch(a, 0, c, y);
      if (t < 0.74) bot.pose({ ...ride, armL: 168, armR: -168 }, sc);
      else bot.pose({ ...perch(a, 0, c), armR: t < 0.88 ? -150 + Math.sin(t * 150) * 25 : -14 }, sc);

      if (kind === "balloon") {
        const rel = seg(t, 0.72, 1);
        [0.2, 0.5, 0.8].forEach((u, k) => {
          const ax = r.x + r.w * u, ay = top;
          const bx = ax + (k - 1) * 24 + Math.sin(t * 14 + k * 2) * 7 * (1 - rel) + rel * rel * (k - 1) * 160;
          const by = top - 150 - (k === 1 ? 34 : 0) - Math.pow(rel, 1.6) * 1100;
          const bl = a.f(`b${k}`), s = a.line(`s${k}`);
          bl.style.transform = `translate3d(${f1(bx - 26)}px,${f1(by - 34)}px,0) rotate(${f1((k - 1) * 8 + Math.sin(t * 10 + k) * 4)}deg)`;
          show(bl, t < 0.995);
          show(s, t < 0.995);
          const sx = rel > 0 ? bx + Math.sin(t * 20 + k) * 12 : ax;
          const sy = rel > 0 ? by + 130 : ay;
          s.setAttribute("d", `M${f1(sx)} ${f1(sy)}Q${f1((sx + bx) / 2 + 10)} ${f1((sy + by) / 2)} ${f1(bx)} ${f1(by + 30)}`);
        });
      } else {
        const rel = ease(seg(t, 0.72, 0.97));
        const cx = r.x + r.w / 2;
        const hookY = top - 64 - rel * (r.y - c.view.top + 260);
        const hook = a.f("hook");
        hook.style.transform = `translate3d(${f1(cx - 14)}px,${f1(hookY - 8)}px,0)`;
        show(hook, t < 0.97);
        const cable = a.line("cable");
        show(cable, t < 0.97);
        cable.setAttribute("d", `M${f1(cx)} ${f1(c.view.top - 60)}V${f1(hookY)}`);
        [0, 1].forEach((k) => {
          const s = a.line(`sl${k}`);
          show(s, t < 0.97);
          const ex = rel > 0 ? cx + (k ? 22 : -22) : r.x + (k ? r.w - 16 : 16);
          const ey = rel > 0 ? hookY + 70 : top + 2;
          s.setAttribute("d", `M${f1(cx)} ${f1(hookY + 22)}L${f1(ex)} ${f1(ey)}`);
        });
      }
    },

    /** a hovering helper spray-paints the block in, row by row */
    spray(t, a, c) {
      const r = a.rect, P = a.path;
      tileStyle(a.tile, { o: seg(t, 0, 0.1) });
      const s = seg(t, 0.14, 0.84);
      const L = P.len * s;
      const at = (d) => {
        let k = 1;
        while (k < P.cum.length - 1 && P.cum[k] < d) k++;
        const u = clamp01((d - P.cum[k - 1]) / (P.cum[k] - P.cum[k - 1] || 1));
        return [lerp(P.pts[k - 1][0], P.pts[k][0], u), lerp(P.pts[k - 1][1], P.pts[k][1], u)];
      };
      const R = Math.max(46, r.w * 0.26);
      if (s <= 0) a.paint.style.clipPath = "inset(0 100% 0 0)";
      else if (s >= 1) a.paint.style.clipPath = "none";
      else {
        let d = "";
        for (let x = 0, i = 0; x <= L; x += 11, i++) {
          const [cx, cy] = at(x);
          const rr = R * (0.82 + hash(i + a.i * 31) * 0.3);
          d += `M${f1(cx - rr)} ${f1(cy)}a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(rr * 2)} 0a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-rr * 2)} 0`;
        }
        a.paint.style.clipPath = `path('${d}')`;
      }
      const [px, py] = at(L);
      const nozzle = { x: r.x + px - 22, y: r.y + py };
      const spraying = s > 0 && s < 1;
      const bob = Math.sin(t * 60) * 3;
      const work = { x: nozzle.x - 30 * sc, y: nozzle.y + 27 * sc + bob, fly: true, sit: true, armR: -90, armL: 20 };
      const bot = a.bots[0];
      if (t < 0.14) {
        const q = ease(seg(t, 0, 0.14));
        bot.pose({ ...work, x: lerp(c.view.left - 80, work.x, q), y: lerp(r.y - 160, work.y, q), armR: -20 }, sc);
      } else if (t < 0.86) bot.pose(work, sc);
      else bot.pose(hopPose(work, perch(a, 0, c), ease(seg(t, 0.86, 1)), 50), sc);

      // a puff of mist where the paint lands
      const frame = Math.floor(L / 7);
      a.mist.forEach((el, j) => {
        show(el, spraying);
        if (!spraying) return;
        const ang = (hash(j * 3.7 + frame) - 0.5) * 2.6;
        const dist = 6 + hash(j * 9.1 + frame * 1.3) * R * 0.9;
        el.style.transform = `translate3d(${f1(r.x + px + Math.cos(ang) * dist)}px,${f1(r.y + py + Math.sin(ang) * dist)}px,0) scale(${(0.5 + hash(j + frame) * 1.2).toFixed(2)})`;
      });
    },

    /** a helper walks the top edge with a paint roller on a pole */
    roller(t, a, c) {
      const r = a.rect;
      tileStyle(a.tile, { o: seg(t, 0, 0.1) });
      const q = ease(seg(t, 0.14, 0.84));
      a.paint.style.clipPath = `inset(0 ${((1 - q) * 100).toFixed(2)}% 0 0)`;
      const ex = r.x + r.w * q;
      const roll = a.f("roller");
      show(roll, t > 0.08 && t < 0.88);
      roll.style.transform = `translate3d(${f1(ex - 11)}px,${f1(r.y + 9)}px,0)`;
      const bot = a.bots[0];
      const footY = r.y - 2;
      const bx = t < 0.14 ? lerp(r.x - 150, ex - 16 * sc, ease(seg(t, 0, 0.14))) : ex - 16 * sc;
      const w = walkPose(bx / (7 * sc));
      const pole = a.line("pole");
      if (t < 0.86) {
        bot.pose({ x: bx, y: footY + w.bob, legL: w.legL, legR: w.legR, armL: w.armL, armR: -28, lean: 6 }, sc);
        show(pole, t > 0.08);
        pole.setAttribute("d", `M${f1(bx + 13 * sc)} ${f1(footY - 16 * sc)}L${f1(ex)} ${f1(r.y + 14)}`);
      } else {
        show(pole, false);
        bot.pose(hopPose({ x: bx, y: footY }, perch(a, 0, c), ease(seg(t, 0.86, 1)), 40), sc);
      }
    },

    /** dozens of cubes fly in from in front of the screen and lock together */
    voxel(t, a, c) {
      const r = a.rect, { cols, rows, cw, ch } = a.vox;
      const n = cols * rows;
      const fade = 1 - seg(t, 0.84, 0.95);
      a.cubes.forEach((el, i) => {
        if (i >= n) return show(el, false);
        const col = i % cols, row = Math.floor(i / cols);
        const h1 = hash(i * 3.1 + 7), h2 = hash(i * 7.7 + 1), h3 = hash(i * 1.3 + 5);
        const d0 = 0.04 + (row / rows) * 0.3 + h1 * 0.2;
        const q = easeOut(seg(t, d0, d0 + 0.26));
        show(el, q > 0 && fade > 0);
        if (q <= 0) return;
        const ang = h2 * Math.PI * 2, dist = 700 + h3 * 800;
        const x = r.x + col * cw + 2.5 + Math.cos(ang) * dist * (1 - q);
        const y = r.y + row * ch + 2.5 + (Math.sin(ang) * dist * 0.6 - 260) * (1 - q);
        const s = lerp(2.6 + h1 * 1.8, 1, q);
        el.style.transform = `translate3d(${f1(x)}px,${f1(y)}px,0) rotate(${f1((h2 - 0.5) * 540 * (1 - q))}deg) scale(${s.toFixed(3)})`;
        el.style.opacity = (Math.min(1, q * 4) * fade).toFixed(3);
      });
      tileStyle(a.tile, { o: seg(t, 0.8, 0.9) });
      const bot = a.bots[0];
      const spot = { x: r.x + 34 * sc, y: r.y + r.h - 8 };
      if (t < 0.08) {
        const bx = lerp(c.view.left - 60, spot.x, seg(t, 0, 0.08));
        const w = walkPose(bx / (8 * sc));
        bot.pose({ ...spot, x: bx, y: spot.y + w.bob, legL: w.legL, legR: w.legR, armL: w.armL, armR: w.armR }, sc);
      } else if (t < 0.88) {
        const k = t * 140;
        bot.pose({ ...spot, armL: 118 + Math.sin(k) * 38, armR: -118 - Math.sin(k + 1.1) * 38 }, sc);
      } else bot.pose(hopPose(spot, perch(a, 0, c), ease(seg(t, 0.88, 1)), 60), sc);
    },

    /** a helper shoves the block in like a crate */
    push(t, a, c) {
      const r = a.rect, dir = a.b.from === "right" ? -1 : 1;
      const D = dir > 0 ? r.x + r.w - c.view.left + 140 : c.view.right - r.x + 140;
      const q = ease(seg(t, 0.03, 0.74));
      const x = -dir * D * (1 - q);
      tileStyle(a.tile, { x, r: Math.sin(q * 44) * 1.6 * (1 - q), o: 1 });
      const footY = r.y + r.h - 5;
      const bx = dir > 0 ? r.x + x - 15 * sc : r.x + r.w + x + 15 * sc;
      const bot = a.bots[0];
      if (t < 0.74) {
        const w = walkPose(bx / (6 * sc));
        bot.pose({ x: bx, y: footY + w.bob, face: dir, lean: 17, legL: w.legL * 1.2, legR: w.legR * 1.2, armL: -72, armR: -84 }, sc);
      } else if (t < 0.86) {
        bot.pose({ x: bx, y: footY, face: dir, armL: 8, armR: -160 + Math.sin(t * 120) * 10 }, sc);
      } else bot.pose(hopPose({ x: bx, y: footY }, perch(a, 0, c), ease(seg(t, 0.86, 1)), 70), sc);
    },

    /** a giant rubber stamp comes down out of the foreground */
    stamp(t, a, c) {
      const r = a.rect, { w, h } = a.stampSize, st = a.f("stamp");
      const down = easeIn(seg(t, 0.04, 0.42)), up = ease(seg(t, 0.52, 0.86));
      const restY = r.y + r.h * 0.62 - h;
      const startY = c.view.top - h * 1.6 - 120;
      const y = up > 0 ? lerp(restY, startY, up) : lerp(startY, restY, down);
      const s = up > 0 ? lerp(1, 1.6, up) : lerp(1.6, 1, down);
      const sq = Math.sin(seg(t, 0.42, 0.5) * Math.PI);
      st.style.transform = `translate3d(${f1(r.x + (r.w - w) / 2)}px,${f1(y)}px,0) scale(${s.toFixed(3)},${(s * (1 - sq * 0.1)).toFixed(3)})`;
      show(st, t < 0.86);
      const hit = t >= 0.42;
      tileStyle(a.tile, { o: hit ? 1 : 0, s: 1 + Math.sin(seg(t, 0.42, 0.58) * Math.PI) * 0.05 });
      const ring = a.f("splat");
      const rq = seg(t, 0.42, 0.62);
      show(ring, rq > 0 && rq < 1);
      ring.style.transform = `translate3d(${f1(r.x + r.w / 2)}px,${f1(r.y + r.h / 2)}px,0) scale(${lerp(0.4, 1.5, easeOut(rq)).toFixed(3)})`;
      ring.style.opacity = (1 - rq).toFixed(3);
      const bot = a.bots[0];
      // stands on the handle, sized with the stamp so it shares its depth
      const ride = { x: r.x + r.w / 2, y: y + h - h * s * (1 - sq * 0.1) + 2, s, armL: 150, armR: -150 };
      if (t < 0.44) bot.pose(ride, sc);
      else if (t < 0.66) bot.pose(hopPose(ride, perch(a, 0, c), ease(seg(t, 0.44, 0.66)), 90), sc);
      else bot.pose(perch(a, 0, c), sc);
    },

    /** a helper jogs in along the bottom while the route draws and the totals tick up */
    run(t, a, c) {
      const r = a.rect;
      tileStyle(a.tile, { o: seg(t, 0, 0.08) });
      a.wrap.style.setProperty("--draw", ease(seg(t, 0.14, 0.82)).toFixed(3));
      const k = easeOut(seg(t, 0.12, 0.72));
      a.counts.forEach((el) => setCount(el, k));
      const bot = a.bots[0];
      const footY = r.y + r.h - 6;
      const endX = r.x + r.w - 34 * sc;
      if (t < 0.84) {
        const x = lerp(c.view.left - 70, endX, seg(t, 0.02, 0.82));
        const w = walkPose(x / (4.2 * sc), 1.45);
        bot.pose(
          { x, y: footY + w.bob * 1.8, lean: 12, legL: w.legL, legR: w.legR, armL: -24 + w.armL * 1.3, armR: -24 + w.armR * 1.3 },
          sc,
        );
      } else {
        bot.pose(hopPose({ x: endX, y: footY }, perch(a, 0, c), ease(seg(t, 0.84, 1)), 70), sc);
      }
    },

    /** a waiter crosses the top edge with a tray, and the list is served row by row */
    serve(t, a, c) {
      const r = a.rect;
      tileStyle(a.tile, { o: seg(t, 0, 0.08) });
      a.tile.classList.add("is-serving");
      const q = seg(t, 0.1, 0.84);
      const n = a.steps.length || 1;
      a.steps.forEach((el) => el.classList.toggle("is-on", q >= ((+el.dataset.step - 0.7) / n) * 0.95));
      const bot = a.bots[0];
      const footY = r.y - 2;
      const endX = r.x + r.w * (a.b.perch?.[0] ?? 0.5);
      if (t < 0.86) {
        const x = t < 0.1 ? lerp(c.view.left - 60, r.x + 20, ease(seg(t, 0, 0.1))) : lerp(r.x + 20, r.x + r.w - 30 * sc, q);
        const w = walkPose(x / (6 * sc));
        bot.pose({ x, y: footY + w.bob, legL: w.legL, legR: w.legR, armL: w.armL, armR: -174 + Math.sin(x / 20) * 4 }, sc);
      } else {
        bot.pose(hopPose({ x: r.x + r.w - 30 * sc, y: footY }, { ...perch(a, 0, c), x: endX }, ease(seg(t, 0.86, 1)), 30), sc);
      }
    },

    /** the closing banner rolls out like a carpet */
    unroll(t, a, c) {
      const r = a.rect;
      const q = ease(seg(t, 0.08, 0.8));
      tileStyle(a.tile, { o: t > 0.06 ? 1 : 0 });
      a.tile.style.clipPath = `inset(0 ${((1 - q) * 100).toFixed(2)}% 0 0 round var(--radius-tile))`;
      const d = lerp(58, 20, q);
      const ex = r.x + r.w * q;
      const roll = a.f("roll");
      show(roll, t > 0.04 && t < 0.84);
      roll.style.width = `${f1(d)}px`;
      roll.style.transform = `translate3d(${f1(ex - d / 2)}px,${f1(r.y)}px,0)`;
      const [pusher, rider] = a.bots;
      const footY = r.y + r.h - 4;
      const enter = seg(t, 0, 0.08);
      const px = t < 0.08 ? lerp(c.view.left - 80, r.x - d / 2 - 14 * sc, enter) : ex - d / 2 - 14 * sc;
      const rx = t < 0.08 ? lerp(c.view.left - 160, r.x - 10, enter) : ex - 4;
      if (t < 0.84) {
        const w = walkPose(px / (6 * sc));
        pusher.pose({ x: px, y: footY + w.bob, lean: 16, legL: w.legL, legR: w.legR, armL: -74, armR: -86 }, sc);
        // log-rolling on top: feet stay planted on the roll and tread as it turns
        const w2 = walkPose(rx / (3.2 * sc), 0.8);
        const wob = Math.sin(t * 50) * 12;
        rider.pose({ x: rx, y: r.y + 1, ride: true, lean: -4 + wob * 0.25, legL: w2.legL, legR: w2.legR, armL: 70 + wob, armR: -70 + wob }, sc);
      } else {
        const hq = ease(seg(t, 0.84, 1));
        pusher.pose(hopPose({ x: px, y: footY }, perch(a, 0, c), hq, 90), sc);
        rider.pose(hopPose({ x: rx, y: r.y - 2 }, perch(a, 1, c), hq, 40), sc);
      }
    },
  };

  /* ---- intro + finale --------------------------------------------------- */
  const FIN = TIMELINE.finaleStart;
  let signShown = true;
  function bookends(T, c) {
    let p = null;
    if (T < INTRO + 25) {
      const q = seg(T, 6, INTRO + 25);
      const x = lerp(vw * 0.5, c.view.right + 90, easeIn(q));
      const y = c.view.top + vh - 70;
      const w = walkPose(x / (7 * sc), q > 0 ? 1 : 0);
      p = { x, y: y + w.bob, legL: w.legL, legR: w.legR, armL: 166, armR: -166 };
    } else if (T > FIN) {
      const banner = acts[acts.length - 1].rect;
      const q = ease(seg(T, FIN, FIN + 30));
      const x = lerp(c.view.left - 80, banner.x + banner.w * 0.46, q);
      const w = walkPose(x / (7 * sc), q < 1 ? 1 : 0);
      p = { x, y: banner.y - 2 + w.bob, legL: w.legL, legR: w.legR, armL: 166, armR: -166 };
    }
    if (p) {
      foreman.pose(p, sc);
      if (!signShown) {
        show(sign, true);
        signShown = true;
      }
      sign.style.transform = `translate3d(${f1(p.x - signW / 2)}px,${f1(p.y - 60 * sc - signH)}px,0) rotate(${f1(Math.sin(T * 0.4) * 2)}deg)`;
    } else if (signShown) {
      foreman.hide();
      show(sign, false);
      signShown = false;
    }
  }

  /* ---- the frame -------------------------------------------------------- */
  let Tshow = 0, Ttarget = 0, raf = 0, last = performance.now(), dirty = true;
  let phase = "", lastDone = -1;

  function scrollT() {
    if (reduce) return TIMELINE.total;
    const y = window.scrollY - trackTop;
    return clamp((y / (vh * PACE)) * 100, 0, TIMELINE.total);
  }

  function render(T) {
    // camera: hold on each act, travel in the gap and the act's first fifth
    let cam = acts[0].cam;
    for (let i = 1; i < acts.length; i++) {
      const p = acts[i - 1], a = acts[i];
      cam = lerp(cam, a.cam, smooth(seg(T, p.end + p.hold - 4, a.start + (a.end - a.start) * 0.2)));
    }
    const fin = reduce ? 0 : smooth(seg(T, FIN, FIN + 45));
    // a phone's single column is too tall to pull back on; it ends on the banner instead
    const narrow = vw < 700;
    const fit = narrow ? 1 : Math.min(1, (vh - 150) / (gridBox.h + 60), (vw - 24) / (gridBox.w + 40));
    const s = lerp(1, fit, fin);
    const endY = narrow ? acts[acts.length - 1].cam + vh / 2 : gridBox.y + gridBox.h / 2 + 20;
    const cy = lerp(cam + vh / 2, endY, fin);
    world.style.transform = reduce
      ? ""
      : `translate3d(${f1(vw / 2)}px,${f1(vh / 2)}px,0) scale(${s.toFixed(4)}) translate3d(${f1(-vw / 2)}px,${f1(-cy)}px,0)`;

    const view = {
      left: vw / 2 - vw / 2 / s,
      right: vw / 2 + vw / 2 / s,
      top: cy - vh / 2 / s,
      bottom: cy + vh / 2 / s,
    };
    const camEff = cy - vh / 2;
    const c = { view, cheer: T > FIN + 18 };
    const force = dirty || c.cheer !== render.cheer;
    render.cheer = c.cheer;

    for (const a of acts) {
      const t = clamp01((T - a.start) / (a.end - a.start));
      if (t === a.lastT && !force) continue;
      a.lastT = t;
      if (t <= 0) reset(a);
      else if (t >= 1) finish(a, c);
      else {
        a.wrap.removeAttribute("data-done");
        ACTS[a.b.act](t, a, c);
      }
    }
    bookends(T, c);

    // heavy content (embeds, photos, the 3D watch) loads just ahead of its block's
    // act: mark the block "near" once, a little over half a screen of scroll early.
    // Reduced motion has no acts, so blocks watch their own visibility instead.
    if (!reduce) {
      for (const a of acts) {
        if (a.near || T < a.start - NEAR) continue;
        a.near = true;
        a.wrap.setAttribute("data-near", "");
        a.wrap.dispatchEvent(new CustomEvent("asm-near"));
      }
    }

    // a block with a hold keeps the camera after it lands; tell it how far through that it is
    for (const a of acts) {
      if (!a.hold) continue;
      const h = reduce ? 1 : Math.round(clamp01((T - a.end) / a.hold) * 1000) / 1000;
      if (h === a.lastHold) continue;
      a.lastHold = h;
      a.wrap.dataset.hold = h;
      a.wrap.dispatchEvent(new CustomEvent("asm-hold", { detail: h }));
    }

    // parallax: dots, then cube layers at their own depth (skip transforms far off-screen)
    if (dots) dots.style.transform = `translate3d(0,${f1(-((camEff * 0.3) % 24))}px,0)`;
    for (const d of depthEls) {
      const y = d.y - camEff * d.f;
      if (y < -420 || y > vh + 420) {
        if (d.vis !== false) {
          d.el.style.visibility = "hidden";
          d.vis = false;
        }
        continue;
      }
      if (d.vis === false) {
        d.el.style.visibility = "visible";
        d.vis = true;
      }
      const x = Math.sin(camEff * 0.0016 * d.f + d.seed) * 36 * d.f;
      d.el.style.transform = `translate3d(${f1(x)}px,${f1(y)}px,0) rotate(${f1(camEff * 0.03 * d.spin)}deg) scale(${lerp(1, 0.8 + 0.2 * s, d.f / 2.5).toFixed(3)})`;
    }

    let done = 0;
    for (const a of acts) if (T >= a.end) done++;
    if (done !== lastDone) {
      lastDone = done;
      hud.count.textContent = done === acts.length ? "Built" : `${done}/${acts.length} blocks`;
    }
    hud.bar.style.transform = `scaleX(${(T / TIMELINE.total).toFixed(4)})`;
    const ph = T < INTRO ? "intro" : T >= FIN ? "done" : "build";
    if (ph !== phase) {
      phase = ph;
      root.dataset.phase = ph;
    }
    if (confetti) {
      const on = T > FIN + 20 && !reduce;
      show(confetti, on);
      if (confetti.classList.contains("is-on") !== on) confetti.classList.toggle("is-on", on);
    }
    dirty = false;
  }

  // The frame loop runs only while there's something to catch up on: a scroll
  // or resize wakes it, it eases T toward the scroll position as before, and it
  // goes back to sleep once T has settled, instead of reading layout every frame.
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    Ttarget = scrollT();
    const k = 1 - Math.exp(-dt / 0.085);
    const gap = Ttarget - Tshow;
    let next = Math.abs(gap) < 0.01 ? Ttarget : lerp(Tshow, Ttarget, k);
    // A speed limit, so a fling doesn't flash the builds past: the timeline moves
    // at most MAX_RATE per second and catches up after the scroll stops. Far
    // jumps (Skip, End, dragging the scrollbar) get faster the farther they are,
    // so nobody sits through the whole show to reach the bottom.
    const limit = (MAX_RATE + Math.max(0, Math.abs(gap) - 150) * 2.5) * dt;
    if (Math.abs(next - Tshow) > limit) next = Tshow + Math.sign(gap) * limit;
    const moved = next !== Tshow || dirty;
    if (moved) {
      Tshow = next;
      render(Tshow);
    }
    raf = moved ? requestAnimationFrame(tick) : 0;
  }
  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  const onResize = () => {
    measure();
    dirty = true;
    wake();
  };
  measure();
  Tshow = Ttarget = scrollT();
  render(Tshow);
  wake();
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", onResize);
  document.fonts?.ready?.then(onResize).catch(() => {});

  // test hook: jump the timeline without scrolling
  window.__assemble = {
    total: TIMELINE.total,
    acts: TIMELINE.acts,
    get T() {
      return Tshow;
    },
    seek: (T) => {
      Tshow = Ttarget = T;
      window.scrollTo(0, track.offsetTop + (T / 100) * vh * PACE);
      render(T);
    },
  };

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", onResize);
      delete window.__assemble;
    },
  };
}
