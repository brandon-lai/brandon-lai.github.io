import AboutBlock from "./AboutBlock";

/** Roman inscription: all caps, interpuncts, chiselled into granite. */
export default function Stone({ jobs }) {
  return (
    <div className="slab">
      <div className="slab-face">
        <div className="chisel chisel-title">BRANDONVS·LAI</div>
        <div className="chisel-rule" />

        <div className="chisel chisel-about">
          <AboutBlock />
        </div>

        <div className="chisel-rule" />

        {jobs.map((job) => (
          <div className="chisel-entry" key={`${job.org}-${job.start}`}>
            <div className="chisel chisel-role">
              {job.org.toUpperCase()}·{job.role.toUpperCase()}
            </div>
            <div className="chisel chisel-date">
              {job.start.toUpperCase()} — {job.end.toUpperCase()}
            </div>
            {job.note && (
              <div className="chisel chisel-note">{job.note.toUpperCase()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
