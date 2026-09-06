/**
 * The tour: what the camera looks at once the city has finished building, and
 * what gets written over it.
 *
 * The film hands over on the whole finished island and the reader takes the
 * wheel from there. Each stop is a framing plus a short blurb — no arrows, no
 * labels pinned to particular windows, just the city moving behind the words.
 *
 * A stop says how tall its subject is rather than how far to zoom, because the
 * framing that fits a 1,250 foot tower depends on the viewport. The engine
 * turns `ft` and `fill` into a span and a camera height, which is also what
 * keeps sea level below the bottom of the frame on the close stops: looking up
 * at a tower, you should see the tower, not the harbour.
 */
import { EXPERIENCE } from "../data/experience";
import { ABOUT, SOCIALS } from "../data/site";
import { clamp, glide } from "./util";

const dim = (text) => ({ text, dim: true });

/**
 * cx is where along the island to look (0 the Battery, 1 Inwood).
 * ft + fill frame a subject of that height at that share of the viewport;
 * a stop without them sits back and takes in the whole island.
 */
export const STOPS = [
  {
    cx: 0.44,
    subject: null,
    title: "Hi, I’m Brandon",
    lines: ABOUT.lead.map((text) => ({ text })),
  },
  {
    cx: 0.418,
    ft: 1250,
    fill: 0.82,
    subject: "Empire State Building, 1931",
    title: "Now",
    lines: ABOUT.bullets.map((b) => ({ text: `${b.emoji}  ${b.label}` })),
  },
  {
    cx: 0.352,
    ft: 700,
    fill: 0.74,
    subject: "Metropolitan Life Tower, 1909",
    title: "Watches",
    lines: [
      { text: ABOUT.watches.before.trim() },
      { text: ABOUT.watches.handle, link: true, href: ABOUT.watches.href },
    ],
  },
  {
    cx: 0.055,
    ft: 1368,
    fill: 0.8,
    subject: "One World Trade Center, 2014",
    title: "Where I’ve worked",
    lines: EXPERIENCE.flatMap((j) => [
      { text: `${j.role}, ${j.org}` },
      dim(`${j.start} — ${j.end}`),
    ]),
  },
  {
    cx: 0.44,
    subject: null,
    title: "Say hello",
    lines: [{ text: SOCIALS[0].label, link: true, href: SOCIALS[0].href }],
  },
];

/** of each stop's slice, the share spent travelling; the rest is dwell */
const TRAVEL = 0.46;

/**
 * Which stop the camera is on at tour progress q, how far it has travelled
 * toward it, and how far up each blurb has faded.
 *
 * The framings themselves are worked out by the engine, which is the only
 * place that knows the viewport.
 */
export function sampleTour(q) {
  const n = STOPS.length;
  const x = clamp(q, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const u = clamp(x - i, 0, 1);

  /* A blurb outlives its slice slightly, so it is still legible as the camera
     begins to pull away rather than blinking out on the first frame of it. */
  const alphas = STOPS.map((_, k) => {
    const rise = clamp((x - (k + TRAVEL * 0.66)) / (TRAVEL * 0.36), 0, 1);
    const fall = k === n - 1 ? 0 : clamp((x - (k + 1)) / (TRAVEL * 0.34), 0, 1);
    const ease = (t) => t * t * (3 - 2 * t);
    return ease(rise) * (1 - ease(fall));
  });

  return {
    index: i,
    from: Math.max(0, i - 1),
    move: i === 0 ? 1 : glide(clamp(u / TRAVEL, 0, 1)),
    alphas,
    subject: STOPS[i].subject,
  };
}
