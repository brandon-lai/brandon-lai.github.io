"use client";

import Link from "next/link";
import { PROJECTS } from "../data/projects";
import { ArrowUpRight } from "../components/Icons";

/**
 * Partition any number of projects evenly across 1–3 rows with zero repeats.
 * Thresholds keep at least 3–4 unique projects per row so a tile exits one
 * viewport edge before re-entering the opposite edge.
 */
function buildRows(items) {
  const n = items.length;
  const rowCount = n <= 4 ? 1 : n <= 11 ? 2 : 3;
  const rows = Array.from({ length: rowCount }, () => []);
  // Deal round-robin so adjacent projects (and visual styles) spread across rows
  items.forEach((item, index) => {
    rows[index % rowCount].push(item);
  });

  const speedOffsets = [0, 6, 3];
  const phaseOffsets = [-0.08, -0.58, -0.31];

  return rows.map((rowItems, i) => {
    const durationSec = Math.max(28, rowItems.length * 10 + speedOffsets[i % speedOffsets.length]);
    return {
      dir: i % 2 === 0 ? "left" : "right",
      duration: `${durationSec}s`,
      delay: `${(durationSec * phaseOffsets[i % phaseOffsets.length]).toFixed(1)}s`,
      items: rowItems,
    };
  });
}

const ROWS = buildRows(PROJECTS);
const COPIES = [0, 1];

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

      <main className="ps-wall" aria-label="Side projects" data-rows={ROWS.length}>
        {ROWS.map((row, rowIndex) => {
          const cols = row.items.length;
          const canFlow = cols >= 2;
          return (
            <div
              className="ps-lane"
              key={rowIndex}
              data-dir={row.dir}
              data-static={!canFlow || undefined}
              style={{
                "--ps-cols": cols,
                "--ps-span": Math.max(1, cols - 1),
              }}
            >
              <div
                className="ps-lane-track"
                style={{
                  "--ps-duration": row.duration,
                  "--ps-delay": row.delay,
                }}
              >
                {(canFlow ? COPIES : [0]).map((copy) => {
                  const isClone = copy > 0;
                  return (
                    <div
                      className="ps-lane-group"
                      key={copy}
                      data-copy={copy}
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
          );
        })}
      </main>
    </div>
  );
}
