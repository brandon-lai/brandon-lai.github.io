import { EXPERIENCE } from "../data/experience";
import { ABOUT, SOCIALS } from "../data/site";
import Skyline from "./Skyline";
import "./alpha.css";

export const metadata = { title: "Alpha — Brandon Lai" };

/**
 * What follows is not what the page looks like — the canvas typesets all of it
 * from these same data files. This is the markup underneath: real headings and
 * links for screen readers, search engines, and anyone who arrives with
 * JavaScript off. Keep the two saying the same thing.
 */
export default function Alpha() {
  return (
    <div className="page-alpha">
      <Skyline>
        <h1>Hi, I&rsquo;m Brandon</h1>

        {ABOUT.lead.map((line) => (
          <p key={line}>{line}</p>
        ))}

        <h2>Now</h2>
        <ul>
          {ABOUT.bullets.map(({ emoji, label }) => (
            <li key={label}>
              <span aria-hidden="true">{emoji}</span> {label}
            </li>
          ))}
        </ul>

        <h2>Watches</h2>
        <p>
          {ABOUT.watches.before}
          <a href={ABOUT.watches.href} target="_blank" rel="noreferrer">
            {ABOUT.watches.handle}
          </a>
          {ABOUT.watches.after}
        </p>

        <h2>Where I have worked</h2>
        <ul>
          {EXPERIENCE.map((job) => (
            <li key={`${job.org}-${job.start}`}>
              {job.role}, {job.org} ({job.start} — {job.end}). {job.note}
            </li>
          ))}
        </ul>

        <h2>Contact</h2>
        <ul>
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </Skyline>
    </div>
  );
}
