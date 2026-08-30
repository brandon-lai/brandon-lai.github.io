import AboutBlock from "./AboutBlock";

/** System 1, 512×342, one bit deep. */
export default function Macintosh({ jobs }) {
  return (
    <div className="mac">
      <div className="mac-screen">
        <div className="mac-menubar">
          <span className="mac-apple" aria-hidden="true">✦</span>
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Special</span>
        </div>

        <div className="mac-window">
          <div className="mac-titlebar">
            <span className="mac-close" aria-hidden="true" />
            <span className="mac-title">Brandon Lai</span>
          </div>

          <div className="mac-about">
            <AboutBlock />
          </div>

          <div className="mac-body">
            {jobs.map((job) => (
              <div className="mac-row" key={`${job.org}-${job.start}`}>
                <span className="mac-icon" aria-hidden="true" />
                <span className="mac-cell">
                  <span className="mac-line">
                    <span className="mac-name">{job.role}</span>
                    <span className="mac-meta">
                      {job.start} — {job.end}
                    </span>
                  </span>
                  <span className="mac-org">{job.org}</span>
                  {job.note && <span className="mac-note">{job.note}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mac-chin">
        <span className="mac-brand">Macintosh</span>
        <span className="mac-floppy" aria-hidden="true" />
      </div>
    </div>
  );
}
