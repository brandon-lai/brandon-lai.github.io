import AboutBlock from "./AboutBlock";

/** Struck onto a sheet, ribbon slightly worn. */
export default function Typewriter({ jobs }) {
  return (
    <div className="sheet">
      <div className="sheet-inner">
        <div className="typed typed-head">CURRICULUM VITAE</div>
        <div className="typed typed-sub">B. LAI</div>
        <div className="typed typed-divider">{"=".repeat(46)}</div>

        <div className="typed typed-about">
          <AboutBlock />
        </div>
        <div className="typed typed-divider">{"-".repeat(46)}</div>

        {jobs.map((job) => (
          <div className="typed typed-row" key={`${job.org}-${job.start}`}>
            <div className="typed-line">
              <span>{job.role.toUpperCase()}</span>
              <span className="typed-leader" aria-hidden="true" />
              <span className="typed-when">
                {job.start} — {job.end}
              </span>
            </div>
            <div className="typed-org">{job.org}</div>
            {job.note && <div className="typed-note">{job.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
