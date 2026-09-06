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
    title: "Say hello",
    ax: 0.65,
    ay: 0.22,
    lines: [{ text: SOCIALS[0].label, link: true, href: SOCIALS[0].href }],
  },
];

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

  const alphas = [];
  const written = [];
  for (let k = 0; k < n; k++) {
    /* Both start once the previous blurb has cleared, and the writing finishes
       exactly as the camera arrives. That last part matters: the reveal is
       driven by scroll position, so anywhere the reader can come to rest has
       to be somewhere the writing is already finished. Running it into the
       dwell instead left a half-written blurb on screen whenever someone
       stopped mid-stop. */
    const from = k + TRAVEL * 0.36;
    const rise = clamp((x - from) / (TRAVEL * 0.3), 0, 1);
    const fall = k === n - 1 ? 0 : clamp((x - (k + 1)) / (TRAVEL * 0.34), 0, 1);
    alphas.push(ease(rise) * (1 - ease(fall)));
    written.push(clamp((x - from) / (TRAVEL * 0.64), 0, 1));
  }

  return {
    index: i,
    from: Math.max(0, i - 1),
    move: i === 0 ? 1 : glide(clamp(u / TRAVEL, 0, 1)),
    alphas,
    written,
    // the greeting holds through the first stop and leaves with the camera
    greet: 1 - ease(clamp((x - 1) / (TRAVEL * 0.7), 0, 1)),
    subject: STOPS[i].subject,
  };
}
