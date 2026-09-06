/**
 * Site-wide content. Edit this file to change the wordmark, nav and socials.
 */

export const SITE = {
  name: "Brandon Lai",
  title: "Brandon Lai",
  description: "Brandon Lai — personal site.",
  url: "https://brandon-lai.github.io",
};

/**
 * Top-centre pill nav. `dot: true` puts a small red "new" dot on an item.
 * `disabled: true` greys the item out and pops a bubble instead of navigating —
 * drop the flag to switch a page back on.
 */
export const NAV = [
  { label: "Home", href: "/", disabled: true },
  { label: "About", href: "/about", disabled: true },
  { label: "Work", href: "/work", dot: true, disabled: true },
  { label: "Contact", href: "/contact", disabled: true },
  { label: "Alpha", href: "/alpha" },
  { label: "Beta", href: "/beta" },
];

/**
 * Routes that hide the pill nav entirely — for pages that want the whole
 * viewport to themselves. Empty the list to switch it back on everywhere.
 */
export const NAV_HIDDEN_ON = ["/alpha"];

/** Shown, in order, when someone knocks on a door that isn't open yet. */
export const NAV_LOCKED_LINES = [
  "Not ready yet.",
  "Still building this one.",
  "Come back later.",
  "This one's in the oven.",
  "Soon. Probably.",
];

/** Top-right icon links. `icon` maps to a key in components/Icons.js */
export const SOCIALS = [
  { icon: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/brandon-lai" },
];

/**
 * Hero copy. `heading` is rendered as spans so you can emphasise / link parts.
 *   { text }                       → muted
 *   { text, em: true }             → full-contrast
 *   { text, href: "…" }            → underlined link
 */
export const HERO = {
  heading: [
    { text: "Brandon", em: true },
    { text: " is building " },
    { text: "something new", href: "#" },
    { text: "." },
  ],
  // TODO: replace with your own lines.
  lines: [
    "i build things.",
    "i like the small details most people scroll past.",
    "i think the things we choose not to build matter as much as the things we do.",
    "this site is a work in progress — like everything else worth making.",
  ],
  footnote: { star: "*", text: "A placeholder. Swap this out any time." },
};

/** About-page content, also mirrored onto the laptop screen in /beta. */
export const ABOUT = {
  bullets: [
    { emoji: "\u{1F4BB}", label: "Software engineer" },
    { emoji: "\u{1F3BE}", label: "Tennis player" },
    { emoji: "\u{1F3C3}", label: "Marathoner, ex-rower" },
    { emoji: "\u{1F370}", label: "Tiramisu World Cup competitor, Canada semi-finalist" },
    { emoji: "\u{1F3B8}", label: "Beginner guitarist, scuba diver, snowboarder" },
  ],
  watches: {
    before:
      "I collect watches, mostly vintage. There's something worth admiring in a few hundred tiny parts that agree to keep time for fifty years without a battery, built by people who assumed someone would still be repairing them long after they were gone. I post them at ",
    short: "I collect watches and talk about them",
    handle: "@watcheswbrandon",
    href: "https://instagram.com/watcheswbrandon",
    after: ".",
  },
};
