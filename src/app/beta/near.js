"use client";

import { useEffect, useState } from "react";

/**
 * True once this block is about to be built (or is on screen), and from then on.
 *
 * The assembly engine marks a block `data-near` and fires `asm-near` on it a
 * little before its act starts, so embeds, photos and the 3D watch load just
 * in time instead of all at once on arrival. Outside the engine (reduced
 * motion, where the page simply scrolls, or no block at all), it falls back to
 * the element's own visibility, with some margin.
 */
export function useNear(ref) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wrap = el.closest("[data-block]");
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (wrap && !still) {
      if (wrap.hasAttribute("data-near")) return setNear(true);
      const on = () => setNear(true);
      wrap.addEventListener("asm-near", on, { once: true });
      return () => wrap.removeEventListener("asm-near", on);
    }
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        setNear(true);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return near;
}
