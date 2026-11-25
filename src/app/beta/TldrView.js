import Link from "next/link";
import { ABOUT, SOCIALS } from "../data/site";
import { EXPERIENCE } from "../data/experience";
import { PROJECTS } from "../data/projects";

const LINKEDIN = SOCIALS.find((s) => s.label === "LinkedIn")?.href ?? "https://www.linkedin.com/in/brandon-lai";
const STRAVA = "https://www.strava.com/athletes/70165341";
const PLACES = ["Minnesota", "Nashville", "Boston", "Montreal", "Chicago", "Paris", "NYC"];

function years(start, end) {
  const s = start.slice(-4);
  if (end === "Present") return `${s}–now`;
  const e = end.slice(-4);
  return s === e ? s : `${s}–${e}`;
}

export default function TldrView({ onExit }) {
  return (
    <main className="tldr" aria-label="TL;DR summary">
      <header className="tldr-head">
        <div className="tldr-eyebrow">TL;DR</div>
        <h1 className="tldr-name">Brandon Lai</h1>
        <p className="tldr-bio">
          Software engineer in NYC who makes creative, whimsical, clean experiences for the web and apps. Currently
          building full-stack, agentic-AI-powered products at LinkedIn.
        </p>
        <nav className="tldr-links" aria-label="Links">
          <a href={LINKEDIN} target="_blank" rel="noreferrer">
            LinkedIn &#8599;
          </a>
          <Link href="/projects">Projects ({PROJECTS.length}) &#8594;</Link>
          <a href={STRAVA} target="_blank" rel="noreferrer">
            Strava &#8599;
          </a>
          <a href={ABOUT.watches.href} target="_blank" rel="noreferrer">
            {ABOUT.watches.handle} &#8599;
          </a>
        </nav>
      </header>

      <section className="tldr-sec" aria-labelledby="tldr-work">
        <h2 id="tldr-work" className="tldr-eyebrow">
          Work
        </h2>
        <ul className="tldr-list">
          {EXPERIENCE.map((item, i) => (
            <li key={`${item.org}-${item.start}-${i}`} className="tldr-row">
              <span className="tldr-key">{years(item.start, item.end)}</span>
              <div className="tldr-val">
                <div className="tldr-line">
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noreferrer" className="tldr-strong">
                      {item.org}
                    </a>
                  ) : (
                    <span className="tldr-strong">{item.org}</span>
                  )}
                  <span className="tldr-sep" aria-hidden="true">
                    &mdash;
                  </span>
                  <span className="tldr-role">{item.role}</span>
                </div>
                {item.note && <p className="tldr-note">{item.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="tldr-sec" aria-labelledby="tldr-projects">
        <div className="tldr-sec-head">
          <h2 id="tldr-projects" className="tldr-eyebrow">
            Side projects
          </h2>
          <Link href="/projects" className="tldr-more">
            Visual wall &#8594;
          </Link>
        </div>
        <ul className="tldr-proj-list">
          {PROJECTS.map((project) => (
            <li key={project.id} className="tldr-proj">
              <a href={project.href} target="_blank" rel="noreferrer" className="tldr-proj-link">
                <span className="tldr-strong">{project.name}</span>
                <span className="tldr-proj-tag">{project.tagline}</span>
                <span className="tldr-proj-arrow" aria-hidden="true">
                  &#8599;
                </span>
              </a>
            </li>
          ))}
          <li className="tldr-proj">
            <div className="tldr-proj-link is-static">
              <span className="tldr-strong">myrel</span>
              <span className="tldr-proj-tag">Private iOS notebook for the people in your life</span>
            </div>
          </li>
        </ul>
      </section>

      <section className="tldr-sec" aria-labelledby="tldr-off">
        <h2 id="tldr-off" className="tldr-eyebrow">
          Off hours
        </h2>
        <dl className="tldr-list">
          <div className="tldr-row">
            <dt className="tldr-key">Watches</dt>
            <dd className="tldr-val">
              Collects and tinkers with vintage mechanical watches (
              <a href={ABOUT.watches.href} target="_blank" rel="noreferrer">
                {ABOUT.watches.handle}
              </a>
              ).
            </dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Running</dt>
            <dd className="tldr-val">3&times; marathoner &mdash; Toronto &rsquo;24, Toronto Waterfront &rsquo;24, Toronto &rsquo;26.</dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Food</dt>
            <dd className="tldr-val">Tiramisu World Cup competitor, Canada semi-finalist.</dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Also</dt>
            <dd className="tldr-val">Tennis, guitar, scuba diving, snowboarding.</dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Lived</dt>
            <dd className="tldr-val">
              {PLACES.slice(0, -1).join(" · ")} · <span className="tldr-strong">{PLACES[PLACES.length - 1]}</span>
            </dd>
          </div>
        </dl>
      </section>

      <footer className="tldr-foot">
        <p className="tldr-quote">&ldquo;What is impossible to envision is impossible to do.&rdquo;</p>
        <button type="button" className="tldr-back" onClick={onExit}>
          &#8592; Back to tiles
        </button>
      </footer>
    </main>
  );
}
