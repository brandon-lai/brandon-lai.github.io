import { ABOUT } from "../data/site";

export const metadata = { title: "About — Brandon Lai" };

export default function About() {
  return (
    <div className="page">
      <div className="prose">
        <h1>About</h1>

        <ul className="bullets">
          {ABOUT.bullets.map(({ emoji, label }) => (
            <li key={label}>
              <span className="bullet-emoji" aria-hidden="true">
                {emoji}
              </span>
              {label}
            </li>
          ))}
        </ul>

        <p>
          {ABOUT.watches.before}
          <a href={ABOUT.watches.href} target="_blank" rel="noreferrer">
            {ABOUT.watches.handle}
          </a>
          {ABOUT.watches.after}
        </p>
      </div>
    </div>
  );
}
