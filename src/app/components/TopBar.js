import Link from "next/link";
import { SITE, SOCIALS } from "../data/site";
import { ICONS } from "./Icons";

export default function TopBar() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        {SITE.name}
      </Link>

      <div className="icon-row">
        {SOCIALS.map((s) => {
          const Icon = ICONS[s.icon] ?? ICONS.arrow;
          const external = /^https?:/.test(s.href);
          return (
            <a
              key={s.label}
              href={s.href}
              className="icon-btn"
              aria-label={s.label}
              title={s.label}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <Icon />
            </a>
          );
        })}
      </div>
    </header>
  );
}
