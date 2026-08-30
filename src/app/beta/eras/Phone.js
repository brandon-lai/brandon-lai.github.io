import { ABOUT } from "../../data/site";
import AboutBlock from "./AboutBlock";
import OrgMark from "../../components/OrgMark";

/**
 * A home screen rather than a list — widgets pack the same record into normal
 * handset proportions instead of one very long scroll.
 */
export default function Phone({ jobs }) {
  const [now, ...past] = jobs;

  return (
    <div className="ios">
      <div className="ios-screen">
        <div className="ios-wall" aria-hidden="true" />
        <div className="island" aria-hidden="true" />

        <div className="ios-status">
          <span>9:41</span>
          <span className="handset-signal" aria-hidden="true">
            <i /><i /><i />
          </span>
        </div>

        <div className="ios-grid">
          <div className="ios-cell">
            <div className="widget">
              <AboutBlock variant="stacked" showEyebrow={false} showWatches={false} />
            </div>
            <span className="ios-label">About</span>
          </div>

          <div className="ios-cell">
            <div className="widget widget-watch">
              <span className="w-glyph" aria-hidden="true">⌚</span>
              <span className="w-watch-note">{ABOUT.watches.short}</span>
              <span className="w-handle">{ABOUT.watches.handle}</span>
            </div>
            <span className="ios-label">Watches</span>
          </div>

          <div className="ios-cell ios-wide">
            <div className="widget widget-now">
              <div className="w-now-head">
                <span className="w-title">{now.role}</span>
                <OrgMark className="w-now-mark" org={now.org} logo={now.logo} />
              </div>
              <span className="w-sub">
                {now.org} · {now.start} — {now.end}
              </span>
              {now.note && <span className="w-note">{now.note}</span>}
            </div>
            <span className="ios-label">Now</span>
          </div>

          <div className="ios-cell ios-wide">
            <div className="widget widget-list">
              {past.map((job) => (
                <div className="w-row" key={`${job.org}-${job.start}`}>
                  <OrgMark className="w-mark" org={job.org} logo={job.logo} />
                  <span className="w-cell">
                    <span className="w-line">
                      <b>{job.role}</b>
                      <span className="w-when">
                        {job.start} — {job.end}
                      </span>
                    </span>
                    <i>{job.org}</i>
                    {job.note && <em>{job.note}</em>}
                  </span>
                </div>
              ))}
            </div>
            <span className="ios-label">Experience</span>
          </div>
        </div>

        <div className="ios-dock" aria-hidden="true">
          <i /><i /><i /><i />
        </div>

        <div className="ios-dots" aria-hidden="true">
          <i className="on" />
          <i />
        </div>
      </div>
    </div>
  );
}
