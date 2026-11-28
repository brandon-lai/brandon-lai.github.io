"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "../../components/Icons";
import { useNear } from "../near";

export const PERCH = "https://perchpet.vercel.app";

/**
 * Perch, my Mac app: its red panda living on a little desktop inside the tile. It walks the Dock,
 * climbs and naps on the windows, and chews their edges. Point in here and the cursor turns into
 * bamboo, which it chases, grabs and eats, the same as the app. The engine and art load only
 * once the block is near, and it only runs while it is on screen.
 */
export default function PerchDesk() {
  const root = useRef(null);
  const canvas = useRef(null);
  const near = useNear(root);
  const [clock, setClock] = useState("");

  useEffect(() => {
    if (!near) return;
    let stop = () => {};
    let dead = false;
    Promise.all([import("./panda.js"), import("./pixel.js"), import("./art.json")]).then(([engine, px, art]) => {
      if (!dead && root.current && canvas.current) stop = live(root.current, canvas.current, engine.Panda, px, art.default ?? art);
    });
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const timer = setInterval(tick, 30000);
    return () => {
      dead = true;
      stop();
      clearInterval(timer);
    };
  }, [near]);

  return (
    <div className="asm-perch-desk" ref={root}>
      <div className="asm-perch-menu" aria-hidden="true">
        <i className="asm-perch-mark" />
        <b>Perch</b>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span className="asm-perch-clock">{clock}</span>
      </div>
      <div className="asm-perch-win is-photos" data-win="photos" aria-hidden="true">
        <WinBar title="Photos" />
        <div className="asm-perch-photos">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <div className="asm-perch-win is-notes" data-win="notes" aria-hidden="true">
        <WinBar title="Notes" />
        <div className="asm-perch-lines">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <div className="asm-perch-win is-about" data-win="about">
        <WinBar title="About Perch" />
        <div className="asm-perch-copy">
          <div className="eyebrow">
            <span data-step="1">Side project · macOS</span>
          </div>
          <div className="asm-big">
            <span data-step="2">Perch</span>
          </div>
          <p className="asm-note">
            <span data-step="3">A red panda that lives on your Mac desktop. </span>
            <span data-step="3" className="for-mouse">
              Point in here and your cursor turns into bamboo.
            </span>
            <span data-step="3" className="for-touch">
              Tap in here to hold out some bamboo.
            </span>
          </p>
          <a className="asm-inline" href={PERCH} target="_blank" rel="noreferrer">
            <span data-step="3">Meet Perch</span> <ArrowUpRight width={13} height={13} />
          </a>
        </div>
      </div>
      <div className="asm-perch-dock" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <i key={i} />
        ))}
      </div>
      <canvas ref={canvas} aria-hidden="true" />
      {/* the agent types `<RedPanda />` and this turns on: that's when it drops in */}
      <i data-step="4" data-panda hidden />
    </div>
  );
}

function WinBar({ title }) {
  return (
    <div className="asm-perch-bar" aria-hidden="true">
      <i />
      <i />
      <i />
      <span>{title}</span>
    </div>
  );
}

/** Runs the desktop: measures the windows, ticks the panda, draws it. Returns a teardown. */
function live(root, cv, Panda, px, art) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const marker = root.querySelector("[data-panda]");
  const ctx = cv.getContext("2d");
  const pal = px.palette(art.palette.colors, art.palette.outline, {
    softOutline: art.palette.softOutline,
    soft: ["u", "U"],
    post: ["x"],
  });
  const bitePal = px.bitePalette(), zPal = px.zPalette(), bambooPal = px.bambooPalette();
  const cache = new Map();
  const get = (key, make) => {
    let img = cache.get(key);
    if (!img) cache.set(key, (img = make()));
    return img;
  };

  let W = 0, H = 0, dpr = 1, s = 1.5, world = null, byId = new Map();
  let panda = null, visible = false, raf = 0, timer = 0, last = 0;
  let inside = false, client = null, overLink = false, touch = null, lastTouch = -1e9;
  let cursorKey = "";

  const scaleFor = (w) => Math.max(1, Math.round((w >= 480 ? 1.5 : 1.3) * dpr)) / dpr;

  function measure() {
    W = root.clientWidth;
    H = root.clientHeight;
    if (!W || !H) return false;
    dpr = window.devicePixelRatio || 1;
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (cv.width !== bw || cv.height !== bh) {
      cv.width = bw;
      cv.height = bh;
    }
    const menu = root.querySelector(".asm-perch-menu"), dock = root.querySelector(".asm-perch-dock");
    // front to back: the DOM paints later windows on top
    const wins = [...root.querySelectorAll("[data-win]")]
      .filter((el) => el.offsetParent)
      .map((el) => ({
        id: el.dataset.win,
        minX: el.offsetLeft,
        maxX: el.offsetLeft + el.offsetWidth,
        minY: H - (el.offsetTop + el.offsetHeight),
        maxY: H - el.offsetTop,
      }))
      .reverse();
    world = { wins, W, H, F: H - dock.offsetTop, C: H - menu.offsetHeight };
    byId = new Map(wins.map((w) => [w.id, w]));
    return true;
  }

  function relayout() {
    if (!measure()) return;
    if (panda && scaleFor(W) !== s) despawn();
    if (panda) panda.setWorld(world);
    if (!panda && (reduce || marker.classList.contains("is-on"))) spawn();
    draw();
  }

  function spawn() {
    if (!world) return;
    s = scaleFor(W);
    panda = new Panda(s);
    panda.setWorld(world);
    if (reduce) {
      // no motion: it's asleep, draped over the About window
      const L = panda.surfaces.find((x) => x.id.startsWith("about")) || panda.surfaces[0];
      panda.support = L;
      panda.pos = { x: L.left + (L.right - L.left) * 0.74, y: L.y };
      panda.dir = -1;
      panda.nap = { stage: "asleep", until: Infinity };
      panda.change("sleep");
      panda.trick = panda.sleepPose();
      panda.clock = 1.4;
    }
    last = 0;
    schedule();
  }

  function despawn() {
    panda = null;
    touch = null;
    setCursor();
    draw();
  }

  /* ---- input ---------------------------------------------------------- */

  const toLocal = (c) => {
    const r = root.getBoundingClientRect();
    return { x: ((c.x - r.left) * W) / (r.width || 1), y: ((c.y - r.top) * H) / (r.height || 1) };
  };
  const stalk = () => px.bambooPixels(panda ? panda.bamboo : 1);
  /** The bamboo's chewing end, in the engine's y-up space, for a stalk held at `p` (y-down). */
  const stalkEnd = (p) => ({ x: p.x, y: H - p.y - (stalk() - 1) * s });

  function hitPanda(p) {
    if (!panda) return false;
    const v = panda.view(), y = H - p.y;
    if (v.kind === "foot") return Math.abs(p.x - v.x) < 13 * s && y > v.y && y < v.y + 24 * s;
    if (v.kind === "center") return Math.abs(p.x - v.x) < 16 * s && Math.abs(y - v.y) < 16 * s;
    return false;
  }

  function cursorURL(len) {
    return get(`cur:${len}:${s * dpr}`, () => {
      const art = px.sprite(px.bambooGrid(len), bambooPal);
      const k = Math.round(s * dpr), c = document.createElement("canvas");
      c.width = art.width * k;
      c.height = art.height * k;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.drawImage(art, 0, 0, c.width, c.height);
      return { url: c.toDataURL(), k };
    });
  }

  /** A bamboo cursor while a mouse is in here, sized to what's left of the stalk. */
  function setCursor() {
    const len = stalk();
    const want = panda && !reduce && inside && !overLink && !touch && len > 0 ? `${len}` : "";
    if (want === cursorKey) return;
    cursorKey = want;
    if (!want) return void (root.style.cursor = "");
    const { url, k } = cursorURL(len);
    const res = k / s;
    const hx = Math.round(px.BAMBOO.centerX * s), hy = Math.round(1.5 * s);
    for (const v of [
      `image-set(url(${url}) ${res}x) ${hx} ${hy}, auto`,
      `-webkit-image-set(url(${url}) ${res}x) ${hx} ${hy}, auto`,
      `url(${url}) ${hx} ${hy}, auto`,
    ]) {
      root.style.cursor = "";
      root.style.cursor = v;
      if (root.style.cursor) break;
    }
  }

  const onMove = (e) => {
    if (e.pointerType !== "mouse") {
      if (touch && touch.id === e.pointerId) Object.assign(touch, toLocal({ x: e.clientX, y: e.clientY }));
      return;
    }
    inside = true;
    client = { x: e.clientX, y: e.clientY };
    overLink = !!e.target.closest?.("a");
    setCursor();
    schedule();
  };
  const onLeave = (e) => {
    if (e.pointerType !== "mouse") return;
    inside = false;
    client = null;
    setCursor();
  };
  const onDown = (e) => {
    if (e.pointerType === "mouse" || !panda || reduce || e.target.closest?.("a")) return;
    lastTouch = performance.now();
    const p = toLocal({ x: e.clientX, y: e.clientY });
    if (hitPanda(p)) return panda.pet();
    touch = { id: e.pointerId, ...p, until: Infinity };
    setCursor();
    schedule();
  };
  const onUp = (e) => {
    if (touch && touch.id === e.pointerId) touch.until = performance.now() + 8000;
  };
  const onClick = (e) => {
    if (!panda || reduce || performance.now() - lastTouch < 800 || e.target.closest?.("a")) return;
    if (hitPanda(toLocal({ x: e.clientX, y: e.clientY }))) panda.pet();
  };
  const onDouble = (e) => {
    if (!panda || reduce || e.target.closest?.("a")) return;
    if (hitPanda(toLocal({ x: e.clientX, y: e.clientY }))) panda.wake();
  };

  /* ---- loop ------------------------------------------------------------ */

  function schedule() {
    if (raf || timer || !panda || reduce || !visible || document.hidden) return;
    // asleep and alone: a few frames a second is plenty for breathing and z's
    if (panda.asleep && !inside && !touch) timer = setTimeout(() => ((timer = 0), (raf = requestAnimationFrame(frame))), 220);
    else raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    if (!panda) return;
    const busy = inside || touch || panda.holding;
    // nobody around: 30 fps is smooth enough for a walk
    if (!busy && last && now - last < 30) return schedule();
    let dt = last ? Math.min((now - last) / 1000, 0.5) : 1 / 60;
    last = now;
    if (touch && now > touch.until) touch = null;
    let ptr = null;
    if (inside && client && !overLink) ptr = toLocal(client);
    const cur = touch ? stalkEnd(touch) : ptr ? stalkEnd(ptr) : null;
    panda.pointer = !!(inside || touch);
    panda.hover = !!ptr && panda.asleep && hitPanda(ptr);
    while (dt > 1e-4) {
      const d = Math.min(dt, 0.05);
      panda.tick(d, cur);
      dt -= d;
    }
    setCursor();
    draw();
    schedule();
  }

  /* ---- drawing --------------------------------------------------------- */

  const occluded = (r, win) => {
    for (const w of world.wins) {
      if (w.id === win.id) return false;
      if (r.minX < w.maxX && r.maxX > w.minX && r.minY < w.maxY && r.maxY > w.minY) return true;
    }
    return false;
  };

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!panda || !world) return;
    ctx.imageSmoothingEnabled = false;
    const S = s * dpr;
    const X = (x) => Math.round(x * dpr), Y = (y) => Math.round((H - y) * dpr);
    const put = (img, x, top) => ctx.drawImage(img, X(x), Y(top), img.width * S, img.height * S);

    for (const b of panda.bites) {
      const w = byId.get(b.win);
      if (!w) continue;
      const img = get(`bite:${b.edge}`, () => px.sprite(px.biteGrid(b.edge), bitePal));
      const rw = img.width * s, rh = img.height * s;
      const x = b.edge === "top" ? w.minX + b.off - rw / 2 : b.edge === "left" ? w.minX : w.maxX - rw;
      const y = b.edge === "top" ? w.maxY - rh : w.minY + b.off - rh / 2;
      if (!occluded({ minX: x, minY: y, maxX: x + rw, maxY: y + rh }, w)) put(img, x, y + rh);
    }

    const v = panda.view();
    const pose = art.poses[v.pose] || art.poses.idle;
    const fi = v.frame ?? pose.slots[Math.floor(v.t * v.rate) % 12] % pose.frames.length;
    const img = get(`${v.pose}:${fi}:${v.flip ? 1 : 0}`, () => px.sprite(pose.frames[fi], pal, v.flip));
    const half = (img.width / 2) * s;
    if (v.kind === "hang") {
      // teeth on the stalk's end, swinging about them
      const reach = 17.5 * s;
      ctx.save();
      ctx.translate(X(v.x + reach * Math.sin(v.angle)), Y(v.y - reach * Math.cos(v.angle)));
      ctx.rotate(-v.angle);
      ctx.drawImage(img, Math.round(-half * dpr), -img.height * S, img.width * S, img.height * S);
      ctx.restore();
    } else if (v.kind === "center") put(img, v.x - half, v.y + half);
    else put(img, v.x - half, v.y + img.height * s);

    if (v.bubble) {
      const b = v.bubble;
      const bub =
        b.kind === "heart"
          ? get(`heart:${b.frame}`, () => px.sprite(px.heartGrid(b.frame), pal))
          : get(`z:${b.frame}:${b.rightward ? 1 : 0}`, () => px.sprite(px.zGrid(b.frame, b.rightward), zPal));
      put(bub, b.x - b.ax * bub.width * s, b.y + bub.height * s);
    }

    if (touch) {
      const len = stalk();
      if (len > 0) {
        const st = get(`stalk:${len}`, () => px.sprite(px.bambooGrid(len), bambooPal));
        put(st, touch.x - px.BAMBOO.centerX * s, H - touch.y + 1.5 * s);
      }
    }
  }

  /* ---- wiring ---------------------------------------------------------- */

  let pending = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(relayout);
  });
  ro.observe(root);
  root.querySelectorAll("[data-win]").forEach((el) => ro.observe(el));
  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    last = 0;
    schedule();
  });
  io.observe(root);
  const mo = new MutationObserver(() => {
    const on = marker.classList.contains("is-on");
    if (on && !panda) spawn();
    else if (!on && panda && !reduce) despawn();
  });
  mo.observe(marker, { attributes: true, attributeFilter: ["class"] });
  const onVis = () => {
    last = 0;
    schedule();
  };
  document.addEventListener("visibilitychange", onVis);
  if (!reduce) {
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerover", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("click", onClick);
    root.addEventListener("dblclick", onDouble);
  }
  // test hook: the live panda and its world
  window.__perch = { get panda() { return panda; }, get world() { return world; } };
  relayout();

  return () => {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(pending);
    clearTimeout(timer);
    ro.disconnect();
    io.disconnect();
    mo.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerover", onMove);
    root.removeEventListener("pointerleave", onLeave);
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointerup", onUp);
    root.removeEventListener("pointercancel", onUp);
    root.removeEventListener("click", onClick);
    root.removeEventListener("dblclick", onDouble);
    root.style.cursor = "";
    panda = null;
    delete window.__perch;
  };
}
