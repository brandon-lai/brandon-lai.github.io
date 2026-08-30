"use client";

import { useEffect, useRef } from "react";
import AboutBlock from "./AboutBlock";
import OrgMark from "../../components/OrgMark";

/**
 * No screen left — the record just drifts through the room, bouncing off the
 * edges like the DVD logo. Positions are driven by rAF rather than CSS so the
 * tiles genuinely travel edge to edge instead of looping a fixed path.
 */

/** starting position (fraction of free space) + velocity (px per 16ms) */
const SEEDS = [
  { x: 0.06, y: 0.10, vx: 1.25, vy: 0.88 },
  { x: 0.52, y: 0.04, vx: -0.96, vy: 1.16 },
  { x: 0.80, y: 0.46, vx: -1.1, vy: -0.78 },
  { x: 0.18, y: 0.72, vx: 1.02, vy: -1.04 },
  { x: 0.64, y: 0.62, vx: 0.88, vy: 0.94 },
  { x: 0.34, y: 0.34, vx: -1.16, vy: -0.9 },
  { x: 0.90, y: 0.14, vx: -0.82, vy: 1.08 },
];

const TINTS = [210, 268, 162, 24, 320, 190, 42];

export default function Future({ jobs }) {
  const boxRef = useRef(null);
  const tiles = useRef([]);
  const items = [
    { kind: "next" },
    { kind: "about" },
    ...jobs.map((job) => ({ kind: "job", job })),
  ];

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = tiles.current.filter(Boolean);
    const state = els.map((el, i) => {
      const seed = SEEDS[i % SEEDS.length];
      return {
        el,
        x: seed.x * Math.max(0, box.clientWidth - el.offsetWidth),
        y: seed.y * Math.max(0, box.clientHeight - el.offsetHeight),
        vx: seed.vx,
        vy: seed.vy,
        tint: i % TINTS.length,
      };
    });

    let raf;
    let last = performance.now();

    const bounce = (t) => {
      t.tint = (t.tint + 1) % TINTS.length;
      t.el.style.setProperty("--tint", TINTS[t.tint]);
    };

    const tick = (now) => {
      const dt = Math.min(34, now - last) / 16.67;
      last = now;
      const W = box.clientWidth;
      const H = box.clientHeight;

      for (const t of state) {
        const w = t.el.offsetWidth;
        const h = t.el.offsetHeight;
        t.x += t.vx * dt;
        t.y += t.vy * dt;

        if (t.x <= 0) { t.x = 0; t.vx = Math.abs(t.vx); bounce(t); }
        else if (t.x >= W - w) { t.x = W - w; t.vx = -Math.abs(t.vx); bounce(t); }
        if (t.y <= 0) { t.y = 0; t.vy = Math.abs(t.vy); bounce(t); }
        else if (t.y >= H - h) { t.y = H - h; t.vy = -Math.abs(t.vy); bounce(t); }

        t.el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  return (
    <div className="drift" ref={boxRef}>
      {items.map((item, i) => (
        <div
          className="drift-tile"
          data-size={item.kind === "job" ? "sm" : "lg"}
          key={item.kind === "job" ? `${item.job.org}-${item.job.start}` : item.kind}
          ref={(el) => {
            tiles.current[i] = el;
          }}
          style={{ "--tint": TINTS[i % TINTS.length] }}
        >
          {item.kind === "next" ? (
            <>
              <span className="drift-org">20——</span>
              <span className="drift-question" aria-hidden="true">?</span>
              <span className="drift-role">Next role</span>
            </>
          ) : item.kind === "about" ? (
            <div className="drift-about">
              <AboutBlock variant="stacked" />
            </div>
          ) : (
            <>
              <OrgMark
                className="drift-mark"
                org={item.job.org}
                logo={item.job.logo}
              />
              <span className="drift-org">{item.job.org}</span>
              <span className="drift-role">{item.job.role}</span>
              <span className="drift-date">
                {item.job.start} — {item.job.end}
              </span>
              {item.job.note && (
                <span className="drift-note">{item.job.note}</span>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
