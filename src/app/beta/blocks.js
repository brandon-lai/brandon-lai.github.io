import { ABOUT, SOCIALS } from "../data/site";
import { EXPERIENCE } from "../data/experience";
import { ArrowUpRight, LinkedIn } from "../components/Icons";
import STRAVA from "../data/live/strava.json";
import BELI from "../data/live/beli.json";

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
          <span className="em">Brandon</span> is a software engineer at <span className="em">LinkedIn</span> who
          builds small worlds for fun.
        </span>
      </h1>
      <div className="rule" />
      <div className="manifesto">
        {ABOUT.lead.map((line) => (
          <p key={line}>
            <span data-step="2">{line}</span>
          </p>
        ))}
        <p>
          <span data-step="3">This page is one of them. Every block on it was put here by a small crew while you scrolled.</span>
        </p>
      </div>
      <div className="footnote">
        <span data-step="4">
          <span className="star">*</span> <u>no blocks were harmed in the making of this page</u>
        </span>
      </div>
    </div>
  );
}

function Now() {
  return (
    <div className="asm-pad">
      <div className="eyebrow">Now</div>
      <ul className="asm-list">
        {ABOUT.bullets.map(({ emoji, label }) => (
          <li key={label}>
            <span className="asm-chip" aria-hidden="true">{emoji}</span>
            {label}
          </li>
        ))}
      </ul>
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

function Dial({ sketch }) {
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  return (
    <svg className={sketch ? "asm-dial is-sketch" : "asm-dial"} viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="44" className="d-case" />
      <circle r="38" className="d-face" />
      {ticks.map((i) => (
        <path key={i} className="d-tick" d={`M0 ${i % 3 ? -33 : -30}V-36`} transform={`rotate(${i * 30})`} />
      ))}
      <path className="d-hand" d="M0 4V-22" transform="rotate(-50)" />
      <path className="d-hand d-min" d="M0 5V-31" transform="rotate(62)" />
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
      <div className="asm-big">Vintage watches</div>
      <p className="asm-note">A few hundred tiny parts that agree to keep time for fifty years.</p>
      {!sketch && (
        <a className="asm-inline" href={ABOUT.watches.href} target="_blank" rel="noreferrer">
          {ABOUT.watches.handle} <ArrowUpRight width={13} height={13} />
        </a>
      )}
    </div>
  );
}

function Marathon() {
  return (
    <div className="stack">
      <div className="eyebrow">Miles</div>
      <div className="stat">26.2</div>
      <div className="stat-sub">Marathoner, ex-rower</div>
    </div>
  );
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
            <time>{job.start.slice(-4)}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tennis() {
  return (
    <div className="stack">
      <svg className="asm-ball" viewBox="-20 -20 40 40" aria-hidden="true">
        <circle r="17" />
        <path d="M-12 -12C-4 -5 -4 5 -12 12M12 -12C4 -5 4 5 12 12" />
      </svg>
      <div className="stat">Tennis</div>
      <div className="stat-sub">Most weekends, any weather</div>
    </div>
  );
}

function Tiramisu() {
  return (
    <div className="stack">
      <div className="asm-badge" aria-hidden="true">
        <span>Semi</span>
        <span>finalist</span>
      </div>
      <div className="eyebrow">Tiramisu World Cup</div>
      <div className="stat">Canada</div>
      <div className="stat-sub">Mascarpone, taken seriously</div>
    </div>
  );
}

function IslandArt() {
  const paths = [
    "M6 92C30 86 52 98 76 92S122 86 146 92S190 98 214 92",
    "M44 90C58 62 88 50 112 52S160 66 176 90",
    "M94 58C93 44 96 32 103 22",
    "M103 22C95 18 86 20 80 26M103 22C110 16 120 16 127 21M103 22C102 14 97 9 90 8M103 22C108 27 110 34 108 40",
    "M128 66h18v-14l-9 -7l-9 7Z",
    "M174 28a10 10 0 1 0 0.1 0",
    "M20 106C40 102 60 110 80 106S120 102 140 106",
  ];
  return (
    <svg className="asm-island" viewBox="0 0 220 116" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength="1" style={{ "--i": i }} />
      ))}
    </svg>
  );
}

function Island() {
  return (
    <div className="asm-pad asm-island-tile">
      <div className="eyebrow">
        <span data-step="1">Side project</span>
      </div>
      <IslandArt />
      <div className="asm-big">
        <span data-step="2">A tiny island I&rsquo;m building</span>
      </div>
      <span className="asm-inline asm-soon">
        <span data-step="3">Coming soon</span>
      </span>
    </div>
  );
}

function Smoodi() {
  return (
    <div className="stack">
      <img className="asm-logo" src="/logos/smoodi.png" alt="" width="40" height="40" />
      <div className="eyebrow">2019 · founding engineer</div>
      <div className="stat">smoodi</div>
      <div className="stat-sub">The first self-cleaning smoothie robot</div>
    </div>
  );
}

function Also() {
  return (
    <div className="stack">
      <div className="eyebrow">Also</div>
      <div className="asm-tags">
        <span>guitar</span>
        <span>scuba</span>
        <span>snowboard</span>
        <span>rowing</span>
      </div>
      <div className="stat-sub">All at a respectable beginner level</div>
    </div>
  );
}


/* ---- live panels: data synced by services/sync.mjs at build time ------- */
const MILE = 1609.344;
const day = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const hm = (s) => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
const num = (v, dec = 0) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const FOOT = new Set(["Run", "TrailRun", "VirtualRun", "Walk", "Hike"]);

function Strava() {
  const s = STRAVA;
  const metric = s.units === "metric";
  const unit = metric ? "km" : "mi";
  const d = (m) => m / (metric ? 1000 : MILE);
  const last = s.recent.find((a) => a.route) ?? s.recent[0];
  const effort = (a) => {
    if (!a.distance || !a.movingTime) return hm(a.movingTime);
    if (FOOT.has(a.sport)) {
      const per = a.movingTime / d(a.distance);
      const mm = Math.floor(per / 60), ss = Math.round(per % 60);
      return `${ss === 60 ? mm + 1 : mm}:${String(ss === 60 ? 0 : ss).padStart(2, "0")} /${unit}`;
    }
    return `${num(d(a.distance) / (a.movingTime / 3600), 1)} ${metric ? "km/h" : "mph"}`;
  };
  const href = (a) => (a?.id ? `https://www.strava.com/activities/${a.id}` : "https://www.strava.com/");
  return (
    <div className="asm-pad asm-strava">
      <div className="asm-head">
        <div className="eyebrow">Strava · last 7 days</div>
        {s.sample && <span className="asm-sample">Sample data</span>}
      </div>
      <div className="asm-stats">
        <div>
          <b data-count={d(s.week.distance)} data-dec="1">{num(d(s.week.distance), 1)}</b>
          <span>{metric ? "kilometres" : "miles"}</span>
        </div>
        <div>
          <b data-count={s.week.count}>{s.week.count}</b>
          <span>{s.week.count === 1 ? "activity" : "activities"}</span>
        </div>
        <div>
          <b>{hm(s.week.movingTime)}</b>
          <span>moving</span>
        </div>
      </div>
      {last && (
        <a className="asm-route-card" href={href(last)} target="_blank" rel="noreferrer">
          {last.route ? (
            <svg className="asm-route" viewBox="0 0 100 70" aria-hidden="true">
              <path className="ghost" d={last.route} />
              <path d={last.route} pathLength="1" />
            </svg>
          ) : (
            <span className="asm-route asm-route-none" aria-hidden="true" />
          )}
          <span className="asm-route-meta">
            <b>{last.name}</b>
            <span>
              {num(d(last.distance), 1)} {unit} · {effort(last)}
            </span>
            <span>{day(last.date)}</span>
          </span>
        </a>
      )}
      <div className="asm-foot">
        <span>
          {new Date(s.updated).getUTCFullYear()} so far: <b data-count={d(s.ytd.run.distance)}>{num(d(s.ytd.run.distance))}</b> {unit} run
        </span>
        <a className="asm-powered" href={href(last)} target="_blank" rel="noreferrer">
          Powered by Strava
        </a>
      </div>
    </div>
  );
}

const tone = (score) => (score >= 7 ? "high" : score >= 4 ? "mid" : "low");

function Beli() {
  const b = BELI;
  const top = b.top.slice(0, 5);
  return (
    <div className="asm-pad asm-beli">
      <div className="asm-head">
        <div className="eyebrow">Beli · my top spots</div>
        {b.sample && <span className="asm-sample">Sample data</span>}
      </div>
      <ol className="asm-ranks">
        {top.map((p, i) => (
          <li key={`${p.name}-${i}`} data-step={i + 1}>
            <span className="asm-rank">{i + 1}</span>
            <span className="asm-place">
              <b>{p.name}</b>
              <span>{[p.area, p.cuisine, p.price ? "$".repeat(p.price) : null].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="asm-score" data-tone={tone(p.score)}>
              {p.score.toFixed(1)}
            </span>
          </li>
        ))}
      </ol>
      <div className="asm-foot" data-step={top.length + 1}>
        <span>
          <b>{b.counts.been}</b> ranked · <b>{b.counts.wantToTry}</b> on my want-to-try
        </span>
        {b.recent[0] && <span>Latest: {b.recent[0].name}</span>}
      </div>
    </div>
  );
}

function Banner() {
  return (
    <div className="asm-banner">
      <div>
        <div className="asm-banner-title">That&rsquo;s the whole page.</div>
        <div className="asm-note">
          {BLOCKS.length} blocks, {HELPERS} helpers, one scroll.
        </div>
      </div>
      <a className="btn" href={LINKEDIN} target="_blank" rel="noreferrer">
        Say hi on LinkedIn <ArrowUpRight width={15} height={15} />
      </a>
    </div>
  );
}

export const BLOCKS = [
  {
    id: "hero",
    size: "xl",
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
      { t: "  ✓ the two lines about cities", ok: true, step: 2 },
      { t: "  ✓ the line about this page", ok: true, step: 3 },
      { t: "  ✓ footnote", ok: true, step: 4 },
      { t: "  done · 1 block, 0 errors", dim: true },
    ],
    Content: Hero,
  },
  {
    id: "now",
    size: "md",
    act: "haul",
    len: 85,
    crew: [{ hat: HAT.yellow }, { hat: HAT.blue }],
    perch: [0.16, 0.3],
    Content: Now,
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
    id: "marathon",
    size: "sm",
    act: "roller",
    len: 75,
    crew: [{ hat: HAT.orange }],
    perch: [0.78],
    paint: true,
    Content: Marathon,
  },
  {
    id: "work",
    size: "lg",
    act: "voxel",
    len: 105,
    crew: [{ hat: HAT.yellow, tool: "batons" }],
    perch: [0.1],
    Content: Work,
  },
  {
    id: "tennis",
    size: "sm",
    act: "push",
    from: "right",
    len: 65,
    crew: [{ hat: HAT.green }],
    perch: [0.3],
    Content: Tennis,
  },
  {
    id: "tiramisu",
    size: "sm",
    act: "stamp",
    len: 70,
    crew: [{ hat: HAT.red }],
    perch: [0.72],
    Content: Tiramisu,
  },
  {
    id: "island",
    size: "md",
    act: "agent",
    len: 105,
    crew: [{ hat: HAT.blue, tool: "laptop" }],
    perch: [0.5],
    term: { u: 0.62, v: 0.52 },
    title: "agent · island.jsx",
    script: [
      { t: "$ agent build --block island" },
      { t: "+ <Eyebrow>Side project</Eyebrow>", add: true, step: 1 },
      { t: "+ <IslandSketch strokes={7} />", add: true, draw: true },
      { t: "+ <Title>A tiny island…</Title>", add: true, step: 2 },
      { t: "+ <Soon />", add: true, step: 3 },
      { t: "  ✓ rendered in 0.8s", ok: true },
    ],
    Content: Island,
  },
  {
    id: "smoodi",
    size: "sm",
    act: "crane",
    len: 70,
    crew: [{ hat: HAT.orange }],
    perch: [0.5],
    Content: Smoodi,
  },
  {
    id: "also",
    size: "sm",
    act: "push",
    from: "left",
    len: 65,
    crew: [{ hat: HAT.violet }],
    perch: [0.7],
    Content: Also,
  },
  {
    id: "strava",
    size: "md",
    act: "run",
    len: 85,
    crew: [{ hat: HAT.orange }],
    perch: [0.84],
    Content: Strava,
  },
  {
    id: "beli",
    size: "md",
    act: "serve",
    len: 90,
    crew: [{ hat: HAT.green, tool: "tray" }],
    perch: [0.5],
    Content: Beli,
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
export const FOOTPRINT = { sm: "1×3", tall: "1×5", md: "2×4", lg: "2×5", xl: "2×7", wide: "4×3" };

/* ---- the timeline, in % of a viewport of scroll ---------------------- */
export const INTRO = 35;
export const GAP = 10;
export const FINALE = 80;

export const TIMELINE = (() => {
  let at = INTRO;
  const acts = BLOCKS.map((b) => {
    const a = { id: b.id, start: at, end: at + b.len };
    at = a.end + GAP;
    return a;
  });
  return { acts, finaleStart: at, total: at + FINALE };
})();

/** the most cubes a voxel act can fly in */
export const MAX_CUBES = 84;
