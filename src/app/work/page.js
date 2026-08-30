import { EXPERIENCE } from "../data/experience";
import { ArrowUpRight } from "../components/Icons";
import OrgMark from "../components/OrgMark";

export const metadata = { title: "Work — Brandon Lai" };

function Entry({ job }) {
  const { role, org, type, start, end, duration, location, note, logo } = job;
  const meta = [org, type, location].filter(Boolean).join(" · ");

  return (
    <>
      <OrgMark className="xp-mark" org={org} logo={logo} />

      <div className="xp-body">
        <div className="xp-head">
          <span className="xp-role">{role}</span>
          <span className="xp-dates">
            {start} — {end}
            {duration && <span className="xp-duration"> · {duration}</span>}
          </span>
        </div>
        <div className="xp-org">{meta}</div>
        {note && <p className="xp-note">{note}</p>}
      </div>

      {job.href && <ArrowUpRight width={16} height={16} className="xp-arrow" />}
    </>
  );
}

export default function Work() {
  return (
    <div className="page">
      <div className="prose">
        <h1>Work</h1>
        <p>Where I&apos;ve built things, most recent first.</p>
      </div>

      <div className="xp-list">
        {EXPERIENCE.map((job) =>
          job.href ? (
            <a
              key={`${job.org}-${job.start}`}
              href={job.href}
              className="xp-item"
              target="_blank"
              rel="noreferrer"
            >
              <Entry job={job} />
            </a>
          ) : (
            <div key={`${job.org}-${job.start}`} className="xp-item">
              <Entry job={job} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
