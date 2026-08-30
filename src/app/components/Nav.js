"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAV } from "../data/site";

const normalize = (p) => {
  if (!p) return "/";
  const trimmed = p.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
};

export default function Nav() {
  const pathname = normalize(usePathname());
  const listRef = useRef(null);
  const [pill, setPill] = useState(null);

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
      </nav>
    </div>
  );
}
