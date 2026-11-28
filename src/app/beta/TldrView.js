import Link from "next/link";
import { ABOUT, SOCIALS } from "../data/site";
import { EXPERIENCE } from "../data/experience";
import { PROJECTS } from "../data/projects";
import BELI from "../data/beli.json";
import { PERCH } from "./perch/PerchDesk";

const LINKEDIN = SOCIALS.find((s) => s.label === "LinkedIn")?.href ?? "https://www.linkedin.com/in/brandon-lai";
const PLACES = ["Minnesota", "Nashville", "Boston", "Montreal", "Chicago", "Paris", "NYC"];

/** the current #1 on the first Beli list, as "Name, City" */
const BELI_TOP = (() => {
  const top = [...(BELI.lists[0]?.been ?? [])].sort((a, b) => a.rank - b.rank)[0];
  if (!top) return null;
  const parts = top.location.split(", ");
  return `${top.name}, ${parts.length >= 3 ? parts[parts.length - 2] : parts[0]}`;
})();

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
          Software engineer in NYC. I make odd little things for the web and iPhone, and I collect old watches.
        </p>
        <nav className="tldr-links" aria-label="Links">
          <a href={LINKEDIN} target="_blank" rel="noreferrer">
            LinkedIn &#8599;
          </a>
          <Link href="/projects">Projects ({PROJECTS.length}) &#8594;</Link>
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
            With screenshots &#8594;
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
            <a href={PERCH} target="_blank" rel="noreferrer" className="tldr-proj-link">
              <span className="tldr-strong">Perch</span>
              <span className="tldr-proj-tag">A red panda that climbs your Mac&rsquo;s windows</span>
              <span className="tldr-proj-arrow" aria-hidden="true">
                &#8599;
              </span>
            </a>
          </li>
          <li className="tldr-proj">
            <div className="tldr-proj-link is-static">
              <span className="tldr-strong">myrel</span>
              <span className="tldr-proj-tag">A private iOS notebook for the people you know</span>
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
              Vintage, mostly. Designing my own from scratch.{" "}
              <a href={ABOUT.watches.href} target="_blank" rel="noreferrer">
                {ABOUT.watches.handle}
              </a>
            </dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Running</dt>
            <dd className="tldr-val">Three marathons, all in Toronto (&rsquo;24, &rsquo;24, &rsquo;26). <span style={{ whiteSpace: "nowrap" }}>Ex-rower.</span></dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Tennis</dt>
            <dd className="tldr-val">Whenever there&rsquo;s a free court.</dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Food</dt>
            <dd className="tldr-val">
              Tiramisu World Cup semi-finalist (Canada).
              {BELI_TOP && (
                <>
                  {" "}
                  #1 on my{" "}
                  <a href={BELI.profile} target="_blank" rel="noreferrer">
                    Beli
                  </a>{" "}
                  right now: {BELI_TOP}.
                </>
              )}
            </dd>
          </div>
          <div className="tldr-row">
            <dt className="tldr-key">Also</dt>
            <dd className="tldr-val">Beginner guitar, scuba, snowboarding.</dd>
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
