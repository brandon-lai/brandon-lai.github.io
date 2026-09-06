/**
 * The tour: where the camera looks once the city has finished building, and
 * what gets written over it.
 *
 * The timelapse ends by pushing in on the Empire State and pointing at one lit
 * window — that arrow is the last frame of the film and the first of the tour.
 * From there the reader takes the wheel and the camera moves along the island,
 * a blurb writing itself out at each stop as it arrives.
 *
 * A stop says how tall its subject is rather than how far to zoom, because the
 * framing that fits a 1,250 foot tower depends on the viewport. `bias` slides
 * the subject off centre so the words have somewhere to sit, and `ax`/`ay` put
 * them there — in a different corner each time, so the page never settles into
 * one caption position.
 */
import { EXPERIENCE } from "../data/experience";
import { ABOUT, SOCIALS } from "../data/site";
import { clamp, glide } from "./util";

/** the window the arrow points at, and the tower it is in */
export const GREETING = { x: 0.4018, ft: 690 };

const dim = (text) => ({ text, dim: true });

export const STOPS = [
  {
    // the framing the film ends on, held while the opening lines are written
    x: GREETING.x,
    ft: 1250,
    fill: 0.78,
    subject: "Empire State Building, 1931",
    // lined up under where the arrow writes his name
    ax: 0.6,
    ay: 0.5,
    /* Written across the whole stretch the soundtrack carries, rather than
       the 157px a camera move would take: these are the first words anyone
       reads and they were going by in half a second. */
    writeSpan: 0.64,
    lines: ABOUT.lead.map((text) => ({ text })),
  },
  {
    x: 0.433,
    ft: 1046,
    fill: 0.76,
    bias: 0.2,
    subject: "Chrysler Building, 1930",
    title: "About me",
    // clear of the supertalls, and low enough to miss the moon
    ax: 0.6,
    ay: 0.22,
    lines: ABOUT.bullets.map((b) => ({ text: `${b.emoji}  ${b.label}` })),
  },
  {
    x: 0.348,
    ft: 700,
    fill: 0.72,
    bias: -0.22,
    subject: "Metropolitan Life Tower, 1909",
    title: "Watches",
    ax: 0.06,
    ay: 0.24,
    lines: [
      { text: ABOUT.watches.before.trim() },
      { text: ABOUT.watches.handle, link: true, href: ABOUT.watches.href },
    ],
  },
  {
    x: 0.042,
    ft: 1368,
    fill: 0.78,
    bias: 0.2,
    subject: "One World Trade Center, 2014",
    title: "Where I’ve worked",
    ax: 0.5,
    ay: 0.16,
    lines: EXPERIENCE.flatMap((j) => [
      { text: `${j.role}, ${j.org}` },
      dim(`${j.start} — ${j.end}`),
    ]),
  },
  {
    x: 0.44,
    subject: null,
    title: "Reach out to me!",
    // clear of the column the button used to reach down into
    ax: 0.67,
    ay: 0.22,
    lines: [],
    button: { label: SOCIALS[0].label, href: SOCIALS[0].href },
  },
];

/* How many characters each stop has to write, which is what sets how long it
   should take. Counted once here rather than every frame. */
for (const stop of STOPS) {
  stop.chars = (stop.title ? stop.title.length : 0)
    + stop.lines.reduce((n, l) => n + l.text.length, 0);
}

/** of each stop's slice, the share spent travelling; the rest is dwell */
const TRAVEL = 0.44;
const ease = (t) => t * t * (3 - 2 * t);

/**
 * Which stop the camera is on at tour progress q, how far it has travelled
 * toward it, how far up each blurb has faded, and how much of each has been
 * written. The framings themselves are worked out by the engine, which is the
 * only place that knows the viewport.
 */
export function sampleTour(q) {
  const n = STOPS.length;
  const x = clamp(q, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const u = clamp(x - i, 0, 1);

  const rise = [];
  const fall = [];
  const written = [];
  for (let k = 0; k < n; k++) {
    /* Both start once the previous blurb has cleared, and the writing finishes
       exactly as the camera arrives. That last part matters: the reveal is
       driven by scroll, and the engine raises both on a clock as well, so
       that stopping anywhere still ends with the blurb up and finished.
       Rise and fall are handed over separately for exactly that: only the
       rise may be hurried along, the fall belongs to the camera. */
    const from = k + TRAVEL * 0.36;
    rise.push(ease(clamp((x - from) / (TRAVEL * 0.3), 0, 1)));
    fall.push(k === n - 1 ? 0 : ease(clamp((x - (k + 1)) / (TRAVEL * 0.34), 0, 1)));
    written.push(clamp((x - from) / (STOPS[k].writeSpan || TRAVEL * 0.64), 0, 1));
  }

  return {
    index: i,
    from: Math.max(0, i - 1),
    move: i === 0 ? 1 : glide(clamp(u / TRAVEL, 0, 1)),
    rise,
    fall,
    written,
    // the greeting holds through the first stop and leaves with the camera
    greet: 1 - ease(clamp((x - 1) / (TRAVEL * 0.7), 0, 1)),
    subject: STOPS[i].subject,
  };
}
