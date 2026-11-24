"use client";

import Link from "next/link";
import { PROJECTS } from "../data/projects";
import { ArrowUpRight } from "../components/Icons";

// Split the 15 curated projects into 3 visually balanced rows of 5
const ROW_IDS = [
  ["rockpool", "etabli", "inkscroll", "bandits", "stubbook"],
  ["incognita", "stilltea", "woolmeadow", "fold", "raiseisright"],
  ["isochron", "rolloutgp", "elsewhere", "impression", "byhand"],
];

const BY_ID = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

const ROWS = [
  { dir: "left", duration: "46s", delay: "-7s", items: ROW_IDS[0].map((id) => BY_ID[id]) },
  { dir: "right", duration: "54s", delay: "-22s", items: ROW_IDS[1].map((id) => BY_ID[id]) },
  { dir: "left", duration: "50s", delay: "-14s", items: ROW_IDS[2].map((id) => BY_ID[id]) },
];

const COPIES = [0, 1, 2];

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M11.5 4.5 6 10l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProjectsShelf() {
  return (
    <div className="ps-page">
      <header className="ps-top">
        <Link href="/beta" className="ps-back">
          <BackArrow />
          <span>Back</span>
        </Link>
        <div className="ps-title-pill" aria-label={`Side projects, ${PROJECTS.length} live`}>
          <span className="ps-live-dot" aria-hidden="true" />
          <span className="ps-title-label">Side projects</span>
          <span className="ps-title-count">{PROJECTS.length} live</span>
        </div>
      </header>

      <main className="ps-wall" aria-label="Side projects">
        {ROWS.map((row, rowIndex) => (
          <div className="ps-lane" key={rowIndex} data-dir={row.dir}>
            <div
              className="ps-lane-track"
              style={{
                "--ps-duration": row.duration,
                "--ps-delay": row.delay,
              }}
            >
              {COPIES.map((copy) => {
                const isClone = copy > 0;
                return (
                  <div
                    className="ps-lane-group"
                    key={copy}
                    aria-hidden={isClone || undefined}
                  >
                    {row.items.map((project) => (
                      <a
                        key={`${copy}-${project.id}`}
                        href={project.href}
                        target="_blank"
                        rel="noreferrer"
                        tabIndex={isClone ? -1 : undefined}
                        className="ps-tile"
                      >
                        <div className="ps-media">
                          <img
                            src={project.image}
                            alt={isClone ? "" : project.alt}
                            loading="eager"
                            decoding="async"
                          />
                        </div>
                        <div className="ps-meta">
                          <div className="ps-meta-head">
                            <span className="ps-name-wrap">
                              <i style={{ background: project.accent }} aria-hidden="true" />
                              <span className="ps-name">{project.name}</span>
                            </span>
                            <span className="ps-arrow" aria-hidden="true">
                              <ArrowUpRight width={13} height={13} />
                            </span>
                          </div>
                          <p className="ps-desc">{project.tagline}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
