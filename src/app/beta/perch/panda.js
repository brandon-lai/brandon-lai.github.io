// A port of Perch's PetEngine (native/Sources/PerchCore), cut down to what a little desktop in a
// tile needs: walking, ledges, hops and tugs, climbing window sides and frames, hanging under
// windows, naps, chewing, and chasing the bamboo cursor. y is up, in CSS px; (0, 0) is the
// bottom-left of the tile. Timings run a little quicker than the app, since nobody watches a
// tile for an hour.

const G = 1150;
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const flat = (side) => side === "under" || side === "top";

function cut(a, z, l, r) {
  if (r <= a || l >= z) return [[a, z]];
  return [[a, Math.min(z, l)], [Math.max(a, r), z]].filter(([p, q]) => q > p);
}

/** Floor, window tops (minus whatever sits in front of them) and the menu bar. */
function buildSurfaces(wins, W, F, C) {
  const list = [{ kind: "floor", id: "floor", left: 0, right: W, y: F, win: null }];
  wins.forEach((w, i) => {
    if (!(w.maxY > F && w.maxY <= C)) return;
    let segs = [[w.minX, w.maxX]];
    for (let j = 0; j < i; j++) {
      const b = wins[j];
      if (b.minY < w.maxY + 1 && b.maxY >= w.maxY - 1) segs = segs.flatMap(([a, z]) => cut(a, z, b.minX, b.maxX));
    }
    segs
      .filter(([a, z]) => z - a >= 18)
      .forEach(([a, z], k) => list.push({ kind: "ledge", id: `${w.id}:${k}`, left: a, right: z, y: w.maxY, win: w }));
  });
  return list;
}

export class Panda {
  constructor(s) {
    this.s = s;
    this.bw = 16 * s;
    this.clock = 0;
    this.dt = 0;
    this.pos = { x: 0, y: 0 };
    this.v = { x: 0, y: 0 };
    this.dir = -1;
    this.world = null;
    this.support = null;
    this.cling = null;
    this.climb = null;
    this.action = "fall";
    this.react = null;
    this.actionAt = 0;
    this.actionLeft = 0;
    this.nextChoice = 0;
    this.trick = null;
    this.running = false;
    this.play = null;
    this.errand = null;
    this.nap = null;
    this.lounge = null;
    this.chewing = null;
    this.bamboo = 1;
    this.bites = [];
    this.bitesVersion = 0;
    this.leaping = false;
    this.leapCatch = null;
    this.nextLeap = 0;
    this.leapt = false;
    this.holding = false;
    this.swing = 0;
    this.swingRate = 0;
    this.flips = [];
    this.flipSign = 0;
    this.leapUntil = 0;
    this.fallFrom = null;
    this.fallAt = 0;
    this.sticky = false;
    this.sated = false;
    this.nextNap = rnd(35, 45);
    this.nextChew = rnd(12, 25);
    this.nextTug = 8;
    this.nextScramble = 3;
    this.nextPlay = 0;
    this.nextPlan = 0;
    this.zoomUntil = 0;
    this.snuggleUntil = 0;
    this.stirUntil = 0;
    this.cursor = null;
    this.cv = { x: 0, y: 0 };
    this.lastCursor = null;
    this.pointer = false;
    this.hover = false;
    this.clear = new Map();
  }

  get muzzle() { return 14 * this.s; }
  get hangDepth() { return 17 * this.s; }
  get clingLift() { return 1.25 * this.bw; }
  get corner() { return 0.4 * this.bw; }
  get underDrop() { return 18 * this.s; }
  get hopHeight() { return 3 * this.bw; }
  get leapHeight() { return 4.4 * this.bw; }
  get gripReach() { return 2.6 * this.bw; }
  get hangDrop() { return 17.5 * this.s; }
  get speed() { return Math.hypot(this.cv.x, this.cv.y); }
  get asleep() { return this.nap?.stage === "asleep"; }

  // ---------------------------------------------------------------- world

  setWorld(world) {
    const first = !this.world;
    this.world = world;
    this.surfaces = buildSurfaces(world.wins, world.W, world.F, world.C);
    this.clear.clear();
    if (first) {
      this.pos = { x: world.W * 0.7, y: world.C - 34 * this.s };
      this.dir = -1;
      this.change("fall");
      return;
    }
    if (this.holding) return;
    if (this.cling) {
      const c = this.cling;
      if (!c.frame) {
        const w = world.wins.find((x) => x.id === c.win.id);
        if (w) c.win = w;
        else return this.letGo(0);
      }
      this.place();
      return;
    }
    if (this.climb) {
      const L = this.surfaces.find((x) => x.id === this.climb.L.id);
      if (L) { this.climb.L = L; this.climb.to.y = L.y; } else { this.climb = null; this.drop(); }
      return;
    }
    if (this.support) {
      const s = this.surfaces.find((x) => x.id === this.support.id);
      if (s && this.supports(s, this.pos.x, 2)) { this.support = s; this.pos.y = s.y; } else this.drop();
    }
    this.pos.x = clamp(this.pos.x, 12, world.W - 12);
    this.pos.y = clamp(this.pos.y, world.F, world.C - 32 * this.s);
  }

  supports(s, x, m = 0) { return x >= s.left - m && x <= s.right + m; }
  frontmost(p) {
    return this.world.wins.find((w) => p.x >= w.minX && p.x <= w.maxX && p.y >= w.minY && p.y <= w.maxY) || null;
  }
  highestBelow(x, y, m = 0) {
    let best = null;
    for (const s of this.surfaces) {
      if (s.kind !== "menu" && s.y <= y && this.supports(s, x, m) && (!best || s.y > best.y)) best = s;
    }
    return best;
  }
  /** A side is only worth climbing if nothing in front hides any of it. */
  sideClear(w, side) {
    const key = `${w.id}:${side}`;
    if (this.clear.has(key)) return this.clear.get(key);
    const x = side === "left" ? w.minX + 2 : w.maxX - 2;
    let ok = true;
    for (let y = w.minY + 3; y < w.maxY - 3; y += 6) if (this.frontmost({ x, y }) !== w) { ok = false; break; }
    this.clear.set(key, ok);
    return ok;
  }
  wallAt(edge, facing, s) {
    return this.world.wins.find(
      (w) => w !== s.win && Math.abs((facing > 0 ? w.minX : w.maxX) - edge) <= 2 && w.minY < s.y + 6 && s.y + 6 < w.maxY,
    ) || null;
  }
  isCorner(s, edge) { return !!s.win && (Math.abs(edge - s.win.minX) < 1 || Math.abs(edge - s.win.maxX) < 1); }
  frameRect() { const { W, F, C } = this.world; return { minX: 0, minY: F, maxX: W, maxY: C }; }

  change(action, react = null, dur = 0) {
    if (this.action !== action || this.react !== react) {
      this.action = action;
      this.react = react;
      this.actionAt = this.clock;
    }
    this.actionLeft = dur;
  }

  // ---------------------------------------------------------------- tick

  tick(dt, cursor) {
    dt = Math.min(dt, 0.1);
    this.dt = dt;
    this.clock += dt;
    this.actionLeft -= dt;
    this.running = false;
    this.trick = null;
    this.track(dt, cursor);
    if (!this.holding) this.bamboo = Math.min(1, this.bamboo + dt / 12);
    if (this.holding) this.tendHang(dt);
    else if (this.cling) this.tendClingAll(dt);
    else if (this.climb) this.tendClimb();
    else if (!this.support) this.tendAir(dt);
    else this.tendGround(dt);
    const { W, F, C } = this.world;
    if (!this.holding && !this.cling) {
      this.pos.x = clamp(this.pos.x, 12, W - 12);
      this.pos.y = Math.max(this.pos.y, F);
      if (!this.support && !this.climb) this.pos.y = Math.min(this.pos.y, C - 32 * this.s);
    }
  }

  track(dt, c) {
    if (!c) {
      this.cursor = null;
      this.lastCursor = null;
      this.cv.x *= 0.5;
      this.cv.y *= 0.5;
      return;
    }
    if (this.lastCursor && dt >= 0.004) {
      const ix = (c.x - this.lastCursor.x) / dt, iy = (c.y - this.lastCursor.y) / dt;
      this.cv.x = this.cv.x * 0.6 + ix * 0.4;
      this.cv.y = this.cv.y * 0.6 + iy * 0.4;
    }
    this.lastCursor = { x: c.x, y: c.y };
    this.cursor = c;
  }

  // ---------------------------------------------------------------- on a surface

  tendGround(dt) {
    const s = this.support;
    if (!this.supports(s, this.pos.x, 2)) return this.drop();
    if (this.nap && this.tendNap(dt)) return;
    const shaking = this.action === "react" && this.react === "shake" && this.actionLeft > 0;
    if (this.play && !shaking && this.tendChase(dt)) return;
    if (this.chewing) return this.tendChew();
    if (this.lounge) {
      if (this.noticeCursor()) { this.lounge = null; return; }
      if (this.clock < this.lounge.until) { this.change("sit"); this.trick = this.lounge.pose; return; }
      this.lounge = null;
      this.nextChoice = this.clock + rnd(0.3, 0.8);
    }
    if (this.action === "react" || this.action === "stretch" || this.action === "yawn") {
      if (this.actionLeft > 0) return;
      this.change("idle");
      this.nextChoice = this.clock + rnd(0.3, 0.8);
    }
    if (this.action === "fall" || this.action === "climb") this.change("idle");
    if (!this.errand && (this.nextTug -= dt) <= 0) {
      this.nextTug = 10;
      const L = this.ledgeToClimb();
      if (L) return this.beginClimb(L);
    }
    if (this.noticeCursor()) return;
    if (this.errand) return this.tendErrand(dt);
    if (this.clock >= this.nextChoice) this.choose();
    if (this.action === "walk" && !this.cling && !this.climb && this.support) this.wander(dt, this.clock < this.zoomUntil ? 2 : 1);
  }

  choose() {
    const v = Math.random();
    if (this.clock >= this.nextNap) return this.startNap();
    if (this.clock >= this.nextChew && v < 0.35 && this.startChew()) return;
    if (v < 0.5 && this.startErrand()) return;
    if (v < 0.66 && this.clock >= this.nextScramble) {
      this.nextScramble = this.clock + rnd(6, 14);
      if (this.startEdgeClimb()) return;
    }
    const r = Math.random();
    if (r < 0.6) { if (chance(0.35)) this.dir *= -1; this.change("walk"); }
    else if (r < 0.7) this.change("sniff");
    else if (r < 0.8) { this.lounge = { pose: "groom", until: this.clock + rnd(3, 6) }; this.change("sit"); }
    else if (r < 0.89) { this.lounge = { pose: "nibble", until: this.clock + rnd(4, 7) }; this.change("sit"); }
    else if (r < 0.97) { this.zoomUntil = this.clock + rnd(2, 5); if (chance(0.5)) this.dir *= -1; this.change("walk"); }
    else this.change("sit");
    this.nextChoice = this.clock + (this.action === "walk" ? rnd(3, 7) : rnd(1, 2.5));
  }

  bounds(s) {
    const wl = this.wallAt(s.left, -1, s), wr = this.wallAt(s.right, 1, s);
    return { lo: s.left + (wl ? this.bw : 12), hi: s.right - (wr ? this.bw : 12), wl, wr };
  }

  wander(dt, pace) {
    const s = this.support;
    if (pace > 1) this.running = true;
    const speed = 32 * (s.kind === "ledge" ? 0.7 : 0.85) * pace;
    const { lo, hi, wl, wr } = this.bounds(s);
    if (lo > hi) {
      this.pos.x = (s.left + s.right) / 2;
      if (s.kind === "ledge" && !wr) return this.hopOff(1, s.right);
      if (s.kind === "ledge" && !wl) return this.hopOff(-1, s.left);
      return this.change("sit");
    }
    let x = this.pos.x + this.dir * speed * dt;
    if (x < lo || x > hi) {
      const d = x < lo ? -1 : 1, edge = d < 0 ? s.left : s.right, wall = d < 0 ? wl : wr;
      if (s.kind === "floor" && !wall && chance(0.2) && this.startFrameClimb(d < 0 ? "left" : "right", chance(0.25))) return;
      if (s.kind === "ledge" && !wall && chance(0.45)) {
        if (this.isCorner(s, edge) && chance(0.6) && this.startEdgeDescent(d)) return;
        return this.hopOff(d, edge);
      }
      this.dir = -d;
      x = clamp(x, lo, hi);
    }
    this.pos.x = x;
  }

  /** Runs toward x on this surface: "going", "there", or "blocked" short of it. */
  run(gx, dt, speed = 75) {
    const s = this.support;
    const { lo, hi } = this.bounds(s);
    const goal = lo > hi ? (s.left + s.right) / 2 : clamp(gx, lo, hi);
    const d = goal - this.pos.x;
    if (Math.abs(d) > 0.5) {
      this.dir = Math.sign(d);
      this.pos.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      this.change("walk");
      this.running = speed > 60;
      return "going";
    }
    if (this.action === "walk") this.change("idle");
    return Math.abs(gx - goal) > 0.5 ? "blocked" : "there";
  }

  hopOff(d, edge) {
    const s = this.support;
    this.pos.x = edge + d * 2;
    this.v = { x: d * 70, y: 150 };
    this.fallFrom = s?.win ?? null;
    this.fallAt = this.clock;
    this.support = null;
    this.leaping = false;
    this.leapt = true;
    this.sticky = chance(0.6);
    this.dir = d;
    this.change("fall");
  }

  drop() {
    this.support = null;
    this.v = { x: 0, y: 0 };
    this.fallAt = this.clock;
    this.sticky = chance(0.6);
    this.change("fall");
  }

  ledgeToClimb() {
    const s = this.support, C = this.world.C;
    let best = null, bd = Infinity;
    for (const L of this.surfaces) {
      if (L.kind !== "ledge" || L.win === s.win || L.right - L.left < 80 || L.y + 2.5 * this.bw > C) continue;
      const dy = L.y - this.pos.y;
      if (!(dy > 24 && dy <= this.hopHeight && this.pos.x >= L.left - 80 && this.pos.x <= L.right + 80)) continue;
      const d = Math.abs(clamp(this.pos.x, L.left, L.right) - this.pos.x) + dy;
      if (d < bd) { bd = d; best = L; }
    }
    return best;
  }

  ledgeUnder(p) {
    let best = null;
    for (const s of this.surfaces) {
      if (s.kind !== "ledge" || s.right - s.left < 60 || !this.supports(s, p.x)) continue;
      if (s.y > p.y + this.bw || s.y <= this.pos.y + 24 || s.y - this.pos.y > 420) continue;
      if (!best || s.y > best.y) best = s;
    }
    return best;
  }

  beginClimb(L, quick = false) {
    const m = Math.min(20, (L.right - L.left) / 2);
    const to = { x: clamp(this.pos.x, L.left + m, L.right - m), y: L.y };
    const from = { ...this.pos };
    const tug = from.y < L.y - this.hangDepth;
    const d = Math.hypot(to.x - from.x, L.y - this.hangDepth - from.y);
    this.climb = { L, from, to, at: this.clock, tug, approach: quick ? 0.12 : tug ? Math.max(0.56, d / 500) : 0 };
    if (Math.abs(to.x - from.x) > 2) this.dir = to.x > from.x ? 1 : -1;
    this.support = null;
    this.lounge = null;
    this.change("climb");
  }

  tendClimb() {
    const c = this.climb, t = this.clock - c.at, top = c.L.y;
    if (c.tug) {
      const hang = { x: c.to.x, y: top - this.hangDepth };
      if (t < c.approach) {
        const u = t / c.approach, e = 1 - (1 - u) ** 2;
        this.pos.x = lerp(c.from.x, hang.x, e);
        this.pos.y = lerp(c.from.y, hang.y, e) + Math.sin(Math.PI * u) * 14;
        this.trick = "leap";
        return;
      }
      const p = t - c.approach;
      if (p < 0.69) {
        this.pos = { x: hang.x, y: hang.y + 6 * Math.sin((2 * Math.PI * p) / 0.69) ** 2 };
        this.trick = "climb";
        return;
      }
      if (p < 1.04) {
        this.pos = { x: hang.x, y: lerp(hang.y, top, smooth((p - 0.69) / 0.35)) };
        this.trick = "climb";
        return;
      }
    } else {
      const u = Math.min(1, t / 0.7), e = 1 - (1 - u) ** 2;
      this.pos.x = lerp(c.from.x, c.to.x, e);
      this.pos.y = lerp(c.from.y, c.to.y, e) + Math.sin(Math.PI * u) * 32;
      this.trick = "leap";
      if (u < 1) return;
    }
    this.climb = null;
    this.support = c.L;
    this.pos = { ...c.to };
    this.change("sit");
    this.nextChoice = this.clock + rnd(0.6, 1.6);
    if (this.clock >= this.nextChew && !this.play && chance(0.5)) this.startChew();
  }

  // ---------------------------------------------------------------- errands

  startErrand() {
    const s = this.support, bw = this.bw, { W, F } = this.world, r = Math.random();
    let e = null;
    if (r < 0.05 && s.kind === "floor") {
      const side = this.pos.x < W / 2 ? "left" : "right";
      e = { kind: "frame", side, x: side === "left" ? 12 : W - 12, y: F };
    } else if (r < 0.45 && s.kind === "floor") {
      const edges = this.world.wins
        .filter((w) => w.maxX - w.minX >= 120 && w.maxY - w.minY >= 4 * bw)
        .map((w) => this.climbableEdge(w, this.pos.x))
        .filter(Boolean)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      if (edges.length) {
        const g = edges[Math.floor(Math.random() * edges.length)];
        e = { kind: "edge", edge: g, x: g.stand, y: s.y, toTop: true };
      }
    } else if (r < 0.75) {
      const tops = this.surfaces.filter((L) => L.kind === "ledge" && L.right - L.left >= 80);
      if (tops.length) {
        const L = tops[Math.floor(Math.random() * tops.length)];
        e = { kind: "spot", x: rnd(L.left + 30, L.right - 30), y: L.y };
      }
    } else {
      const far = Math.max(120, W * 0.3);
      let x = this.pos.x;
      for (let i = 0; i < 8 && Math.abs(x - this.pos.x) <= far; i++) x = rnd(20, W - 20);
      if (Math.abs(x - this.pos.x) > far) e = { kind: "spot", x, y: F };
    }
    if (!e || (Math.abs(e.x - this.pos.x) < 3 * bw && Math.abs(e.y - this.pos.y) < 4)) return false;
    e.until = this.clock + 20;
    this.errand = e;
    this.change("walk");
    return true;
  }

  tendErrand(dt) {
    const e = this.errand;
    if (this.clock > e.until) {
      this.errand = null;
      this.change("idle");
      this.nextChoice = this.clock + rnd(0.5, 1.2);
      return;
    }
    if (e.kind === "frame") {
      if (this.support.kind !== "floor") { this.errand = null; return; }
      if (this.run(e.x, dt, 40) !== "going") { this.errand = null; this.startFrameClimb(e.side, chance(0.25)); }
      return;
    }
    if (e.kind === "edge") {
      if (this.run(e.x, dt, 40) !== "going") {
        this.errand = null;
        if (!this.grabSide(e.edge.win, e.edge.facing, e.toTop)) this.change("sniff");
      }
      return;
    }
    if ((Math.abs(e.x - this.pos.x) < this.bw && Math.abs(e.y - this.pos.y) < 4) || !this.approach(e, false, dt, 40)) this.arrive();
  }

  arrive() {
    this.errand = null;
    const k = Math.random();
    if (this.nap) this.change("idle");
    else if (k < 0.2) { this.lounge = { pose: "groom", until: this.clock + rnd(3, 5) }; this.change("sit"); }
    else if (k < 0.35) { this.lounge = { pose: "nibble", until: this.clock + rnd(3, 6) }; this.change("sit"); }
    else this.change("sniff");
    this.nextChoice = this.clock + rnd(0.8, 1.8);
  }

  climbableEdge(w, goalX) {
    const s = this.support, bw = this.bw;
    if (!s || w.minY > s.y + this.gripReach || w.maxY <= s.y + 4 * bw || w.maxY - w.minY <= 4 * bw) return null;
    let best = null;
    for (const [side, facing, x] of [["left", 1, w.minX], ["right", -1, w.maxX]]) {
      const stand = x - facing * 0.4 * bw;
      if (!this.supports(s, stand, 0.5 * bw) || !this.sideClear(w, side)) continue;
      if (this.frontmost({ x: x + facing * 2, y: Math.max(s.y + this.clingLift, w.minY) + bw }) !== w) continue;
      const d = Math.abs(stand - (goalX ?? this.pos.x));
      if (!best || d < best.d) best = { win: w, side, facing, stand, d };
    }
    return best;
  }

  /** Gets toward p from a surface. False when there is no way to get any closer. */
  approach(p, grab, dt, speed = 75) {
    const s = this.support, bw = this.bw, { W, C } = this.world, rise = p.y - this.pos.y;
    const host = this.frontmost(p) || this.ledgeUnder(p)?.win || null;
    if (this.clock >= this.nextPlan) {
      this.nextPlan = this.clock + 0.5;
      if (grab && this.clock >= this.nextLeap && Math.abs(p.x - this.pos.x) < 1.6 * bw && rise > 3.2 * bw && rise <= this.leapHeight + bw) {
        this.leap({ x: p.x, y: p.y - 1.7 * bw }, null);
        return true;
      }
      if (rise > 1.6 * bw) {
        const L = this.ledgeUnder(p);
        if (L && L !== s && L.y - this.pos.y > 24 && L.y - this.pos.y <= this.hopHeight) { this.beginClimb(L); return true; }
      }
    }
    if (rise > 3 * bw) {
      const edge = host ? this.climbableEdge(host, p.x) : null;
      // 8 body widths is a sliver of a real display but most of a tile, so cap it to the same share of the width
      const near = Math.min(8 * bw, 0.13 * W);
      const screen = p.x < near ? "left" : p.x > W - near ? "right" : null;
      const sx = screen === "left" ? 12 : W - 12;
      if (s.kind === "floor" && screen && (!edge || Math.abs(sx - p.x) < Math.abs(edge.stand - p.x))) {
        if (this.run(sx, dt, speed) !== "going") this.startFrameClimb(screen, p.y >= C - 2 * bw);
        return true;
      }
      if (edge) {
        if (this.run(edge.stand, dt, speed) !== "going") return this.grabSide(host, edge.facing, p.y >= host.maxY - 2);
        return true;
      }
      if (host && host.minY > this.pos.y + 2 * bw && host.minY - 1.7 * bw - this.pos.y <= this.leapHeight && this.canHang(host)
        && this.highestBelow(clamp(p.x, host.minX, host.maxX), host.minY - 1) === s) {
        const gx = clamp(p.x, host.minX + bw, host.maxX - bw);
        if (Math.abs(gx - this.pos.x) < 0.4 * bw) {
          if (this.clock >= this.nextLeap) this.leap({ x: gx, y: host.minY - 1.7 * bw }, host);
          else this.change("look");
          return true;
        }
        if (this.run(gx, dt, speed) !== "blocked") return true;
      }
    }
    if (rise < -bw && s.kind === "ledge") {
      let d = p.x < this.pos.x ? -1 : 1;
      if (this.wallAt(d < 0 ? s.left : s.right, d, s)) d = -d;
      const end = d < 0 ? s.left : s.right;
      if (this.wallAt(end, d, s)) return false;
      if (this.run(end - d * 12, dt, speed) === "going") return true;
      if (rise < -3 * bw && this.isCorner(s, end) && this.startEdgeDescent(d)) return true;
      this.hopOff(d, end);
      return true;
    }
    let gx = p.x;
    if (rise > bw && host) gx = clamp(gx, host.minX - 0.6 * bw, host.maxX + 0.6 * bw);
    const r = this.run(gx, dt, speed);
    if (r === "blocked") {
      const d = gx < this.pos.x ? -1 : 1, end = d < 0 ? s.left : s.right, wall = this.wallAt(end, d, s);
      if (wall && this.grabSide(wall, d, p.y >= wall.maxY - 2)) return true;
      if (s.kind === "ledge" && rise < 2 * bw && !wall) { this.hopOff(d, end); return true; }
      return false;
    }
    return r === "going";
  }

  startEdgeClimb() {
    const s = this.support, bw = this.bw, W = this.world.W;
    if (s.kind === "ledge") {
      for (const d of [-1, 1]) {
        const end = d < 0 ? s.left : s.right;
        if (Math.abs(this.pos.x - end) <= 16 && this.isCorner(s, end) && this.startEdgeDescent(d)) return true;
      }
    }
    if (s.kind === "floor" && (this.pos.x < 1.5 * bw || this.pos.x > W - 1.5 * bw)) {
      return this.startFrameClimb(this.pos.x < W / 2 ? "left" : "right", chance(0.25));
    }
    let best = null;
    for (const w of this.world.wins) {
      const e = this.climbableEdge(w, this.pos.x);
      if (e && e.d <= 3 * bw && (!best || e.d < best.d)) best = e;
    }
    if (best) {
      this.errand = { kind: "edge", edge: best, x: best.stand, y: s.y, toTop: chance(0.5), until: this.clock + 10 };
      this.change("walk");
      return true;
    }
    for (const w of this.world.wins) {
      if (this.pos.x < w.minX + bw || this.pos.x > w.maxX - bw || w.minY <= this.pos.y + 2 * bw) continue;
      if (w.minY - 1.7 * bw - this.pos.y > this.leapHeight || !this.canHang(w)) continue;
      if (this.highestBelow(this.pos.x, w.minY - 1) !== s) continue;
      this.leap({ x: this.pos.x, y: w.minY - 1.7 * bw }, w);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- chewing

  startChew() {
    const s = this.support;
    if (!s || s.kind !== "ledge") return false;
    for (const d of [this.dir, -this.dir]) {
      const mx = this.pos.x + d * this.muzzle;
      if (mx > s.left + 6 && mx < s.right - 6) {
        this.dir = d;
        this.chewing = { until: this.clock + 2.6, x: mx };
        this.change("react", "feed", 2.6);
        return true;
      }
    }
    return false;
  }

  tendChew() {
    const ch = this.chewing;
    if (this.clock < ch.until) return;
    this.chewing = null;
    const w = this.support.win;
    if (w) this.addBite(w, "top", ch.x - w.minX);
    this.nextChew = this.clock + rnd(12, 25);
    this.change("react", "shake", 0.8);
  }

  addBite(win, edge, off) {
    const same = this.bites.filter((b) => b.win === win.id);
    if (same.length >= 3) this.bites.splice(this.bites.indexOf(same[0]), 1);
    if (this.bites.length >= 10) this.bites.shift();
    this.bites.push({ win: win.id, edge, off });
    this.bitesVersion++;
  }

  // ---------------------------------------------------------------- in the air

  leap(t, catching) {
    const bw = this.bw;
    const h = clamp(t.y - this.pos.y + 0.3 * bw, 0.8 * bw, this.leapHeight);
    const vy = Math.sqrt(2 * G * h);
    const vx = clamp((t.x - this.pos.x) / Math.max(0.3, vy / G), -560, 560);
    this.v = { x: vx, y: vy };
    this.support = null;
    this.leaping = true;
    this.leapCatch = catching;
    this.nextLeap = this.clock + 0.9;
    this.leapt = true;
    this.fallAt = this.clock;
    this.sticky = false;
    this.lounge = null;
    if (Math.abs(vx) > 5) this.dir = vx > 0 ? 1 : -1;
    this.change("fall");
    this.trick = "leap";
  }

  tendAir(dt) {
    if (this.nap) this.finishNap(true);
    if (this.leaping) {
      if (this.v.y > -120) this.trick = "leap";
      if (this.play && this.cursor && this.bamboo >= 0.2 && this.speed < 900 && dist(this.reachPoint(), this.cursor) < 0.9 * this.bw) return this.grabCursor();
      if (this.leapCatch && this.hang(this.leapCatch)) return;
    } else if (this.sticky && this.clock - this.fallAt > 0.2 && this.v.y < -60 && this.stickyGrab()) return;
    const oldY = this.pos.y, W = this.world.W;
    this.v.y = Math.max(-1000, this.v.y - G * dt);
    this.pos.x += this.v.x * dt;
    this.pos.y += this.v.y * dt;
    if (this.pos.x < 12 || this.pos.x > W - 12) this.v.x = 0;
    if (this.v.y > 0) return;
    let best = null;
    for (const s of this.surfaces) {
      if (s.kind === "menu" || (s.win && s.win === this.fallFrom && this.clock - this.fallAt < 0.35)) continue;
      if (s.y <= oldY + 0.5 && s.y >= this.pos.y && this.supports(s, this.pos.x) && (!best || s.y > best.y)) best = s;
    }
    if (!best && this.pos.y <= this.world.F) best = this.surfaces[0];
    if (best) this.land(best);
  }

  land(s) {
    this.support = s;
    this.pos.y = s.y;
    this.v = { x: 0, y: 0 };
    this.leaping = false;
    this.leapCatch = null;
    this.fallFrom = null;
    if (this.sated) { this.sated = false; this.change("react", "pet", 1.8); }
    else if (this.leapt || this.play || this.errand) this.change("idle");
    else this.change("react", "shake", 0.8);
    this.leapt = false;
    this.nextChoice = this.clock + rnd(0.3, 0.8);
  }

  stickyGrab() {
    const bw = this.bw;
    for (const w of this.world.wins) {
      if (w === this.fallFrom) continue;
      for (const side of ["left", "right"]) {
        const standX = side === "left" ? w.minX - 0.4 * bw : w.maxX + 0.4 * bw;
        const y = this.pos.y + this.clingLift;
        if (Math.abs(this.pos.x - standX) < 0.5 * bw && y > w.minY + bw && y < w.maxY - bw && this.grabSide(w, side === "left" ? 1 : -1, false)) {
          this.sticky = false;
          return true;
        }
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- clinging

  gripPoint(c = this.cling) {
    const r = c.frame ? this.frameRect() : c.win;
    if (c.side === "under") return { x: r.minX + c.off.x, y: r.minY - this.underDrop };
    if (c.side === "top") return { x: r.minX + c.off.x, y: r.maxY - this.underDrop };
    return { x: r.minX + c.off.x, y: r.minY + c.off.y };
  }
  clingDir(c = this.cling) {
    if (flat(c.side)) return c.heading.x < 0 ? -1 : 1;
    if (c.frame) return c.side === "left" ? -1 : 1;
    return c.side === "left" ? 1 : -1;
  }
  standPoint(c = this.cling) {
    const g = this.gripPoint(c), bw = this.bw;
    if (flat(c.side)) return { x: g.x, y: g.y - 0.9 * bw };
    const out = c.side === "left" ? -1 : 1;
    return { x: g.x + (c.frame ? -out : out) * 0.4 * bw, y: g.y - 0.9 * bw };
  }
  place() {
    this.pos = this.gripPoint();
    this.dir = this.clingDir();
  }

  startCling(c) {
    const from = this.holding || this.cling ? { ...this.pos } : { x: this.pos.x, y: this.pos.y + 16 * this.s };
    this.cling = {
      heading: { x: 0, y: 1 }, climbed: 0, pace: 1, then: null, exiting: false, gnawUntil: 0, restUntil: 0,
      frame: false, holding: false, ...c, turnFrom: from, turnAt: this.clock,
    };
    this.support = null;
    this.climb = null;
    this.leaping = false;
    this.leapCatch = null;
    this.v = { x: 0, y: 0 };
    this.lounge = null;
    this.chewing = null;
    this.errand = null;
    this.change("climb");
    this.place();
  }

  grabSide(w, facing, toTop) {
    const bw = this.bw, h = w.maxY - w.minY, side = facing > 0 ? "left" : "right";
    if (h <= 3 * bw || !this.sideClear(w, side)) return false;
    const y = clamp(this.pos.y + this.clingLift - w.minY, 0.6 * bw, h - bw);
    this.startCling({
      win: w, side, off: { x: side === "left" ? 0 : w.maxX - w.minX, y },
      target: { side, y: Math.min(y + 3 * bw, h - bw) }, until: this.clock + rnd(10, 20),
    });
    if (toTop) {
      const ex = this.exitPoint();
      if (ex) { this.cling.target = ex; this.cling.exiting = true; this.cling.until = this.clock + h / 30 + 10; }
    }
    return true;
  }

  canHang(w) {
    const bw = this.bw, mid = (w.minX + w.maxX) / 2;
    if (w.maxX - w.minX < 3 * bw) return false;
    const g = this.highestBelow(mid, w.minY - 1);
    if (!g || w.minY - g.y <= 2.6 * bw) return false;
    return [w.minX + 4, mid, w.maxX - 4].every((x) => this.frontmost({ x, y: w.minY + 2 }) === w);
  }

  hang(w) {
    const bw = this.bw, p = this.pos;
    if (!(p.y + 2 * bw >= w.minY && p.y < w.minY && p.x >= w.minX && p.x <= w.maxX)) return false;
    if (this.frontmost({ x: p.x, y: w.minY + 2 }) !== w) return false;
    const width = w.maxX - w.minX, x = clamp(p.x - w.minX, bw, width - bw);
    const hx = Math.abs(this.v.x) > 5 ? Math.sign(this.v.x) : this.dir;
    this.startCling({
      win: w, side: "under", off: { x, y: 0 }, heading: { x: hx, y: 0 },
      target: { side: "under", x: clamp(x + hx * 3 * bw, bw, width - bw) }, until: this.clock + rnd(8, 16),
    });
    return true;
  }

  startFrameClimb(side, toTop) {
    const r = this.frameRect(), h = r.maxY - r.minY, w = r.maxX, bw = this.bw;
    if (h <= 5 * bw) return false;
    this.startCling({
      frame: true, side, off: { x: side === "left" ? 0 : w, y: this.clingLift },
      target: { side, y: rnd(2 * bw, h - 2 * bw) }, until: this.clock + rnd(8, 16),
    });
    if (toTop) {
      this.cling.target = { side: "top", x: rnd(2 * bw, w - 2 * bw) };
      this.cling.until = this.clock + (h + w / 2) / 30 + 3;
    }
    return true;
  }

  startEdgeDescent(d) {
    const s = this.support, w = s?.win, bw = this.bw;
    if (!w) return false;
    const h = w.maxY - w.minY, side = d < 0 ? "left" : "right", cx = d < 0 ? w.minX : w.maxX;
    if (h <= 4 * bw || Math.abs(cx - this.pos.x) > 16 || !this.sideClear(w, side)) return false;
    const c0 = { win: w, side, off: { x: side === "left" ? 0 : w.maxX - w.minX, y: h - 1.1 * bw } };
    const b = this.bottomFor(c0, false);
    if (!b || b.side !== side) return false;
    this.startCling({ ...c0, heading: { x: 0, y: -1 }, target: b, then: { kind: "dismount" }, until: this.clock + 30 });
    return true;
  }

  exitPoint(c = this.cling) {
    if (c.frame) return null;
    const w = c.win, h = w.maxY - w.minY, width = w.maxX - w.minX;
    const sides = c.side === "under" ? (c.off.x < width / 2 ? ["left", "right"] : ["right", "left"]) : [c.side];
    for (const side of sides) {
      const x = side === "left" ? w.minX + 12 : w.maxX - 12;
      const top = this.surfaces.find((s) => s.win === w && s.right - s.left >= 30 && this.supports(s, x));
      if (top && this.sideClear(w, side)) return { side, y: h - 0.9 * this.bw };
    }
    return null;
  }

  /** How far down this side goes before it would be quicker to hop off (null if it can't). */
  bottomFor(c, landing) {
    const w = c.win, bw = this.bw, width = w.maxX - w.minX;
    const side = c.side === "under" ? (c.off.x < width / 2 ? "left" : "right") : c.side;
    if (!this.sideClear(w, side)) return null;
    const outside = side === "left" ? w.minX - 0.4 * bw : w.maxX + 0.4 * bw;
    const ground = this.highestBelow(outside, w.maxY - 3 * bw);
    if (!ground) return null;
    const bottom = Math.max(w.minY + this.corner, ground.y + this.clingLift);
    if (bottom >= w.maxY - 2 * bw) return null;
    if (landing && bottom - 0.9 * bw - ground.y > 2.5 * bw) return null;
    return { side, y: bottom - w.minY };
  }

  mount() {
    const c = this.cling, w = c.win, x = c.side === "left" ? w.minX + 2 : w.maxX - 2;
    const top = this.surfaces.find((s) => s.win === w && this.supports(s, x, 14));
    this.cling = null;
    if (!top) { this.pos = this.standPoint(c); return this.drop(); }
    this.pos = { x: clamp(x, top.left, top.right), y: top.y - this.hangDepth - 1 };
    this.beginClimb(top, true);
  }

  dismount() {
    const c = this.cling, st = this.standPoint(), bw = this.bw;
    let best = null;
    for (const s of this.surfaces) {
      if (s.kind !== "menu" && this.supports(s, st.x) && s.y >= st.y - 2.5 * bw && s.y <= st.y + 1 && (!best || s.y > best.y)) best = s;
    }
    if (best) {
      const out = c.side === "left" ? -1 : 1;
      this.cling = null;
      this.pos = st;
      this.dir = out;
      this.nextChoice = this.clock + rnd(1.5, 3.5);
      if (st.y - best.y > 6) {
        this.support = null;
        this.v = { x: out * 40, y: 0 };
        this.leapt = true;
        this.fallAt = this.clock;
        this.change("fall");
      } else {
        this.support = best;
        this.pos.y = best.y;
        this.change("walk");
      }
      return;
    }
    if (!c.frame && c.side !== "under" && this.canHang(c.win)) {
      const width = c.win.maxX - c.win.minX;
      c.target = { side: "under", x: c.side === "left" ? 1.5 * bw : width - 1.5 * bw };
      c.then = { kind: "drop" };
      return;
    }
    this.letGo(0);
  }

  frameDismount() {
    const c = this.cling, { W, F } = this.world, side = c.side === "right" ? "right" : "left";
    this.cling = null;
    this.support = this.surfaces[0];
    this.pos = { x: side === "left" ? 12 : W - 12, y: F };
    this.dir = side === "left" ? 1 : -1;
    this.change("walk");
    this.nextChoice = this.clock + rnd(1.5, 3.5);
  }

  letGo(fling) {
    const c = this.cling;
    this.pos = this.standPoint(c);
    this.cling = null;
    this.fallFrom = c.win || null;
    this.fallAt = this.clock;
    this.support = null;
    this.v = { x: fling, y: 0 };
    this.sticky = false;
    this.change("fall");
  }

  climbStep(d, pace, dt) {
    const c = this.cling, progress = (((c.climbed / 9) % 1) + 1) % 1;
    const surge = 1 - 0.6 * Math.cos(4 * Math.PI * progress);
    const st = Math.min(d, pace * surge * dt);
    c.climbed += st / this.s;
    c.holding = st <= 0.01;
    return st;
  }

  strideFrame() {
    const c = this.cling;
    if (c.gnawUntil) return Math.floor(this.clock * 6) % 2;
    if (c.holding) return 4;
    return Math.floor(((((c.climbed / 9) % 1) + 1) % 1) * 4) % 4;
  }

  /** Steps toward the cling target, turning corners on the way. True once there. */
  moveCling(dt) {
    const c = this.cling, t = c.target, r = c.frame ? this.frameRect() : c.win;
    const w = r.maxX - r.minX, h = r.maxY - r.minY, fc = 0.9 * this.bw;
    let goal = t, next = null;
    if (t.side !== c.side) {
      if (c.frame) {
        if (flat(c.side)) {
          const left = t.side === "left";
          goal = { x: left ? fc : w - fc };
          next = { side: t.side, off: { x: left ? 0 : w, y: h - fc } };
        } else {
          goal = { y: h - fc };
          next = { side: "top", off: { x: c.side === "left" ? fc : w - fc, y: h } };
        }
      } else if (flat(c.side)) {
        const left = t.side === "left";
        goal = { x: left ? 0 : w };
        next = { side: t.side, off: { x: left ? 0 : w, y: this.corner } };
      } else {
        goal = { y: this.corner };
        next = { side: "under", off: { x: c.side === "left" ? 0 : w, y: 0 } };
      }
    }
    const pace = (flat(c.side) ? 30 : 36) * c.pace;
    let left;
    if (flat(c.side)) {
      const d = goal.x - c.off.x;
      c.off.x += Math.sign(d) * this.climbStep(Math.abs(d), pace, dt);
      if (Math.abs(d) > 0.01) c.heading = { x: Math.sign(d), y: 0 };
      left = Math.abs(goal.x - c.off.x);
    } else {
      const d = goal.y - c.off.y;
      c.off.y += Math.sign(d) * this.climbStep(Math.abs(d), pace, dt);
      if (Math.abs(d) > 0.01) c.heading = { x: 0, y: Math.sign(d) };
      left = Math.abs(goal.y - c.off.y);
    }
    if (left > 0.5) return false;
    if (!next) return true;
    c.turnFrom = this.gripPoint();
    c.turnAt = this.clock;
    c.side = next.side;
    c.off = next.off;
    c.heading = flat(c.side) ? { x: next.off.x < w / 2 ? 1 : -1, y: 0 } : { x: 0, y: 1 };
    return false;
  }

  tendClingAll(dt) {
    const c = this.cling;
    if (this.play) {
      const p = this.play;
      if (!this.cursor || this.clock > p.until || this.bamboo < 0.2) this.endPlay(rnd(3, 6));
      else if (p.phase === "notice") { if (this.clock >= p.phaseUntil) p.phase = "stalk"; }
      else if (this.speed < 900 && dist(this.reachPoint(), this.cursor) < 0.9 * this.bw) return this.grabCursor();
      else if (!c.gnawUntil) this.aimCling(this.cursor, 2.6);
    } else if (!c.gnawUntil && this.noticeCursor()) {
      c.restUntil = 0;
    }
    if (this.cling) this.tendCling(dt);
  }

  tendCling(dt) {
    const c = this.cling, r = c.frame ? this.frameRect() : c.win;
    const w = r.maxX - r.minX, h = r.maxY - r.minY, s = this.s;
    if (flat(c.side)) c.off.x = clamp(c.off.x, 0, w);
    else { c.off.x = c.side === "left" ? 0 : w; c.off.y = clamp(c.off.y, 0, h); }
    if (c.gnawUntil) {
      if (this.clock >= c.gnawUntil) {
        this.addBite(c.win, c.side, clamp(c.off.y + 13 * s, 5.5 * s, h - 5.5 * s));
        c.gnawUntil = 0;
        this.nextChew = this.clock + rnd(12, 25);
      } else {
        c.holding = true;
        return this.place();
      }
    }
    if (!c.frame && (c.side === "under" || c.target.side === "under") && !this.canHang(c.win)) {
      if (c.side === "under") return this.letGo(0);
      c.target = { side: c.side, y: c.off.y };
      c.then = { kind: "dismount" };
    }
    if (this.clock > c.until && !c.exiting && c.then?.kind !== "dismount" && !this.play) {
      if (c.frame) {
        const side = c.side === "top" ? (c.off.x < w / 2 ? "left" : "right") : c.side;
        c.target = { side, y: this.clingLift };
        c.then = { kind: "dismount" };
        c.until = this.clock + 60;
      } else {
        const ex = this.exitPoint();
        const b = ex ? null : this.bottomFor(c, true);
        if (ex) { c.target = ex; c.exiting = true; }
        else if (b) { c.target = b; c.then = { kind: "dismount" }; c.until = this.clock + 60; }
        else return this.letGo(0);
      }
    }
    const there = this.moveCling(dt);
    this.place();
    if (!there) return;
    if (c.exiting) return this.mount();
    if (c.then) {
      const t = c.then;
      if (t.kind === "leap") return this.leapFromCling();
      c.then = null;
      if (t.kind === "drop") return this.letGo(0);
      return c.frame ? this.frameDismount() : this.dismount();
    }
    c.holding = true;
    if (this.play) return;
    if (!c.restUntil) { c.restUntil = this.clock + rnd(0.5, 1.6); return; }
    if (this.clock < c.restUntil) return;
    c.restUntil = 0;
    if (c.frame) this.wanderFrame();
    else this.wanderEdges();
  }

  wanderEdges() {
    const c = this.cling, w = c.win, bw = this.bw, h = w.maxY - w.minY, width = w.maxX - w.minX;
    if (c.side !== "under") {
      if (this.clock >= this.nextChew && chance(0.45)) { c.gnawUntil = this.clock + rnd(2.2, 3.4); return; }
      const r = Math.random();
      if (r < 0.45) {
        let y = c.off.y;
        for (let i = 0; i < 8 && Math.abs(y - c.off.y) < 2 * bw; i++) y = rnd(bw, h - bw);
        c.target = { side: c.side, y };
        return;
      }
      if (r < 0.7) {
        const ex = this.exitPoint();
        if (ex) { c.target = ex; c.exiting = true; return; }
      }
      if (r < 0.85 && this.canHang(w)) { c.target = { side: "under", x: rnd(bw, width - bw) }; return; }
      const b = this.bottomFor(c, false);
      if (b) { c.target = b; c.then = { kind: "dismount" }; return; }
      return this.letGo(0);
    }
    const r = Math.random();
    if (r < 0.45) { c.target = { side: "under", x: rnd(bw, width - bw) }; return; }
    if (r < 0.8) {
      const side = c.off.x < width / 2 ? "left" : "right";
      if (this.sideClear(w, side)) { c.target = { side, y: rnd(this.corner + bw, h - bw) }; return; }
    }
    this.letGo(0);
  }

  wanderFrame() {
    const c = this.cling, r = this.frameRect(), h = r.maxY - r.minY, w = r.maxX, bw = this.bw;
    // a tile is a small screen: laps of it get dull, so it heads back down sooner than the app does
    if (c.side !== "top") {
      const k = Math.random();
      if (k < 0.3) c.target = { side: c.side, y: rnd(2 * bw, h - 2 * bw) };
      else if (k < 0.55) c.target = { side: "top", x: rnd(2 * bw, w - 2 * bw) };
      else { c.target = { side: c.side, y: this.clingLift }; c.then = { kind: "dismount" }; }
      return;
    }
    const below = this.highestBelow(this.pos.x, this.pos.y);
    if (below?.kind === "ledge" && chance(0.4)) return this.letGo(0);
    if (chance(0.35)) {
      let x = c.off.x;
      for (let i = 0; i < 8 && Math.abs(x - c.off.x) < 3 * bw; i++) x = rnd(2 * bw, w - 2 * bw);
      c.target = { side: "top", x };
      return;
    }
    const side = c.off.x < w / 2 ? "left" : "right";
    if (chance(0.6)) { c.target = { side, y: this.clingLift }; c.then = { kind: "dismount" }; }
    else c.target = { side, y: rnd(2 * bw, h - 2 * bw) };
  }

  /** While clinging, works toward the bamboo: level with it, then leap for it. */
  aimCling(p, pace) {
    const c = this.cling;
    c.pace = pace;
    c.until = Math.max(c.until, this.clock + 4);
    c.restUntil = 0;
    c.then = null;
    c.exiting = false;
    if (c.frame) return this.aimFrame(p);
    const w = c.win, bw = this.bw, width = w.maxX - w.minX, h = w.maxY - w.minY;
    const level = clamp(p.y - 14.6 * this.s - w.minY, 0.6 * bw, h - 0.9 * bw);
    const reach = 6 * bw;
    const canGo = (side) => side === c.side || (this.sideClear(w, side) && (c.side === "under" || this.canHang(w)));
    const edgeX = (side) => (side === "left" ? w.minX : w.maxX);
    if (p.y > w.maxY) {
      const ex = this.exitPoint();
      if (ex && p.x >= w.minX - bw && p.x <= w.maxX + bw) { c.target = ex; c.exiting = true; return; }
      const side = p.x < (w.minX + w.maxX) / 2 ? "left" : "right";
      if (!canGo(side) || Math.abs(p.x - edgeX(side)) > reach) return this.getDown(p);
      c.target = { side, y: h - 0.9 * bw };
      c.then = { kind: "leap" };
      return;
    }
    if (p.y < w.minY - bw) return this.getDown(p);
    if (p.x < w.minX || p.x > w.maxX) {
      const side = p.x < w.minX ? "left" : "right";
      if (!canGo(side)) {
        const ex = this.exitPoint();
        if (ex) { c.target = ex; c.exiting = true; return; }
        return this.getDown(p);
      }
      c.target = { side, y: level };
      const gap = Math.abs(p.x - edgeX(side));
      if (gap > 1.2 * bw && gap <= reach) c.then = { kind: "leap" };
      return;
    }
    if (p.y < w.minY + bw && this.canHang(w)) {
      c.target = { side: "under", x: clamp(p.x - w.minX, bw, width - bw) };
      c.then = { kind: "leap" };
      return;
    }
    let side = p.x - w.minX < w.maxX - p.x ? "left" : "right";
    if (!canGo(side)) side = c.side === "under" ? (canGo("left") ? "left" : "right") : c.side;
    if (!canGo(side)) return this.getDown(p);
    c.target = { side, y: level };
    const gap = Math.abs(p.x - edgeX(side));
    if (gap > 1.2 * bw && gap <= reach) c.then = { kind: "leap" };
  }

  getDown(p) {
    const c = this.cling, w = c.win;
    const b = this.bottomFor(c, true);
    if (b) { c.target = b; c.then = { kind: "dismount" }; return; }
    if (c.side === "under") {
      c.target = { side: "under", x: clamp(p.x - w.minX, this.bw, w.maxX - w.minX - this.bw) };
      c.then = { kind: "drop" };
      return;
    }
    c.target = { side: c.side, y: c.off.y };
    c.then = { kind: "drop" };
  }

  aimFrame(p) {
    const c = this.cling, r = this.frameRect(), w = r.maxX, h = r.maxY - r.minY, bw = this.bw;
    if (p.y > r.maxY - 3 * bw) {
      c.target = { side: "top", x: clamp(p.x, 0.9 * bw, w - 0.9 * bw) };
      c.then = { kind: "leap" };
      return;
    }
    const side = c.side === "top" ? (p.x < w / 2 ? "left" : "right") : c.side;
    const edge = side === "left" ? 0 : w;
    if (Math.abs(p.x - edge) > 8 * bw) { c.target = { side, y: this.clingLift }; c.then = { kind: "dismount" }; return; }
    c.target = { side, y: clamp(p.y - r.minY - 14.6 * this.s, this.clingLift, h - 0.9 * bw) };
    if (Math.abs(p.x - edge) > 1.2 * bw) c.then = { kind: "leap" };
  }

  leapFromCling() {
    const c = this.cling;
    if (this.clock < this.nextLeap || !this.cursor) { c.holding = true; return; }
    c.then = null;
    this.pos = this.standPoint(c);
    this.cling = null;
    this.fallFrom = c.win || null;
    this.leap({ x: this.cursor.x, y: this.cursor.y - 1.7 * this.bw }, null);
  }

  reachPoint() {
    if (this.cling) {
      const [hx, hy] = flat(this.cling.side) ? [3.4, 9.8] : [-5.2, 14.6];
      return { x: this.pos.x + hx * this.s * this.dir, y: this.pos.y + hy * this.s };
    }
    return { x: this.pos.x, y: this.pos.y + 1.7 * this.bw };
  }

  // ---------------------------------------------------------------- the bamboo

  noticeCursor() {
    const c = this.cursor, bw = this.bw;
    if (!c || this.play || this.nap || this.climb || this.chewing || this.holding || this.clock < this.nextPlay || this.bamboo < 0.6) return false;
    if (!this.support && !this.cling) return false;
    if (Math.hypot(c.x - this.pos.x, c.y - this.pos.y - bw) <= 0.9 * bw) return false;
    if (Math.random() >= this.dt * 2.5) return false;
    this.play = { phase: "notice", phaseUntil: this.clock + rnd(0.3, 0.7), until: this.clock + 25, misses: 0, stuckAt: 0 };
    this.errand = null;
    this.lounge = null;
    if (this.support) {
      this.dir = c.x >= this.pos.x ? 1 : -1;
      this.change("look");
    }
    return true;
  }

  endPlay(cool) {
    this.play = null;
    this.nextPlay = this.clock + cool;
  }

  tendChase(dt) {
    const p = this.play, c = this.cursor, bw = this.bw;
    if (!c || this.clock > p.until || this.bamboo < 0.2) { this.endPlay(rnd(3, 6)); return false; }
    const reach = this.reachPoint();
    const dx = Math.abs(c.x - this.pos.x);
    const inBand = c.y >= this.pos.y - 4 && c.y <= reach.y + 1.5 * bw;
    if (dx > 2) this.dir = c.x > this.pos.x ? 1 : -1;
    if (p.phase === "notice") {
      this.change("look");
      if (this.clock >= p.phaseUntil) p.phase = "stalk";
      return true;
    }
    if (p.phase === "swipe") {
      this.change("react", "pounce");
      if (this.clock < p.phaseUntil) return true;
      if (dx < 0.8 * bw && inBand && this.speed < 900 && c.y - this.hangDrop >= this.support.y) {
        this.grabCursor();
        return true;
      }
      p.phase = "stalk";
      p.lookUntil = this.clock + 0.35;
      if (++p.misses >= 4) { this.endPlay(rnd(4, 8)); this.change("look"); }
      return true;
    }
    if (this.clock < (p.lookUntil || 0)) { this.change("look"); return true; }
    if (dx < 0.6 * bw && inBand) {
      p.phase = "swipe";
      p.phaseUntil = this.clock + 0.4;
      this.change("react", "pounce");
      return true;
    }
    if (this.approach(c, true, dt)) { p.stuckAt = 0; return true; }
    if (!p.stuckAt) p.stuckAt = this.clock;
    if (this.clock - p.stuckAt > 2.5) { this.endPlay(rnd(3, 6)); this.change("sniff"); return true; }
    this.change("look");
    return true;
  }

  grabCursor() {
    const p = this.play;
    p.phase = "hang";
    p.until = this.clock + 30;
    this.cling = null;
    this.support = null;
    this.climb = null;
    this.leaping = false;
    this.leapCatch = null;
    this.errand = null;
    this.lounge = null;
    this.holding = true;
    this.pos.y += this.hangDrop;
    this.leapUntil = this.clock + 0.25;
    this.swing = 0;
    this.swingRate = this.dir * 1.5;
    this.flips = [];
    this.flipSign = 0;
    this.change("hang");
    this.trick = "hang";
  }

  tendHang(dt) {
    const c = this.cursor;
    if (!c) return this.dropFromCursor(0, rnd(3, 6));
    const vx = this.cv.x;
    if (Math.abs(vx) > 700) {
      const sg = Math.sign(vx);
      if (sg !== this.flipSign) { this.flips.push(this.clock); this.flipSign = sg; }
    }
    this.flips = this.flips.filter((t) => this.clock - t < 0.9);
    if (this.flips.length >= 4 || this.speed > 4200 || this.clock > this.play.until) return this.dropFromCursor(0.15, rnd(6, 10));
    this.bamboo -= dt / 6;
    if (this.bamboo <= 0) {
      this.bamboo = 0;
      this.sated = true;
      return this.dropFromCursor(0, rnd(10, 15));
    }
    if (this.clock < this.leapUntil) {
      const k = Math.min(1, dt * 18);
      this.pos = { x: lerp(this.pos.x, c.x, k), y: lerp(this.pos.y, c.y, k) };
    } else this.pos = { x: c.x, y: c.y };
    const target = clamp(-vx / 2400, -0.5, 0.5);
    this.swingRate += (-(this.swing - target) * 60 - this.swingRate * 5) * dt;
    this.swing = clamp(this.swing + this.swingRate * dt, -0.7, 0.7);
    if (Math.abs(vx) > 40) this.dir = vx > 0 ? 1 : -1;
    this.trick = "hang";
  }

  dropFromCursor(fling, cool) {
    this.holding = false;
    this.pos.y -= this.hangDrop;
    this.v = { x: clamp(this.cv.x * fling, -300, 300), y: clamp(this.cv.y * fling, -200, 300) };
    this.swing = 0;
    this.support = null;
    this.fallAt = this.clock;
    this.sticky = false;
    this.leapt = false;
    this.endPlay(cool);
    this.change("fall");
  }

  // ---------------------------------------------------------------- naps

  startNap() {
    this.nap = { stage: "looking", at: this.clock, tries: 0, wantTop: chance(0.75) };
    this.errand = null;
    this.lounge = null;
    this.change("idle");
  }

  napTop() {
    let best = null, bd = Infinity;
    for (const L of this.surfaces) {
      if (L.kind !== "ledge" || L.right - L.left < 2.6 * this.bw || L.y + 2 * this.bw > this.world.C) continue;
      const d = Math.abs(clamp(this.pos.x, L.left, L.right) - this.pos.x) + Math.abs(L.y - this.pos.y);
      if (d < bd) { bd = d; best = L; }
    }
    return best;
  }

  tendNap(dt) {
    const n = this.nap, s = this.support, bw = this.bw;
    if (n.stage === "looking") {
      if (this.errand) {
        if (this.clock - n.at > 45) this.errand = null;
        else { this.tendErrand(dt); return true; }
      }
      const roomy = s.kind === "ledge" && s.right - s.left >= 2.6 * bw;
      if (roomy || !n.wantTop || n.tries >= 2 || this.clock - n.at > 45) {
        const inset = Math.min(1.2 * bw, (s.right - s.left) / 2);
        n.spot = clamp(this.pos.x, s.left + inset, s.right - inset);
        n.stage = "walking";
        return true;
      }
      n.tries++;
      const top = this.napTop();
      if (top) {
        const inset = Math.min(1.2 * bw, (top.right - top.left) / 2);
        this.errand = { kind: "spot", x: rnd(top.left + inset, top.right - inset), y: top.y, until: this.clock + 30 };
        this.change("walk");
      }
      return true;
    }
    if (n.stage === "walking") {
      const d = n.spot - this.pos.x;
      if (Math.abs(d) > 1) {
        this.dir = Math.sign(d);
        this.pos.x += Math.sign(d) * Math.min(Math.abs(d), 34 * dt);
        this.change("walk");
        return true;
      }
      n.stage = "settling";
      n.stageAt = this.clock;
      this.change("yawn");
      return true;
    }
    if (n.stage === "settling") {
      if (this.clock - n.stageAt < 1.6) { this.change("yawn"); return true; }
      n.stage = "asleep";
      n.until = this.clock + rnd(14, 22);
      n.sniff = 0;
    }
    if (n.stage === "asleep") {
      if (this.pointer && !n.shortened) {
        n.shortened = true;
        n.woken = true;
        n.until = Math.min(n.until, this.clock + rnd(3, 5));
      }
      const nose = this.sleepNose();
      if (this.cursor && dist(this.cursor, nose) < 1.3 * bw) {
        this.stirUntil = this.clock + 0.5;
        n.sniff += dt;
        if (n.sniff >= 2 && this.bamboo >= 0.6) {
          this.finishNap(true);
          this.play = { phase: "notice", phaseUntil: this.clock + 0.4, until: this.clock + 25, misses: 0, stuckAt: 0 };
          this.change("look");
          return true;
        }
      } else n.sniff = 0;
      this.change("sleep");
      this.trick = this.sleepPose();
      if (this.clock >= n.until) { n.stage = "waking"; n.stageAt = this.clock; }
      return true;
    }
    const t = this.clock - n.stageAt;
    if (t < 1.4) this.change("stretch");
    else if (t < 2.6) this.change("yawn");
    else if (t < 5.4) { this.change("sit"); this.trick = "groom"; }
    else { this.finishNap(n.woken); return false; }
    return true;
  }

  finishNap(woken) {
    this.nap = null;
    this.nextNap = this.clock + (woken ? rnd(40, 60) : rnd(30, 50));
    this.lounge = null;
    this.change("idle");
    this.nextChoice = this.clock + rnd(0.5, 1.5);
  }

  sleepPose() {
    const base = this.support?.kind === "ledge" ? "drape" : "sprawl";
    if (this.clock < this.snuggleUntil) return `${base}Snuggle`;
    if (this.clock < this.stirUntil || this.hover) return `${base}Stir`;
    return base;
  }

  sleepNose() {
    const ledge = this.support?.kind === "ledge";
    return { x: this.pos.x + this.dir * 0.85 * this.bw, y: this.pos.y + this.bw * (ledge ? 0.35 : 0.45) };
  }

  // ---------------------------------------------------------------- people

  pet() {
    if (this.holding) return;
    if (this.asleep) {
      this.snuggleUntil = this.clock + 2.4;
      this.nap.until = Math.max(this.nap.until, this.clock + 8);
      this.nap.shortened = true;
      return;
    }
    if (!this.support || this.nap) return;
    this.lounge = null;
    this.errand = null;
    this.chewing = null;
    if (this.play) this.endPlay(2.5);
    this.change("react", "pet", 2);
  }

  wake() {
    if (!this.nap || !this.support) return;
    this.finishNap(true);
    this.change("react", "shake", 0.8);
  }

  // ---------------------------------------------------------------- drawing

  /** What to draw: pose, how it's anchored, and the sleep bubble. */
  view() {
    const s = this.s;
    if (this.holding) return { pose: "hang", t: this.clock, rate: 12, kind: "hang", x: this.pos.x, y: this.pos.y, flip: this.dir < 0, angle: this.swing };
    if (this.cling) {
      const c = this.cling;
      const pose = c.gnawUntil ? "gnaw" : flat(c.side) ? "shimmy" : c.heading.y >= 0 ? "scale" : "scaleDown";
      const k = smooth(clamp((this.clock - c.turnAt) / 0.3, 0, 1));
      return {
        pose, frame: this.strideFrame(), kind: "center", flip: this.dir < 0,
        x: lerp(c.turnFrom.x, this.pos.x, k), y: lerp(c.turnFrom.y, this.pos.y, k),
      };
    }
    let pose = this.trick || (this.action === "react" ? this.react : this.action);
    if (pose === "sleep") pose = this.sleepPose();
    const asleep = /^(drape|sprawl)/.test(pose);
    const timed = this.action === "react" || this.action === "yawn" || this.action === "stretch";
    const view = {
      pose, kind: "foot", flip: this.dir < 0, x: this.pos.x,
      y: pose.startsWith("drape") ? this.pos.y - 13 * s : this.pos.y,
      t: timed && !this.trick ? this.clock - this.actionAt : this.clock,
      rate: asleep ? 4 : pose === "walk" && this.running ? 12 * 2.6 : 12,
    };
    if (asleep) {
      const heart = this.clock < this.snuggleUntil;
      const [hx, hy] = pose.startsWith("drape") ? [26, 4] : [26, 14];
      view.bubble = {
        kind: heart ? "heart" : "z",
        frame: heart ? Math.floor(this.clock * 2) % 2 : Math.floor(this.clock * 1.5) % 4,
        rightward: this.dir > 0,
        x: this.pos.x + this.dir * (hx - 16) * s,
        y: view.y + (32 - hy) * s,
        ax: heart ? 0.5 : this.dir > 0 ? 0 : 1,
      };
    }
    return view;
  }
}
