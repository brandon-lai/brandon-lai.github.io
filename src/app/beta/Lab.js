"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXPERIENCE } from "../data/experience";
import { ERAS } from "../data/eras";
import EraLayer from "./EraLayer";

const LAST = ERAS.length - 1;
/** how much wheel travel moves you one whole era */
const SCROLL_PER_ERA = 850;
const clamp = (n) => Math.min(LAST, Math.max(0, n));

export default function Lab() {
  /** continuous position on the scale, e.g. 4.37 is most of the way to era 5 */
  const [pos, setPos] = useState(5);
  const [moved, setMoved] = useState(false);

  const stageRef = useRef(null);
  const target = useRef(5);
  const current = useRef(5);
  const raf = useRef(null);
  const touchY = useRef(null);

  /* ease the rendered position toward the target so a coarse mouse wheel
     glides instead of jumping, while a trackpad stays one-to-one */
  const run = useCallback(() => {
    if (raf.current) return;
    const step = () => {
      const delta = target.current - current.current;
      if (Math.abs(delta) < 0.0005) {
        current.current = target.current;
        setPos(target.current);
        raf.current = null;
        return;
      }
      current.current += delta * 0.16;
      setPos(current.current);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const nudge = useCallback(
    (px) => {
      target.current = clamp(target.current + px / SCROLL_PER_ERA);
      setMoved(true);
      run();
    },
    [run]
  );

  /* the page does not scroll — the wheel moves you through time instead */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* the whole page is the scroll surface, not just the stage */
  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault();
      nudge(e.deltaY);
    };
    const onTouchStart = (e) => {
      touchY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (touchY.current == null) return;
      const y = e.touches[0].clientY;
      nudge((touchY.current - y) * 1.6);
      touchY.current = y;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [nudge]);

  useEffect(() => () => raf.current && cancelAnimationFrame(raf.current), []);

  const lower = Math.floor(pos);
  const upper = Math.min(LAST, lower + 1);
  const f = pos - lower; // 0 → fully `lower`, 1 → fully `upper`

  return (
    <div className="lab">
      <div className="lab-stage" ref={stageRef}>
        <EraLayer
          era={ERAS[lower]}
          jobs={EXPERIENCE}
          opacity={1}
          offset={-f * 34}
          blur={f * 3.2}
        />
        {upper !== lower && (
          <EraLayer
            era={ERAS[upper]}
            jobs={EXPERIENCE}
            opacity={f}
            offset={(1 - f) * 34}
            blur={(1 - f) * 3.2}
          />
        )}

        {/* both chevrons say you can go either way; each dims at its own end */}
        <div className="lab-hint" data-moved={moved ? "true" : "false"} aria-hidden="true">
          <svg
            className="hint-up"
            data-end={pos <= 0.02 ? "true" : "false"}
            width="18" height="9" viewBox="0 0 18 9" fill="none"
          >
            <path d="M1.5 7.5 9 1.5l7.5 6" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg
            className="hint-down"
            data-end={pos >= LAST - 0.02 ? "true" : "false"}
            width="18" height="9" viewBox="0 0 18 9" fill="none"
          >
            <path d="M1.5 1.5 9 7.5l7.5-6" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* the scale is hidden for now — scrolling drives everything.
          Re-import EraSlider and drop <EraSlider value={pos} onChange={jump} />
          back in here to bring it back. */}
    </div>
  );
}
