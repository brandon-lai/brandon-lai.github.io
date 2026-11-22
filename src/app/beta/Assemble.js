"use client";

import { useEffect, useRef } from "react";
import { BLOCKS, FOOTPRINT, HELPERS, MAX_CUBES, TIMELINE } from "./blocks";
import { Bot, IsoCube } from "./Bot";
import { createAssembler } from "./engine";

/** ropes, strings and cables, drawn in world space between helpers and blocks */
const LINES = {
  haul: ["rope"],
  balloon: ["s0", "s1", "s2"],
  crane: ["cable", "sl0", "sl1"],
  roller: ["pole"],
};

const PASTELS = [
  ["#FFE1DB", "#FFC2B7", "#FFA897"],
  ["#FFF3C9", "#FFE49A", "#F8D670"],
  ["#E0EDFF", "#BFD8FF", "#A3C6FF"],
  ["#D9F6E9", "#B3EBD2", "#92DFBD"],
  ["#ECE5FF", "#D6CAFF", "#C1AFFF"],
  ["#FFFFFF", "#EEEEF2", "#E2E2E8"],
];
const BALLOONS = ["#FF6B6B", "#FFC53D", "#4C8DFF"];
const CONFETTI = ["#FF4D4F", "#F5B300", "#3B82F6", "#1FA971", "#8B5CF6", "#FF7A45"];

/** a small seeded PRNG, so the parallax layers render the same on server and client */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layer(seed, n, { depth, size, edge }) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const f = depth[0] + r() * (depth[1] - depth[0]);
    const side = r();
    const x = edge ? (side < 0.5 ? -4 + r() * 18 : 82 + r() * 16) : r() * 96;
    return {
      key: i,
      f,
      x,
      y: -150 + r() * (2300 * f + 1000),
      s: size[0] + r() * (size[1] - size[0]),
      spin: (r() - 0.5) * 2,
      seed: r() * 10,
      c: PASTELS[Math.floor(r() * PASTELS.length)],
    };
  });
}
const BACK = layer(7, 22, { depth: [0.18, 0.62], size: [26, 92] });
const FRONT = layer(19, 8, { depth: [1.5, 2.4], size: [120, 240], edge: true });
const PIECES = (() => {
  const r = rng(3);
  return Array.from({ length: 70 }, (_, i) => ({
    key: i,
    x: r() * 100,
    d: 2.4 + r() * 2.6,
    dl: -r() * 5,
    c: CONFETTI[i % CONFETTI.length],
    r: (r() - 0.5) * 1440,
    sway: (r() - 0.5) * 160,
    w: 6 + r() * 6,
  }));
})();

function DepthCube({ c, front }) {
  return (
    <div
      className="asm-depth"
      data-depth={c.f}
      data-x={c.x}
      data-y={c.y}
      data-spin={front ? c.spin * 0.3 : c.spin}
      data-seed={c.seed}
      style={{ left: `${c.x}%`, width: c.s }}
    >
      <IsoCube top={c.c[0]} left={c.c[1]} right={c.c[2]} line="var(--asm-cube-line)" />
    </div>
  );
}

function Fx({ b }) {
  const k = (name) => `${b.id}:${name}`;
  switch (b.act) {
    case "agent":
      return (
        <div className="asm-term" data-fx={k("term")}>
          <div className="asm-term-bar">
            <i />
            <i />
            <i />
            <span>{b.title}</span>
          </div>
          <div className="asm-term-body">
            {b.script.map((l, i) => (
              <div key={i} data-ln={i} className={l.ok ? "ok" : l.add ? "add" : l.dim ? "dim" : undefined} />
            ))}
          </div>
        </div>
      );
    case "balloon":
      return BALLOONS.map((c, i) => <div key={i} className="asm-balloon" data-fx={k(`b${i}`)} style={{ "--c": c }} />);
    case "crane":
      return (
        <svg className="asm-hook" data-fx={k("hook")} viewBox="0 0 28 40" width="28" height="40">
          <rect x="6" y="0" width="16" height="12" rx="3" />
          <path d="M14 12v12a7 7 0 1 1 -7 -7" />
        </svg>
      );
    case "spray":
      return Array.from({ length: 14 }, (_, i) => <i key={i} className="asm-mist" data-fx={k(`mist${i}`)} />);
    case "roller":
      return <div className="asm-roller" data-fx={k("roller")} />;
    case "voxel":
      return Array.from({ length: MAX_CUBES }, (_, i) => (
        <div key={i} className="asm-cube" data-fx={k(`cube${i}`)} style={{ "--c": PASTELS[i % PASTELS.length][1] }} />
      ));
    case "stamp":
      return (
        <>
          <div className="asm-stamp" data-fx={k("stamp")}>
            <div className="knob" />
            <div className="neck" />
            <div className="block" />
          </div>
          <div className="asm-splat" data-fx={k("splat")} />
        </>
      );
    case "unroll":
      return <div className="asm-roll" data-fx={k("roll")} />;
    default:
      return null;
  }
}

/**
 * Easter egg: poke a helper and it hops and says something about the block
 * it built. Poke again for small talk. Plus a hello for anyone in devtools.
 */
const SAYS = {
  hero: "Hard hats on, please.",
  lived: "Seven cities. I carried every box.",
  linkedin: "Connect with him. I\u2019ll wait.",
  watches: "That watch keeps real time. Check it.",
  work: "Five jobs. One crew.",
  bench: "Steel. I polished it myself.",
  marathon: "Three times 26.2? I took the elevator.",
  tennis: "Quiet, please.",
  tiramisu: "Press the stamp. Go on.",
  rockpool: "Heavy. It's full of water.",
  myrel: "It never forgets a birthday.",
  smoodi: "Smoothie? It cleans up after itself.",
  also: "Equalizing. Back in a sec.",
  quote: "Words to build by.",
  beli: "Table for one?",
  running: "Can\u2019t talk. Tempo run.",
  banner: "That\u2019s a wrap!",
  foreman: "Union break in five.",
};
const SMALL_TALK = ["Hey!", "That tickles.", "Back to work.", "I\u2019m on the clock.", "Do you mind?"];

function pokeable(root) {
  if (!root) return;
  console.log(
    `%cHi, curious one.%c This page was put together by ${HELPERS} helpers while you scrolled. Try poking one.`,
    "font-weight:700",
    "",
  );
  const layer = root.querySelector(".asm-bots");
  const bubble = document.createElement("div");
  bubble.className = "asm-say";
  bubble.setAttribute("role", "status");
  layer.appendChild(bubble);
  const pokes = new WeakMap();
  let hideTimer = 0;
  const onClick = (e) => {
    const bot = e.target.closest?.(".bot");
    if (!bot) return;
    const n = pokes.get(bot) ?? 0;
    pokes.set(bot, n + 1);
    bot.classList.remove("is-poked");
    void bot.getBoundingClientRect();
    bot.classList.add("is-poked");
    const block = bot.dataset.bot.split(":")[0];
    bubble.textContent = n === 0 ? SAYS[block] ?? "Hi!" : SMALL_TALK[(n - 1) % SMALL_TALK.length];
    const m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*0(?:px)?\)\s*scale\(([-\d.]+),\s*([-\d.]+)\)/.exec(bot.style.transform);
    if (!m) return;
    const [x, y, s] = [+m[1], +m[2], Math.abs(+m[4])];
    bubble.style.transform = `translate3d(${x + 24}px, ${y + 66 - 52 * s}px, 0)`;
    bubble.classList.remove("is-on");
    void bubble.offsetWidth;
    bubble.classList.add("is-on");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => bubble.classList.remove("is-on"), 2400);
  };
  root.addEventListener("click", onClick);
  return () => {
    clearTimeout(hideTimer);
    root.removeEventListener("click", onClick);
    bubble.remove();
  };
}

export default function Assemble() {
  const root = useRef(null);

  useEffect(() => {
    const engine = createAssembler(root.current);
    return () => engine.destroy();
  }, []);

  useEffect(() => pokeable(root.current), []);

  const track = () => root.current?.querySelector(".asm-track");
  const skip = () => {
    const t = track();
    if (t) window.scrollTo(0, t.offsetTop + t.offsetHeight - window.innerHeight);
  };

  return (
    <div className="asm" ref={root} data-phase="intro">
      <noscript>
        <style>{".asm .tile{opacity:1!important}.asm-stage{position:relative!important;height:auto!important}"}</style>
      </noscript>

      <div className="asm-track" style={{ height: `${TIMELINE.total + 100}vh` }}>
        <div className="asm-stage">
          <div className="asm-back" aria-hidden="true">
            <div className="asm-dots" />
            <div className="asm-depth asm-word" data-depth="0.1" data-x="0" data-y="260" data-spin="0" data-seed="0">
              Brandon Lai
            </div>
            {BACK.map((c) => (
              <DepthCube key={c.key} c={c} />
            ))}
          </div>

          <div className="asm-world">
            <div className="asm-grid bento">
              {BLOCKS.map((b) => (
                <div key={b.id} className="tile-wrap" data-size={b.size} data-block={b.id} data-interactive="true">
                  <div className="asm-slot" aria-hidden="true">
                    <span>{b.id}</span>
                    <span>{FOOTPRINT[b.size]}</span>
                  </div>
                  <div className={`tile asm-${b.id}`}>
                    {b.paint ? (
                      <>
                        <div className="asm-primer" aria-hidden="true">
                          <b.Content layer="primer" />
                        </div>
                        <div className="asm-paint" data-paint="">
                          <b.Content />
                        </div>
                      </>
                    ) : (
                      <b.Content />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <svg className="asm-lines" aria-hidden="true">
              {BLOCKS.flatMap((b) =>
                (LINES[b.act] ?? []).map((n) => <path key={`${b.id}:${n}`} data-line={`${b.id}:${n}`} className={`ln-${b.act}`} />),
              )}
            </svg>

            <div className="asm-fx" aria-hidden="true">
              {BLOCKS.map((b) => (
                <Fx key={b.id} b={b} />
              ))}
            </div>

            <div className="asm-bots" aria-hidden="true">
              {BLOCKS.flatMap((b) =>
                b.crew.map((m, i) => <Bot key={`${b.id}:${i}`} id={`${b.id}:${i}`} hat={m.hat} tool={m.tool} prop={m.prop} outfit={m.outfit} />),
              )}
              <Bot id="foreman" hat="#FFD23F" />
              <div className="asm-sign" data-fx="foreman:sign">
                <span className="s-intro">Scroll to build ↓</span>
                <span className="s-done">Built ✓</span>
              </div>
            </div>
          </div>

          <div className="asm-front" aria-hidden="true">
            {FRONT.map((c) => (
              <DepthCube key={c.key} c={c} front />
            ))}
          </div>

          <div className="asm-confetti" aria-hidden="true">
            {PIECES.map((p) => (
              <i
                key={p.key}
                style={{ "--x": `${p.x}%`, "--d": `${p.d}s`, "--dl": `${p.dl}s`, "--c": p.c, "--r": `${p.r}deg`, "--sway": `${p.sway}px`, width: p.w }}
              />
            ))}
          </div>

          <div className="asm-hud">
            <span className="asm-hud-dot" aria-hidden="true" />
            <span className="asm-hud-label">Assembling</span>
            <span className="asm-hud-count" data-hud="count" aria-live="off">
              0/{BLOCKS.length} blocks
            </span>
            <span className="asm-hud-bar" aria-hidden="true">
              <i data-hud="bar" />
            </span>
            <button type="button" className="asm-skip" onClick={skip}>
              Skip
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
