import { ArrowUpRight } from "../Icons";

/** A small account / link card — avatar, handle, blurb, button. */
export default function LinkCard({ name, handle, body, glyph, cta, href }) {
  return (
    <div className="card">
      <div>
        <div className="card-head">
          <div className="card-id">
            <div className="avatar" aria-hidden="true">
              {(name || "?").slice(0, 1)}
            </div>
            <div>
              <div className="card-name">{name}</div>
              <div className="card-handle">{handle}</div>
            </div>
          </div>
          {glyph && (
            <div className="card-glyph" aria-hidden="true">
              {glyph}
            </div>
          )}
        </div>
        {body && <p className="card-body" style={{ margin: "16px 0 0" }}>{body}</p>}
      </div>

      {cta && (
        <a
          className="btn"
          href={href || "#"}
          target={/^https?:/.test(href || "") ? "_blank" : undefined}
          rel="noreferrer"
        >
          {cta}
          <ArrowUpRight width={15} height={15} />
        </a>
      )}
    </div>
  );
}
