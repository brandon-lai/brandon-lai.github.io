import { ABOUT } from "../../data/site";

/**
 * The About section, shared by every era. Typography is inherited from the
 * era around it; `variant` only decides whether the roles stack or run inline
 * (inline where vertical space is tight).
 */
export default function AboutBlock({
  variant = "inline",
  showEyebrow = true,
  showWatches = true,
}) {
  return (
    <div className="about-block" data-variant={variant}>
      {showEyebrow && <span className="about-eyebrow">About</span>}
      <ul className="about-list">
        {ABOUT.bullets.map((b) => (
          <li key={b.label}>
            <span className="about-emoji" aria-hidden="true">{b.emoji}</span>
            {b.label}
          </li>
        ))}
      </ul>
      {showWatches && (
        <p className="about-watches">
          {ABOUT.watches.short}{" "}
          <span className="about-handle">{ABOUT.watches.handle}</span>
        </p>
      )}
    </div>
  );
}
