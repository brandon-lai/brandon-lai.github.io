import { EXPERIENCE } from "../data/experience";
import { ABOUT, SITE, SOCIALS } from "../data/site";
import Skyline from "./Skyline";
import "./alpha.css";

export const metadata = { title: "Alpha — Brandon Lai" };

const [current] = EXPERIENCE;

export default function Alpha() {
  return (
    <div className="page-alpha">
      <Skyline>
        <h1>{SITE.name}</h1>
        <p className="alpha-sub">
          {current.role} at {current.org}.
        </p>

        <p>
          I build things — mostly software, occasionally hardware. What follows
          is the short version. The skyline above was the long one.
        </p>

        <h2>Now</h2>
        <ul>
          {ABOUT.bullets.map(({ emoji, label }) => (
            <li key={label}>
              <span className="alpha-bullet" aria-hidden="true">
                {emoji}
              </span>
              {label}
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
            <li className="alpha-job" key={`${job.org}-${job.start}`}>
              <span>
                {job.role}, {job.org}
              </span>
              <span className="alpha-job-dates">
                {job.start} — {job.end}
              </span>
              <span className="alpha-job-note">{job.note}</span>
            </li>
          ))}
        </ul>

        <h2>Contact</h2>
        <p>
          {SOCIALS.map((s, i) => (
            <span key={s.label}>
              {i > 0 && ", "}
              <a
                href={s.href}
                {...(/^https?:/.test(s.href)
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                {s.label}
              </a>
            </span>
          ))}
          .
        </p>
      </Skyline>
    </div>
  );
}
