"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Light/dark switch for the nav. The page follows the system theme until the
 * visitor picks one here; the pick is stored and re-applied before paint by
 * the script in layout.js. Switching floods the new theme out from the button
 * with a View Transition: the new page is revealed through a circle growing
 * from the toggle until it covers the screen. Browsers without View
 * Transitions, and visitors who prefer reduced motion, get an instant switch.
 */
const KEY = "theme";
const system = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const current = () => document.documentElement.dataset.theme || system();

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null); // unknown until mounted

  useEffect(() => {
    setTheme(current());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => setTheme(current());
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  const flip = (event) => {
    const next = current() === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      flushSync(() => setTheme(next));
    };
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || still) return apply();

    const r = event.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${reach}px at ${x}px ${y}px)`] },
          { duration: 720, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {});
  };

  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="nav-theme"
      onClick={flip}
      aria-label={theme ? `Switch to ${dark ? "light" : "dark"} mode` : "Switch theme"}
      title={theme ? `${dark ? "Light" : "Dark"} mode` : undefined}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" />
        </svg>
      )}
    </button>
  );
}
