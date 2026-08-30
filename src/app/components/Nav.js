"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAV, NAV_LOCKED_LINES } from "../data/site";

const normalize = (p) => {
  if (!p) return "/";
  const trimmed = p.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
};

const BUBBLE_MS = 2200;

export default function Nav() {
  const pathname = normalize(usePathname());
  const listRef = useRef(null);
  const [pill, setPill] = useState(null);
  const [bubble, setBubble] = useState(null);

  const line = useRef(0);
  const timer = useRef(null);

  const measure = useCallback(() => {
    const list = listRef.current;
    const active = list?.querySelector('[data-active="true"]');
    if (!list || !active) {
      setPill(null);
      return;
    }
    const parent = list.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    setPill({ x: rect.left - parent.left, w: rect.width });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    // fonts land after first paint and shift item widths
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [measure, pathname]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const knock = (event) => {
    const list = listRef.current;
    if (!list) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const parent = list.getBoundingClientRect();

    setBubble({
      x: rect.left - parent.left + rect.width / 2,
      text: NAV_LOCKED_LINES[line.current % NAV_LOCKED_LINES.length],
    });
    line.current += 1;

    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
  };

  return (
    <div className="nav-fixed">
      <nav className="nav" ref={listRef} aria-label="Primary">
        <span
          className="nav-indicator"
          data-ready={pill ? "true" : "false"}
          style={
            pill
              ? { width: `${pill.w}px`, transform: `translateX(${pill.x}px)` }
              : undefined
          }
        />

        {NAV.map((item) => {
          const active = normalize(item.href) === pathname;

          if (item.disabled) {
            return (
              <button
                key={item.href}
                type="button"
                className="nav-item"
                data-active="false"
                data-locked="true"
                aria-disabled="true"
                onClick={knock}
              >
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              data-active={active ? "true" : "false"}
              aria-current={active ? "page" : undefined}
            >
              {item.dot && <span className="nav-dot" aria-hidden="true" />}
              {item.label}
            </Link>
          );
        })}

        {bubble && (
          <span className="nav-bubble" style={{ left: `${bubble.x}px` }} role="status">
            {bubble.text}
          </span>
        )}
      </nav>
    </div>
  );
}
