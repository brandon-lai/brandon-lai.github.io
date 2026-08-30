import AboutBlock from "./AboutBlock";

/** Before anyone drew a window: green phosphor, 80 columns. */
export default function Terminal({ jobs }) {
  return (
    <div className="crt">
      <div className="crt-screen">
        <div className="crt-lines">
          <div className="crt-line crt-dim">Last login: Tue Mar 14 09:41 on ttys000</div>

          <div className="crt-line">
            <span className="crt-prompt">brandon@unix:~$</span> cat about.txt
          </div>
          <div className="crt-about">
            <AboutBlock showEyebrow={false} />
          </div>
          <div className="crt-line crt-gap" />

          <div className="crt-line">
            <span className="crt-prompt">brandon@unix:~$</span> cat experience.txt
          </div>
          <div className="crt-line crt-gap" />

          {jobs.map((job) => (
            <div className="crt-record" key={`${job.org}-${job.start}`}>
              <div className="crt-line">
                <span className="crt-year">
                  [{job.start} — {job.end}]
                </span>
                <span className="crt-role">{job.role}</span>
                <span className="crt-org">@{job.org.toLowerCase()}</span>
              </div>
              {job.note && <div className="crt-line crt-note">{job.note}</div>}
            </div>
          ))}

          <div className="crt-line crt-gap" />
          <div className="crt-line crt-dim">{jobs.length} records</div>
          <div className="crt-line">
            <span className="crt-prompt">brandon@unix:~$</span>
            <span className="crt-cursor" aria-hidden="true" />
          </div>
        </div>
        <div className="crt-scan" aria-hidden="true" />
        <div className="crt-glow" aria-hidden="true" />
      </div>
    </div>
  );
}
