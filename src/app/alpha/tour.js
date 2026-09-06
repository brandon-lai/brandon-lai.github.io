/**
 * The tour: what the camera looks at once the city has finished building, and
 * what gets written on it.
 *
 * The film hands over on the full 2026 skyline and then the reader takes the
 * wheel. Each stop is a framing plus a note in the same hand that introduces
 * him, so the copy never leaves the island — there is no second surface to cut
 * to, which is the whole point.
 *
 * Anchors are island coordinates (x runs 0 at the Battery to 1 at Inwood, ft is
 * height above the water), matching the buildings in city.js. Where a pairing
 * can be earned it is: the watches point at a clock tower, the running at the
 * park the marathon finishes in, and the two jobs whose years the city happens
 * to share point at towers topped out those same years.
 */
import { EXPERIENCE } from "../data/experience";
import { ABOUT } from "../data/site";
import { clamp, glide, lerp } from "./util";

/** places on the island worth pointing at */
const AT = {
  esbWindow: { x: 0.4018, ft: 690 },
  esb: { x: 0.4, ft: 1180 },
  hudsonYards: { x: 0.362, ft: 1210 },
  centralParkE: { x: 0.6, ft: 60 },
  centralParkW: { x: 0.695, ft: 52 },
  metLifeClock: { x: 0.348, ft: 640 },
  littleItaly: { x: 0.118, ft: 110 },
  chryslerCrown: { x: 0.433, ft: 990 },
  rockefeller: { x: 0.468, ft: 810 },
  seagram: { x: 0.452, ft: 500 },
  w111: { x: 0.539, ft: 1370 },
};

const byOrgYear = (org, start) => EXPERIENCE.find((j) => j.org === org && j.start === start);
const yearOf = (s = "") => Number(s.match(/\d{4}/)?.[0]) || null;

const [bSoftware, bTennis, bRun, bTiramisu, bRest] = ABOUT.bullets;

/** a job note: the role, and the years it ran */
function role(j) {
  return {
    text: `${j.role}, ${j.org}`,
    sub: `${j.start} — ${j.end}`,
    year: yearOf(j.start),
  };
}

const linkedInNow = byOrgYear("LinkedIn", "Sep 2022");
const hearth = byOrgYear("Hearth", "May 2022");
const eightVC = byOrgYear("8VC", "May 2022");
const linkedInIntern = byOrgYear("LinkedIn", "May 2021");
const smoodi = byOrgYear("smoodi", "Jun 2019");

/**
 * cx / span frame the shot; cyFt is what sits at the centre of the screen.
 * span is a fraction of the island, so smaller is closer.
 */
export const STOPS = [
  // the finished city, and the reason any of this is here
  {
    span: 1.0,
    cx: 0.44,
    cyFt: 520,
    year: 2026,
    lines: ABOUT.lead,
  },
  {
    span: 0.30,
    cx: 0.402,
    cyFt: 760,
    year: 2026,
    notes: [{ at: AT.esbWindow, text: "Hi, I’m Brandon", lit: true }],
  },
  {
    span: 0.30,
    cx: 0.368,
    cyFt: 1180,
    year: 2026,
    notes: [{ at: AT.hudsonYards, text: bSoftware.label }],
  },
  {
    span: 0.34,
    cx: 0.648,
    cyFt: 300,
    year: 2026,
    notes: [
      { at: AT.centralParkE, text: bTennis.label },
      { at: AT.centralParkW, text: bRun.label, below: true },
    ],
  },
  {
    span: 0.26,
    cx: 0.348,
    cyFt: 640,
    year: 1909,
    notes: [{ at: AT.metLifeClock, text: ABOUT.watches.short }],
  },
  {
    span: 0.28,
    cx: 0.125,
    cyFt: 240,
    year: 2026,
    notes: [{ at: AT.littleItaly, text: bTiramisu.label }],
  },
  {
    span: 0.28,
    cx: 0.436,
    cyFt: 980,
    year: 2026,
    notes: [{ at: AT.chryslerCrown, text: bRest.label }],
  },

  // the work, walked backwards, the way the list is written
  {
    span: 0.30,
    cx: 0.404,
    cyFt: 1080,
    year: yearOf(linkedInNow.start),
    notes: [{ at: AT.esb, ...role(linkedInNow) }],
  },
  {
    span: 0.30,
    cx: 0.47,
    cyFt: 780,
    year: yearOf(hearth.start),
    notes: [{ at: AT.rockefeller, ...role(hearth) }],
  },
  {
    span: 0.30,
    cx: 0.454,
    cyFt: 500,
    year: yearOf(eightVC.start),
    notes: [{ at: AT.seagram, ...role(eightVC) }],
  },
  {
    span: 0.30,
    cx: 0.542,
    cyFt: 1290,
    year: yearOf(linkedInIntern.start),
    notes: [{ at: AT.w111, ...role(linkedInIntern) }],
  },
  {
    span: 0.30,
    cx: 0.366,
    cyFt: 1150,
    year: yearOf(smoodi.start),
    notes: [{ at: AT.hudsonYards, ...role(smoodi) }],
  },

  // back out to the whole island to say goodbye
  {
    span: 1.0,
    cx: 0.44,
    cyFt: 520,
    year: 2026,
    lines: ["Say hello."],
    link: true,
  },
];

/** of each stop's slice, the share spent travelling; the rest is dwell */
const TRAVEL = 0.44;

/**
 * Where the camera is at tour progress q, and how far up each note has faded.
 *
 * Every stop owns an equal slice. The first part of a slice moves from the
 * previous framing to this one, eased so the middle of the move runs flat, and
 * the rest of it holds still so there is time to read.
 */
export function sampleTour(q) {
  const n = STOPS.length;
  const x = clamp(q, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const u = clamp(x - i, 0, 1);

  const stop = STOPS[i];
  const prev = STOPS[i - 1] || stop;
  const move = i === 0 ? 1 : glide(clamp(u / TRAVEL, 0, 1));

  const cam = {
    cx: lerp(prev.cx, stop.cx, move),
    span: lerp(prev.span, stop.span, move),
    cyFt: lerp(prev.cyFt, stop.cyFt, move),
  };

  /* A note belongs to its stop but outlives its slice slightly, so it is still
     legible as the camera starts to pull away rather than blinking out. */
  const alphas = STOPS.map((_, k) => {
    const inAt = k + TRAVEL * 0.72;
    const inTo = k + TRAVEL * 1.02;
    const outAt = k + 1;
    const outTo = k + 1 + TRAVEL * 0.3;
    const rise = clamp((x - inAt) / (inTo - inAt), 0, 1);
    const fall = k === n - 1 ? 0 : clamp((x - outAt) / (outTo - outAt), 0, 1);
    return rise * rise * (3 - 2 * rise) * (1 - fall * fall * (3 - 2 * fall));
  });

  return { cam, index: i, alphas, year: stop.year };
}
