"use client";

import { ERAS } from "../data/eras";

/**
 * The modernity scale. Continuous rather than stepped, so dragging it feels
 * like the scroll does. Still a real <input type="range">, so arrow keys,
 * Home/End and screen readers work.
 */
export default function EraSlider({ value, onChange }) {
  const last = ERAS.length - 1;
  const pct = (value / last) * 100;
  const nearest = ERAS[Math.round(value)];

  return (
    <div className="scale">
      <div className="scale-track-wrap">
        <div className="scale-track" aria-hidden="true">
          <div className="scale-fill" style={{ width: `${pct}%` }} />
          {ERAS.map((e, i) => (
            <span
              key={e.id}
              className="scale-tick"
              data-passed={i <= value + 0.001 ? "true" : "false"}
              style={{ left: `${(i / last) * 100}%` }}
            />
          ))}
        </div>

        <input
          className="scale-input"
          type="range"
          min={0}
          max={last}
          step={0.001}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Modernity"
          aria-valuetext={`${nearest.label}, ${nearest.year}`}
        />
      </div>

      <div className="scale-ends">
        <span>Past</span>
        <span>Future</span>
      </div>
    </div>
  );
}
