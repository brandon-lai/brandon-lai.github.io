/** A label + big number/word + subtitle. */
export default function Stat({ eyebrow, stat, sub }) {
  return (
    <div className="stack">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <div className="stat">{stat}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
