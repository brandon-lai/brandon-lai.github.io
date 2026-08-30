import Link from "next/link";
import { ArrowUpRight } from "./Icons";

function CornerLink({ href, label }) {
  const external = /^https?:/.test(href);
  const props = {
    className: "tile-link",
    "aria-label": label || "Open",
    ...(external ? { target: "_blank", rel: "noreferrer" } : {}),
  };
  const icon = <ArrowUpRight width={17} height={17} />;

  return external ? (
    <a href={href} {...props}>{icon}</a>
  ) : (
    <Link href={href} {...props}>{icon}</Link>
  );
}

/**
 * Grid block shell: the rounded surface, the hover caption that sits in the
 * gutter beneath it, and the corner arrow link.
 *
 * `caption` accepts a small amount of HTML (<b>) so titles can be emphasised.
 */
export default function Tile({
  size = "sm",
  caption,
  href,
  label,
  arrow = true,
  interactive = true,
  className = "",
  children,
}) {
  return (
    <div
      className="tile-wrap"
      data-size={size}
      data-interactive={interactive ? "true" : "false"}
    >
      <div className={`tile ${className}`.trim()}>
        {children}
        {href && arrow && <CornerLink href={href} label={label} />}
      </div>

      {caption && (
        <div
          className="tile-caption"
          dangerouslySetInnerHTML={{ __html: caption }}
        />
      )}
    </div>
  );
}
