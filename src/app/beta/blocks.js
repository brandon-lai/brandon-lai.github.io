import { useEffect, useRef, useState } from "react";
import { ABOUT, SOCIALS } from "../data/site";
import { EXPERIENCE } from "../data/experience";
import { ArrowUpRight, LinkedIn } from "../components/Icons";
import ACTIVITY from "../data/live/activity.json";
import BELI from "../data/beli.json";
import WatchBench from "./WatchBench";
import { useNear } from "./near";

/**
 * The page, block by block, and the act that builds each one.
 *
 *   size   bento preset (see globals.css)
 *   act    which choreography in engine.js puts it there
 *   len    how much scroll the act gets, in % of a viewport
 *   crew   the helpers who work it, by hard-hat colour; each one stays
 *          perched on the block afterwards at `perch` (0..1 along its top)
 *
 * Order is build order *and* grid order, so the camera mostly travels down.
 */

const LINKEDIN = SOCIALS.find((s) => s.label === "LinkedIn")?.href ?? "https://www.linkedin.com/";

export const HAT = {
  red: "#FF4D4F",
  yellow: "#F5B300",
  blue: "#3B82F6",
  green: "#1FA971",
  violet: "#8B5CF6",
  orange: "#FF7A45",
};

function Hero() {
  return (
    <div className="tile-pad is-hero">
      <h1 className="display">
        <span data-step="1">
          <span className="em">Brandon</span> is a software engineer who makes creative, whimsical, clean experiences
          for the web and apps.
        </span>
      </h1>
    </div>
  );
}

function Card() {
  return (
    <div className="card">
      <div>
        <div className="card-head">
          <div className="card-id">
            <div className="avatar" aria-hidden="true">B</div>
            <div>
              <div className="card-name">Brandon Lai</div>
              <div className="card-handle">in/brandon-lai</div>
            </div>
          </div>
          <div className="card-glyph" aria-hidden="true">
            <LinkedIn width={18} height={18} />
          </div>
        </div>
        <p className="card-body" style={{ margin: "16px 0 0" }}>Building at LinkedIn. Say hi.</p>
      </div>
      <a className="btn" href={LINKEDIN} target="_blank" rel="noreferrer">
        Connect <ArrowUpRight width={15} height={15} />
      </a>
    </div>
  );
}

/** the painted watch keeps the visitor's real time; the primer sketch stays at ten past */
function Dial({ sketch }) {
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  const hands = useRef(null);
  useEffect(() => {
    if (sketch) return;
    const [h, m, s] = hands.current.querySelectorAll("[data-hand]");
    const tick = () => {
      const d = new Date();
      const sec = d.getSeconds(), min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
      h.setAttribute("transform", `rotate(${(hr * 30).toFixed(2)})`);
      m.setAttribute("transform", `rotate(${(min * 6).toFixed(2)})`);
      s.setAttribute("transform", `rotate(${sec * 6})`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sketch]);
  return (
    <svg className={sketch ? "asm-dial is-sketch" : "asm-dial"} viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="44" className="d-case" />
      <circle r="38" className="d-face" />
      {ticks.map((i) => (
        <path key={i} className="d-tick" d={`M0 ${i % 3 ? -33 : -30}V-36`} transform={`rotate(${i * 30})`} />
      ))}
      <g ref={hands}>
        <path data-hand="h" className="d-hand" d="M0 4V-22" transform="rotate(-50)" />
        <path data-hand="m" className="d-hand d-min" d="M0 5V-31" transform="rotate(62)" />
        <path data-hand="s" className="d-sec" d="M0 8V-33" transform="rotate(0)" />
      </g>
      <circle r="2.4" className="d-pin" />
    </svg>
  );
}

function Watches({ layer }) {
  const sketch = layer === "primer";
  return (
    <div className="asm-pad asm-watches">
      <div className="eyebrow">Off hours</div>
      <Dial sketch={sketch} />
      <p className="asm-watch-copy">
        {ABOUT.watches.before}
        {sketch ? (
          ABOUT.watches.handle
        ) : (
          <a href={ABOUT.watches.href} target="_blank" rel="noreferrer">
            {ABOUT.watches.handle}
          </a>
        )}
        {ABOUT.watches.after}
      </p>
    </div>
  );
}

const MARATHONS = [
  ["2024", "Toronto Marathon"],
  ["2024", "TCS Toronto Waterfront Marathon"],
  ["2026", "Toronto Marathon"],
];

function Marathon() {
  return (
    <div className="stack asm-races">
      <div className="eyebrow">Marathons</div>
      <div className="stat">{MARATHONS.length}</div>
      <ul>
        {MARATHONS.map(([year, race], i) => (
          <li key={i}>
            <time>{year}</time>
            <span>{race}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Where I've lived, in order, drawn as one transit line; the last stop is home now */
const PLACES = ["Minnesota", "Nashville", "Boston", "Montreal", "Chicago", "Paris", "NYC"];

function Lived() {
  return (
    <div className="asm-pad asm-lived">
      <div className="eyebrow">Where I&rsquo;ve lived</div>
      <ol className="asm-route">
        {PLACES.map((place, i) => {
          const now = i === PLACES.length - 1;
          return (
            <li key={place} data-now={now || undefined} style={{ "--i": i }}>
              <span className="asm-stop" aria-hidden="true" />
              {place}
              {now && <span className="asm-now">now</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * "Timeless Tunes": Spotify's own playlist player, filling a small
 * tile. It plays right on the page (whole songs when signed in to Spotify,
 * previews otherwise). The share link's tracking parameter is left off.
 */
const PLAYLIST = "1zwhgNBZgMcdpFAR8QyBlW";

/**
 * A photo that loads once its block is about to be built (see near.js) rather
 * than on arrival. Tiles fix the photo's size, so a late load shifts nothing.
 * Without JavaScript the <noscript> copy shows it straight away.
 */
function NearImg({ src, alt, ...rest }) {
  const ref = useRef(null);
  const near = useNear(ref);
  return (
    <>
      <img ref={ref} src={near ? src : undefined} alt={alt} {...rest} />
      <noscript>
        <img src={src} alt={alt} {...rest} />
      </noscript>
    </>
  );
}

function Music() {
  const box = useRef(null);
  const near = useNear(box);
  // once loaded it stays loaded, so scrolling away never stops a song
  return (
    <div className="asm-music" ref={box}>
      {near && (
        <iframe
          src={`https://open.spotify.com/embed/playlist/${PLAYLIST}?utm_source=generator`}
          title="Timeless Tunes, a Spotify playlist"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      )}
    </div>
  );
}

/** "Sep 2022 – Present", or "May – Aug 2022" when a role starts and ends in one year */
function span({ start, end }) {
  const [sm, sy] = start.split(" ");
  const [em, ey] = end.split(" ");
  if (!ey) return `${start} \u2013 ${end}`;
  return sy === ey ? `${sm} \u2013 ${em} ${ey}` : `${start} \u2013 ${end}`;
}

function Work() {
  return (
    <div className="asm-pad">
      <div className="eyebrow">Where I&rsquo;ve worked</div>
      <ul className="asm-work">
        {EXPERIENCE.map((job) => (
          <li key={`${job.org}-${job.start}`}>
            <img src={job.logo} alt="" width="30" height="30" />
            <div>
              <b>{job.org}</b>
              <span>{job.role}</span>
            </div>
            <time>{span(job)}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tennis() {
  return (
    <div className="asm-photo asm-tennis">
      <NearImg src="/beta/tennis-serve.jpg" alt="Brandon tossing the ball up to serve on a grass court at dusk" />
      <div className="asm-photo-cap">
        <div className="stat">Tennis</div>
        <div className="stat-sub">Rain or shine. If there&rsquo;s a court, I&rsquo;m on it.</div>
      </div>
    </div>
  );
}

/** a semi-finalist deserves to be stamped as often as they like */
function restamp(e) {
  const el = e.currentTarget;
  el.classList.remove("is-restamped");
  void el.offsetWidth;
  el.classList.add("is-restamped");
}

function Tiramisu() {
  return (
    <div className="stack asm-tiramisu">
      {/* placeholder until there's a photo from the competition */}
      <div className="asm-photo-slot" role="img" aria-label="Photo from the Tiramisu World Cup, coming soon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        <span>Photo coming soon</span>
      </div>
      <button type="button" className="asm-badge" onClick={restamp} aria-label="Semi-finalist stamp. Press it again.">
        <span>Semi</span>
        <span>finalist</span>
      </button>
      <div className="eyebrow">Tiramisu World Cup</div>
      <div className="stat">Canada</div>
      <div className="stat-sub">Mascarpone, taken seriously</div>
    </div>
  );
}

/**
 * Rockpool, my WebGPU tide pool, running live inside the tile. It loads only
 * while the tile is on screen (and unloads after it leaves), only where the
 * browser has WebGPU and motion is welcome, and shows only once the pool says
 * it is drawing; until then, and for everyone else, the still stays up.
 * In ?embed mode the pool answers touch and hover (ripples, splashes, fleeing
 * fish) but leaves the wheel and vertical swipes to this page, so scrolling
 * over it still drives the build.
 */
const POOL = "https://rockpool-tide.vercel.app";

function Rockpool() {
  const box = useRef(null);
  const near = useNear(box);
  const [live, setLive] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!near || !el || !("gpu" in navigator) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // the pool posts { rockpool: "ready" } once it is actually drawing
    const ready = (e) => {
      if (e.origin === POOL && e.data?.rockpool === "ready") setShown(true);
    };
    window.addEventListener("message", ready);
    let off = 0;
    const io = new IntersectionObserver(
      ([en]) => {
        clearTimeout(off);
        if (en.isIntersecting) setLive(true);
        else
          off = setTimeout(() => {
            setLive(false);
            setShown(false);
          }, 3000);
      },
      { rootMargin: "150px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(off);
      window.removeEventListener("message", ready);
    };
  }, [near]);
  return (
    <div className="asm-pool" ref={box}>
      <div className="asm-pool-view">
        {near && (
          <picture>
            <source media="(max-width: 700px)" srcSet="/beta/rockpool-phone.jpg" />
            <img src="/beta/rockpool.jpg" alt="" />
          </picture>
        )}
        {live && (
          <iframe
            src={`${POOL}/?embed&hour=10&seed=7`}
            title="Rockpool, running live"
            tabIndex={-1}
            aria-hidden="true"
            data-on={shown || undefined}
          />
        )}
      </div>
      <div className="asm-pool-copy">
        <div className="eyebrow">
          <span data-step="1">Side project · live</span>
        </div>
        <div className="asm-big">
          <span data-step="2">Rockpool</span>
        </div>
        <p className="asm-note">
          <span data-step="3">A tide pool running live in your browser: WebGPU water, caustics and creatures. Touch the water.</span>
        </p>
        <a className="asm-inline" href={POOL} target="_blank" rel="noreferrer">
          <span data-step="3">Wade in</span> <ArrowUpRight width={13} height={13} />
        </a>
      </div>
    </div>
  );
}

/** myrel, my iOS app: its real screens cycling in a phone that rises out of the tile */
const MYREL = [
  { src: "/beta/myrel-inbox.jpg", alt: "myrel's inbox: who to catch up with, and birthdays coming up" },
  { src: "/beta/myrel-contact-detail.jpg", alt: "A person in myrel, with a catch-up cadence and how you met" },
  { src: "/beta/myrel-profile.jpg", alt: "Your myrel card, shared as a QR code" },
];

function Myrel() {
  const box = useRef(null);
  const near = useNear(box);
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const io = new IntersectionObserver(([en]) => {
      clearInterval(timer);
      if (en.isIntersecting) timer = setInterval(() => setI((k) => (k + 1) % MYREL.length), 3200);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="asm-myrel-card">
      <div className="asm-myrel-copy">
        <div className="eyebrow">Side project · iOS</div>
        <div className="asm-big">myrel</div>
        <p className="asm-note">A private notebook for the people in your life. Jot what matters, get nudged to catch up, swap cards by QR.</p>
      </div>
      <div className="asm-myrel-phone" ref={box}>
        <div className="asm-myrel-screen">
          {MYREL.map((s, k) => (
            <img key={s.src} src={near ? s.src : undefined} alt={s.alt} data-on={k === i || undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** loops silently; holds on the first frame for anyone who prefers less motion */
/**
 * A muted, looping clip that starts from the top each time it comes into view
 * and pauses once it leaves. With reduced motion it stays on its poster.
 */
function Clip(props) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return el.pause();
    let inView = false;
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting === inView) return;
        inView = en.isIntersecting;
        if (inView) {
          el.currentTime = 0;
          el.play?.().catch(() => {});
        } else el.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const near = useNear(ref);
  const { src, poster, ...rest } = props;
  return <video ref={ref} muted loop playsInline preload="metadata" src={near ? src : undefined} poster={near ? poster : undefined} {...rest} />;
}

function Smoodi() {
  return (
    <div className="asm-smoodi-card">
      <figure className="asm-smoodi-clip">
        <Clip src="/beta/smoodi-prototype.mp4" poster="/beta/smoodi-prototype.jpg" aria-label="Our 2020 prototype blending a smoothie, then cleaning itself, sped up" />
        <figcaption>Prototype, 2020 · sped up</figcaption>
      </figure>
      <div className="asm-smoodi-copy">
        <NearImg className="asm-smoodi-render" src="/beta/smoodi-render.jpg" alt="The smoodi machine today, next to a fridge of frozen smoothie cups" />
        <div className="eyebrow">2019–2020 · founding engineer</div>
        <div className="asm-big">smoodi</div>
        <p className="asm-note">
          Second hire. We built the first fully self-cleaning smoothie robot: scan a cup, it blends in under a minute,
          then washes itself for the next person.
        </p>
        <a className="asm-inline" href="https://www.getsmoodi.com/technology" target="_blank" rel="noreferrer">
          How it works <ArrowUpRight width={13} height={13} />
        </a>
      </div>
    </div>
  );
}

/** one favourite line; swap the text and `by` to change it */
const QUOTE = { text: "What is impossible to envision is impossible to do.", by: null };

function Quote() {
  return (
    <figure className="asm-quote-card">
      <svg viewBox="0 0 32 24" aria-hidden="true">
        <path d="M0 24V14C0 6 4 1 12 0l1 3C8 5 6 8 6 12h6v12zm19 0V14c0-8 4-13 12-14l1 3c-5 2-7 5-7 9h6v12z" />
      </svg>
      <blockquote>{QUOTE.text}</blockquote>
      {QUOTE.by && <figcaption>{QUOTE.by}</figcaption>}
    </figure>
  );
}

function Bench() {
  return <WatchBench />;
}

function Also() {
  return (
    <div className="asm-photo asm-also-photo">
      <NearImg src="/beta/scuba.jpg" alt="Brandon scuba diving, mask on, bubbles rising" />
      <div className="asm-photo-cap">
        <div className="eyebrow">Also</div>
        <div className="asm-tags">
          <span>guitar</span>
          <span>scuba</span>
          <span>snowboard</span>
        </div>
      </div>
    </div>
  );
}


/* ---- live panels -------------------------------------------------------- */
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const short = (t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const num = (v, dec = 0) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** totals as of the build (the site rebuilds daily, so "this week" stays true) */
/** how each kind of workout shows up: chip, bar colour, and the number that suits it */
const SPORT = {
  tennis: { icon: "\u{1F3BE}", color: "#9bc53d", stat: (w) => [hours(w), "h tennis"] },
  run: { icon: "\u{1F3C3}", color: "#ff6a3d", stat: (w) => (miles(w) ? [miles(w), "mi run"] : [hours(w), "h running"]) },
  class: { icon: "\u{1F3CB}\u{FE0F}", color: "#8b5cf6", stat: (w) => [w.length, w.length === 1 ? "class" : "classes"] },
  ride: { icon: "\u{1F6B4}", color: "#3b82f6", stat: (w) => (miles(w) ? [miles(w), "mi ridden"] : [hours(w), "h riding"]) },
  swim: { icon: "\u{1F3CA}", color: "#06b6d4", stat: (w) => [w.length, w.length === 1 ? "swim" : "swims"] },
  walk: { icon: "\u{1F6B6}", color: "#94a3b8", stat: (w) => [miles(w) || hours(w), miles(w) ? "mi walked" : "h walking"] },
  other: { icon: "\u26A1", color: "#f5b300", stat: (w) => [hours(w), "h other"] },
};
const ORDER = ["tennis", "run", "class", "ride", "swim", "walk", "other"];
const hours = (ws) => Math.round(ws.reduce((t, w) => t + w.min, 0) / 6) / 10;
const miles = (ws) => Math.round(ws.reduce((t, w) => t + (w.mi ?? 0), 0));
const span2 = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m` : `${min}m`);
const dayOf = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function activityStats(workouts, now = Date.now()) {
  const today = Date.parse(iso(now));
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY;
  const year = new Date(today).getUTCFullYear();
  const thisYear = workouts.filter((w) => w.date.startsWith(`${year}-`));
  const thisWeek = workouts.filter((w) => w.date >= iso(monday));
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = monday - (11 - i) * DAY * 7;
    const from = iso(start), to = iso(start + 7 * DAY);
    const ws = workouts.filter((w) => w.date >= from && w.date < to);
    return { start, total: ws.reduce((t, w) => t + w.min, 0), by: ORDER.map((g) => [g, ws.filter((w) => w.group === g).reduce((t, w) => t + w.min, 0)]).filter(([, m]) => m) };
  });
  const sports = ORDER.map((g) => [g, thisYear.filter((w) => w.group === g)])
    .filter(([, ws]) => ws.length)
    .sort((a, b) => b[1].reduce((t, w) => t + w.min, 0) - a[1].reduce((t, w) => t + w.min, 0))
    .slice(0, 3);
  return {
    year,
    count: thisYear.length,
    hours: hours(thisYear),
    week: { count: thisWeek.length, hours: hours(thisWeek) },
    weeks,
    peak: Math.max(...weeks.map((w) => w.total), 1),
    sports,
    latest: [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3),
  };
}

/**
 * This week from Strava, via Strava's own activity-summary widget. It's a
 * cross-origin frame with a fixed 300x160 layout, so it can't be restyled
 * inside; instead it's cropped to its stats row (our own heading and a Strava
 * link stand in for its header and button), scaled to our type size, and
 * blended into the tile: multiplied in light mode so its white melts into the
 * surface, inverted and screened in dark mode.
 */
const STRAVA = {
  profile: "https://www.strava.com/athletes/70165341",
  summary: "https://www.strava.com/athletes/70165341/activity-summary/ad90afb35a87bed54247661f23519e2fd3b600ff",
  // same share token; this one lists the latest runs (cropped below to leave out the route maps)
  latest: "https://www.strava.com/athletes/70165341/latest-rides/ad90afb35a87bed54247661f23519e2fd3b600ff",
};

/** a Strava widget, cropped by its box, loaded once its block is near */
function NearFrame({ className, src, title }) {
  const box = useRef(null);
  const near = useNear(box);
  return (
    <div className={className} ref={box}>
      {near && <iframe src={src} title={title} scrolling="no" tabIndex={-1} />}
    </div>
  );
}

function StravaWeek({ link = true }) {
  return (
    <div className="asm-strava">
      <div className="asm-strava-head">
        <span>This week</span>
        {link && (
          <a href={STRAVA.profile} target="_blank" rel="noreferrer">
            Strava <ArrowUpRight width={11} height={11} />
          </a>
        )}
      </div>
      <NearFrame className="asm-strava-crop" src={STRAVA.summary} title="This week's distance, time and elevation on Strava" />
    </div>
  );
}

/** the latest three runs: names, distance, time, climb and date, without the route maps */
function StravaLatest() {
  return (
    <div className="asm-strava">
      <div className="asm-strava-head">
        <span>Latest runs</span>
      </div>
      <NearFrame className="asm-strava-crop is-latest" src={STRAVA.latest} title="My latest runs on Strava" />
    </div>
  );
}

function Running() {
  // until the Shortcut has sent workouts, show only what's real: Strava
  if (ACTIVITY.sample || !ACTIVITY.workouts.length)
    return (
      <div className="asm-pad asm-running is-strava">
        <div className="asm-head">
          <div className="eyebrow">Running</div>
          <a className="asm-strava-link" href={STRAVA.profile} target="_blank" rel="noreferrer">
            Follow on Strava <ArrowUpRight width={11} height={11} />
          </a>
        </div>
        <StravaWeek link={false} />
        <StravaLatest />
      </div>
    );
  const st = activityStats(ACTIVITY.workouts);
  return (
    <div className="asm-pad asm-running asm-activity">
      <div className="asm-head">
        <div className="eyebrow">Staying active · {st.year}</div>
        <a className="asm-strava-link" href={STRAVA.profile} target="_blank" rel="noreferrer">
          Strava <ArrowUpRight width={11} height={11} />
        </a>
      </div>
      <div className="asm-stats">
        <div>
          <b data-count={st.count}>{st.count}</b>
          <span>
            workouts<span className="asm-wide"> this year</span>
          </span>
        </div>
        <div>
          <b data-count={Math.round(st.hours)}>{num(Math.round(st.hours))}</b>
          <span>hours</span>
        </div>
        <div>
          <b data-count={st.week.count}>{st.week.count}</b>
          <span>
            this week<span className="asm-wide">{st.week.count ? ` · ${num(st.week.hours, 1)} h` : ""}</span>
          </span>
        </div>
      </div>
      <ul className="asm-sports">
        {st.sports.map(([g, ws]) => {
          const [v, label] = SPORT[g].stat(ws);
          return (
            <li key={g} style={{ "--c": SPORT[g].color }}>
              <span aria-hidden="true">{SPORT[g].icon}</span>
              <b>{num(v)}</b> {label}
            </li>
          );
        })}
      </ul>
      <div className="asm-weeks" role="img" aria-label={`Hours active per week for the last 12 weeks: ${st.weeks.map((w) => num(w.total / 60, 1)).join(", ")}`}>
        {st.weeks.map((w, i) => (
          <span key={w.start} className="asm-week is-stacked" style={{ "--h": (w.total / st.peak).toFixed(3), "--i": i }} data-now={i === 11 || undefined}>
            <i>
              {w.by.map(([g, m]) => (
                <em key={g} style={{ "--c": SPORT[g].color, flexGrow: m }} />
              ))}
            </i>
          </span>
        ))}
      </div>
      <ol className="asm-latest">
        {st.latest.map((w, i) => (
          <li key={`${w.date}-${i}`}>
            <span className="asm-chip" aria-hidden="true">
              {SPORT[w.group].icon}
            </span>
            <b>{w.type}</b>
            <span className="asm-latest-d">
              {span2(w.min)}
              {w.mi ? ` · ${num(w.mi, 1)} mi` : ""}
            </span>
            <time dateTime={w.date}>{dayOf(w.date)}</time>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** the leading run of ranks (a gap means a row is still missing), up to ten */
function topTen(places) {
  const byRank = [...places].sort((a, b) => a.rank - b.rank);
  const out = [];
  for (const p of byRank) {
    if (p.rank !== out.length + 1 || out.length === 10) break;
    out.push(p);
  }
  return out;
}

const asOf = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** one Beli list as the app lays it out: rank and name, price and cuisine, place, score ring */
function BeliRows({ rows, ranked, steps, hidden }) {
  return (
    <ol className="asm-ranks" style={{ "--rows": Math.ceil(rows.length / 2) }} hidden={hidden}>
      {rows.map((p, i) => (
        <li key={p.name} data-step={steps ? i + 1 : undefined}>
          <span className="asm-place">
            <b>{ranked ? `${p.rank}. ${p.name}` : p.name}</b>
            {(p.price || p.cuisines.length > 0) && (
              <span>{[p.price, p.cuisines.join(", ")].filter(Boolean).join(" \u2022 ")}</span>
            )}
            <span>{p.location}</span>
          </span>
          <span className="asm-score">{p.score.toFixed(1)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * My Beli lists, switchable like the app. The default view (Restaurants →
 * Been) stays mounted and is the one the waiter serves row by row; the
 * others mount only when picked, so they never carry the serve steps.
 */
function Beli() {
  const lists = BELI.lists;
  const [listId, setListId] = useState(lists[0].id);
  const [tab, setTab] = useState("been");
  const list = lists.find((l) => l.id === listId) ?? lists[0];
  const view = tab === "want" && list.want?.length ? "want" : "been";
  const isDefault = list === lists[0] && view === "been";
  const served = topTen(lists[0].been);
  const rows = view === "want" ? list.want.slice(0, 10) : topTen(list.been);
  return (
    <div className="asm-pad asm-beli">
      <div className="asm-beli-head">
        <label className="asm-beli-title">
          <select aria-label="Beli list" value={list.id} onChange={(e) => setListId(e.target.value)}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <ChevronDown />
        </label>
        <div className="asm-beli-tabs" role="tablist" aria-label="Been or want to try">
          {[
            ["been", "Been"],
            ["want", "Want to Try"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              disabled={id === "want" && !list.want?.length}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <BeliRows rows={served} ranked steps hidden={!isDefault} />
      {!isDefault && <BeliRows rows={rows} ranked={view === "been"} />}
      <div className="asm-foot" data-step={served.length + 1}>
        <span>
          {view === "been" ? `My top ${rows.length}, by score` : "Next on my list"} · {asOf(BELI.asOf)}
        </span>
        <a className="asm-beli-profile" href={BELI.profile} target="_blank" rel="noreferrer">
          @{BELI.profile.split("/").pop()} on Beli <ArrowUpRight width={13} height={13} />
        </a>
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Banner() {
  return (
    <div className="asm-banner">
      <div className="asm-banner-title">Thanks for stopping by.</div>
      <p className="asm-banner-note">
        Whether you&rsquo;re building something, hiring, or just want to swap notes on watches or tiramisu, I&rsquo;d
        love to hear from you.
      </p>
      <span className="asm-banner-sign">&mdash; Brandon</span>
      <a className="btn" href={LINKEDIN} target="_blank" rel="noreferrer">
        Say hi on LinkedIn <ArrowUpRight width={15} height={15} />
      </a>
    </div>
  );
}

export const BLOCKS = [
  {
    id: "hero",
    size: "lg",
    act: "agent",
    len: 125,
    crew: [{ hat: HAT.red, tool: "laptop" }],
    perch: [0.84],
    term: { u: 0.5, v: 0.5 },
    title: "agent · hero.jsx",
    script: [
      { t: "$ agent build --block hero" },
      { t: "  reading data/site.js", dim: true },
      { t: "  ✓ headline", ok: true, step: 1 },
      { t: "  done · 1 block, 0 errors", dim: true },
    ],
    Content: Hero,
  },
  {
    id: "work",
    size: "lg",
    act: "haul",
    len: 95,
    crew: [{ hat: HAT.yellow }, { hat: HAT.blue }],
    perch: [0.16, 0.3],
    Content: Work,
  },
  {
    id: "linkedin",
    size: "sm",
    act: "balloon",
    len: 75,
    crew: [{ hat: HAT.green }],
    perch: [0.5],
    Content: Card,
  },
  {
    id: "lived",
    size: "sm",
    act: "voxel",
    len: 85,
    crew: [{ hat: HAT.red, tool: "batons" }],
    perch: [0.5],
    Content: Lived,
  },
  {
    id: "bench",
    size: "lg",
    act: "crane",
    len: 75,
    // after it lands, the camera stays put for this much scroll while the watch comes apart
    hold: 70,
    crew: [{ hat: HAT.yellow, outfit: "watchmaker" }],
    perch: [0.72],
    Content: Bench,
  },
  {
    id: "watches",
    size: "tall",
    act: "spray",
    len: 100,
    crew: [{ hat: HAT.violet, tool: "spray", prop: true }],
    perch: [0.6],
    paint: true,
    Content: Watches,
  },
  {
    id: "myrel",
    size: "tall",
    act: "balloon",
    len: 75,
    crew: [{ hat: HAT.violet }],
    perch: [0.5],
    Content: Myrel,
  },
  {
    id: "smoodi",
    size: "lg",
    act: "crane",
    len: 70,
    crew: [{ hat: HAT.orange }],
    perch: [0.5],
    Content: Smoodi,
  },
  {
    id: "rockpool",
    size: "md",
    act: "agent",
    len: 105,
    crew: [{ hat: HAT.blue, tool: "laptop" }],
    perch: [0.5],
    term: { u: 0.62, v: 0.52 },
    title: "agent · rockpool.jsx",
    script: [
      { t: "$ agent build --block rockpool" },
      { t: "+ <Eyebrow>Side project · live</Eyebrow>", add: true, step: 1 },
      { t: "+ <LivePool webgpu tide={10} />", add: true },
      { t: "+ <Title>Rockpool</Title>", add: true, step: 2 },
      { t: "+ <Note>Touch the water.</Note>", add: true, step: 3 },
      { t: "  ✓ 60 fps, wet", ok: true },
    ],
    Content: Rockpool,
  },
  {
    id: "tennis",
    size: "tall",
    act: "push",
    from: "right",
    len: 65,
    crew: [{ hat: HAT.green, outfit: "tennis" }],
    perch: [0.3],
    Content: Tennis,
  },
  {
    id: "marathon",
    size: "sm",
    act: "roller",
    len: 75,
    crew: [{ hat: HAT.orange, outfit: "runner" }],
    perch: [0.78],
    paint: true,
    Content: Marathon,
  },
  {
    id: "running",
    size: "md",
    act: "run",
    len: 85,
    crew: [{ hat: HAT.orange, outfit: "runner" }],
    perch: [0.84],
    Content: Running,
  },
  {
    id: "tiramisu",
    size: "sm",
    act: "stamp",
    len: 70,
    crew: [{ hat: HAT.red, outfit: "chef" }],
    perch: [0.72],
    Content: Tiramisu,
  },
  {
    id: "also",
    size: "sm",
    act: "push",
    from: "left",
    len: 65,
    crew: [{ hat: HAT.violet, outfit: "scuba" }],
    perch: [0.7],
    Content: Also,
  },
  {
    id: "beli",
    size: "lg",
    act: "serve",
    len: 110,
    crew: [{ hat: HAT.green, tool: "tray" }],
    perch: [0.5],
    Content: Beli,
  },
  {
    id: "quote",
    size: "xs",
    act: "balloon",
    len: 75,
    crew: [{ hat: HAT.yellow }],
    perch: [0.5],
    Content: Quote,
  },
  {
    id: "music",
    size: "band",
    act: "push",
    from: "right",
    len: 65,
    crew: [{ hat: HAT.green, outfit: "dj" }],
    perch: [0.5],
    Content: Music,
  },
  {
    id: "banner",
    size: "wide",
    act: "unroll",
    len: 90,
    crew: [{ hat: HAT.blue }, { hat: HAT.yellow }],
    perch: [0.62, 0.7],
    Content: Banner,
  },
];

/** every crew member, plus the foreman who opens and closes the show */
export const HELPERS = BLOCKS.reduce((n, b) => n + b.crew.length, 0) + 1;

/** grid footprint shown on each empty slot: columns × row units */
export const FOOTPRINT = { xs: "1×2", sm: "1×3", tall: "1×5", md: "2×4", lg: "2×5", xl: "2×7", wide: "4×3", band: "2×3" };

/* ---- the timeline, in % of a viewport of scroll ---------------------- */
export const INTRO = 35;
export const GAP = 10;
export const FINALE = 80;

export const TIMELINE = (() => {
  let at = INTRO;
  const acts = BLOCKS.map((b) => {
    const a = { id: b.id, start: at, end: at + b.len, hold: b.hold ?? 0 };
    at = a.end + a.hold + GAP;
    return a;
  });
  return { acts, finaleStart: at, total: at + FINALE };
})();

/** the most cubes a voxel act can fly in */
export const MAX_CUBES = 84;
