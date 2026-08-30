import { SOCIALS } from "../data/site";
import { ICONS, ArrowUpRight } from "../components/Icons";

export const metadata = { title: "Contact — Brandon Lai" };

export default function Contact() {
  return (
    <div className="page">
      <div className="prose">
        <h1>Contact</h1>
        <p>The fastest ways to reach me.</p>
      </div>

      <div className="row-list">
        {SOCIALS.map((s) => {
          const Icon = ICONS[s.icon] ?? ICONS.arrow;
          return (
            <a
              key={s.label}
              href={s.href}
              className="row-item"
              target={/^https?:/.test(s.href) ? "_blank" : undefined}
              rel="noreferrer"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon />
                <span className="row-title">{s.label}</span>
              </span>
              <ArrowUpRight width={16} height={16} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
