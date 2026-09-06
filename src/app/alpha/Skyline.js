"use client";

import { useEffect, useRef } from "react";
import { createSkyline } from "./manhattan";

/**
 * Owns the DOM the canvas engine draws into. The copy is passed in as
 * `children` so the page itself stays a server component — only the
 * scroll-driven chrome below runs on the client.
 */
export default function Skyline({ children }) {
  const canvas = useRef(null);
  const spacer = useRef(null);
  const hud = useRef(null);
  const year = useRef(null);
  const caption = useRef(null);
  const hint = useRef(null);
  const content = useRef(null);

  useEffect(() => {
    const skyline = createSkyline({
      canvas: canvas.current,
      spacer: spacer.current,
      hudEl: hud.current,
      yearEl: year.current,
      capEl: caption.current,
      hintEl: hint.current,
    });
    return () => skyline.destroy();
  }, []);

  /* the sky runs past the top and bottom of the scroll, so the page behind it
     has to be night rather than the site's default paper */
  useEffect(() => {
    const { style } = document.body;
    const bg = style.background;
    const bounce = style.overscrollBehaviorY;
    style.background = "#06091a";
    style.overscrollBehaviorY = "none";
    return () => {
      style.background = bg;
      style.overscrollBehaviorY = bounce;
    };
  }, []);

  return (
    <>
      <canvas className="alpha-sky" ref={canvas} aria-hidden="true" />

      <button
        type="button"
        className="alpha-skip"
        onClick={() =>
          content.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      >
        Skip to content
      </button>

      <div className="alpha-hud" ref={hud} aria-hidden="true">
        <div className="alpha-year" ref={year}>
          1609
        </div>
        <div className="alpha-caption" ref={caption} />
      </div>
      <div className="alpha-hint" ref={hint} aria-hidden="true">
        scroll
      </div>

      {/* empty on purpose — its height is the length of the intro */}
      <div className="alpha-spacer" ref={spacer} aria-hidden="true" />

      <section className="alpha-content" ref={content}>
        <div className="alpha-inner">
          {children}

          <button
            type="button"
            className="alpha-replay"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Replay the intro
          </button>

          <p className="alpha-note">
            The skyline above is stylized, not surveyed. Positions are
            compressed along the island and heights are exaggerated so the
            massing still reads at this scale.
          </p>
        </div>
      </section>
    </>
  );
}
