import AboutBlock from "./AboutBlock";
import OrgMark from "../../components/OrgMark";

/** A MacBook: thin silver lid, black bezel, notch, tapered base. */
export default function Laptop({ jobs }) {
  return (
    <div className="mb">
      <div className="mb-lid">
        <div className="mb-bezel">
          <div className="mb-notch" aria-hidden="true">
            <span className="mb-cam" />
          </div>
          <div className="mb-screen">
            <div className="mb-site">
              <div className="mb-nav">
                <span className="mb-pill is-on">Home</span>
                <span className="mb-pill">About</span>
                <span className="mb-pill">Work</span>
              </div>

              <div className="mb-cols">
                <div className="mb-card">
                  <AboutBlock variant="stacked" />
                </div>

                <div className="mb-card">
                  <span className="mb-eyebrow">Work</span>
                  <div className="mb-rows">
                    {jobs.map((job) => (
                      <div className="mb-row" key={`${job.org}-${job.start}`}>
                        <OrgMark className="mb-mark" org={job.org} logo={job.logo} />
                        <span className="mb-text">
                          <span className="mb-line">
                            <b>{job.role}</b>
                            <span className="mb-when">
                              {job.start} — {job.end}
                            </span>
                          </span>
                          <i>{job.org}</i>
                          {job.note && <em>{job.note}</em>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-hinge" aria-hidden="true" />
      <div className="mb-base" aria-hidden="true">
        <span className="mb-lip" />
      </div>
    </div>
  );
}
