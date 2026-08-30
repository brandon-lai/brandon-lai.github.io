/**
 * A company's logo, falling back to its initial when there isn't one.
 * Plain <img>: these are small static files and the site is a static export.
 */
export default function OrgMark({ org = "", logo, className = "" }) {
  return (
    <span className={className}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" />
      ) : (
        org.slice(0, 1)
      )}
    </span>
  );
}
