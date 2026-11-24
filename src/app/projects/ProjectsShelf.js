"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PROJECTS } from "../data/projects";
import { ArrowUpRight } from "../components/Icons";

function Arrow({ dir = "right" }) {
  const d = dir === "left" ? "M11.5 4.5 6 10l5.5 5.5" : "M8.5 4.5 14 10l-5.5 5.5";
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProjectsShelf() {
  const railRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = Math.max(1, el.scrollWidth - el.clientWidth);
    const p = Math.min(1, Math.max(0, el.scrollLeft / max));
    setProgress(p);
    setEdges({ start: el.scrollLeft <= 6, end: el.scrollLeft >= max - 6 });

    // find the project block closest to the viewport center
    const mid = el.scrollLeft + el.clientWidth * 0.45;
    const cards = el.querySelectorAll("[data-proj-index]");
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((node) => {
      const center = node.offsetLeft + node.offsetWidth * 0.5;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = Number(node.dataset.projIndex);
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    sync();

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };

    // Map vertical mouse wheel to horizontal scrolling when the user isn't already swiping horizontally
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        el.scrollBy({ left: Math.min(440, el.clientWidth * 0.72), behavior: "smooth" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        el.scrollBy({ left: -Math.min(440, el.clientWidth * 0.72), behavior: "smooth" });
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", sync);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
    };
  }, [sync]);

  const nudge = (dir) => {
    const el = railRef.current;
    if (!el) return;
    const step = Math.min(440, el.clientWidth * 0.76);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="ps-page">
      <header className="ps-top">
        <Link href="/beta" className="ps-back">
          <Arrow dir="left" />
          <span>Back</span>
        </Link>
      </header>

      <main className="ps-rail" ref={railRef} aria-label="Side projects gallery">
        <div className="ps-track">
          <section className="ps-block ps-intro" aria-label="Introduction">
            <div className="eyebrow">Side projects · {PROJECTS.length} live</div>
            <h1 className="ps-title">
              Things I built <span className="ps-muted">for the fun of it.</span>
            </h1>
            <p className="ps-lead">
              Interactive toys, watchmaking tools, generative art, and tiny games — every one live in the browser.
            </p>
            <div className="ps-cue">
              <span>Scroll sideways to explore</span>
              <Arrow dir="right" />
            </div>
          </section>

          {PROJECTS.map((project, index) => {
            const num = String(index + 1).padStart(2, "0");
            return (
              <a
                key={project.id}
                href={project.href}
                target="_blank"
                rel="noreferrer"
                className="ps-block ps-card"
                data-proj-index={index}
              >
                <div className="ps-media">
                  <img
                    src={project.image}
                    alt={project.alt}
                    loading={index < 3 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <span className="ps-num">{num}</span>
                </div>
                <div className="ps-body">
                  <div className="ps-eyebrow">
                    <i style={{ background: project.accent }} aria-hidden="true" />
                    <span>{project.eyebrow}</span>
                  </div>
                  <h2 className="ps-name">{project.name}</h2>
                  <p className="ps-desc">{project.description}</p>
                  <div className="ps-foot">
                    <span className="ps-host">{project.host}</span>
                    <span className="ps-open">
                      Open <ArrowUpRight width={13} height={13} />
                    </span>
                  </div>
                </div>
              </a>
            );
          })}

          <section className="ps-block ps-end" aria-label="End of shelf">
            <div className="eyebrow">End of the shelf</div>
            <p className="ps-end-title">Always tinkering on the next one.</p>
            <p className="ps-lead">Want to head back to the rest of the blocks?</p>
            <Link href="/beta" className="btn ps-end-btn">
              <Arrow dir="left" /> Back to main page
            </Link>
          </section>
        </div>
      </main>

      <nav className="ps-hud" aria-label="Gallery navigation">
        <span className="ps-hud-dot" aria-hidden="true" />
        <span className="ps-hud-label">Side projects</span>
        <span className="ps-hud-count">
          {String(active + 1).padStart(2, "0")}/{String(PROJECTS.length).padStart(2, "0")}
        </span>
        <span className="ps-hud-bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.max(0.06, progress).toFixed(3)})` }} />
        </span>
        <div className="ps-hud-arrows">
          <button type="button" onClick={() => nudge(-1)} disabled={edges.start} aria-label="Scroll left">
            <Arrow dir="left" />
          </button>
          <button type="button" onClick={() => nudge(1)} disabled={edges.end} aria-label="Scroll right">
            <Arrow dir="right" />
          </button>
        </div>
      </nav>
    </div>
  );
}
