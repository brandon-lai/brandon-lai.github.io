import { HERO } from "../../data/site";

export default function Hero() {
  return (
    <div className="tile-pad is-hero">
      <h1 className="display">
        {HERO.heading.map((part, i) =>
          part.href ? (
            <a key={i} href={part.href} className="link">
              {part.text}
            </a>
          ) : (
            <span key={i} className={part.em ? "em" : undefined}>
              {part.text}
            </span>
          )
        )}
      </h1>

      <div className="rule" />

      <div className="manifesto">
        {HERO.lines.map((line, i) => (
          <p key={i}>
            {line}
            {i === HERO.lines.length - 1 && HERO.footnote && (
              <span className="star">{HERO.footnote.star}</span>
            )}
          </p>
        ))}
      </div>

      {HERO.footnote && (
        <div className="footnote">
          <span className="star">{HERO.footnote.star}</span>{" "}
          <u>{HERO.footnote.text}</u>
        </div>
      )}
    </div>
  );
}
