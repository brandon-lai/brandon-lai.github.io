import AboutBlock from "./AboutBlock";

/** Quill on aged parchment. */
export default function Manuscript({ jobs }) {
  return (
    <div className="parchment">
      <div className="parchment-inner">
        <div className="hand hand-title">A Record of Employment</div>

        <div className="hand hand-about">
          <AboutBlock />
        </div>
        <div className="hand-divider" />

        {jobs.map((job) => (
          <div className="hand hand-entry" key={`${job.org}-${job.start}`}>
            <div className="hand-role">
              {job.role}, <em>{job.org}</em>
            </div>
            <div className="hand-dates">
              in the years {job.start} to {job.end}
            </div>
            {job.note && <div className="hand-note">{job.note}</div>}
          </div>
        ))}
        <div className="hand hand-sign">— B. Lai</div>
      </div>
    </div>
  );
}
