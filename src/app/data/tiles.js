/**
 * The bento grid.
 *
 * Every entry becomes one block. Order here is the order on the page —
 * CSS grid packs them into a 4-column layout.
 *
 *   size    columns × height        good for
 *   ------  ---------------------   ---------------------------------
 *   sm      1 col, square           icon / photo / small link card
 *   tall    1 col, tall             vertical card, phone mock
 *   md      2 cols, short           wide preview, embed
 *   lg      2 cols, medium          project hero shot
 *   xl      2 cols, very tall       the manifesto / long-form block
 *   wide    4 cols, short           full-bleed banner
 *
 *   kind    which renderer runs (see components/tiles/*)
 *   caption "<b>🥡 Name</b> — one-line description" shown under the tile on hover
 *   href    makes the corner arrow link appear
 *   arrow   set false to suppress the corner arrow (e.g. the card has its own CTA)
 */

export const TILES = [
  {
    id: "hero",
    kind: "hero",
    size: "xl",
  },
  {
    id: "project-1",
    kind: "placeholder",
    size: "md",
    glyph: "💻",
    title: "Project One",
    note: "A wide block — good for a UI preview.",
    caption: "<b>💻 Project One</b> — one-line description of the project",
    href: "/work",
  },
  {
    id: "link-card",
    kind: "link-card",
    size: "sm",
    name: "Brandon Lai",
    handle: "@brandonlai",
    body: "building things • say hi",
    glyph: "𝕏",
    cta: "Read my posts",
    href: "https://x.com/",
    arrow: false, // the card has its own CTA button
  },
  {
    id: "project-2",
    kind: "placeholder",
    size: "tall",
    glyph: "📱",
    title: "Project Two",
    note: "A tall block — good for a phone mock.",
    caption: "<b>📱 Project Two</b> — one-line description of the project",
    href: "/work",
  },
  {
    id: "stat",
    kind: "stat",
    size: "sm",
    eyebrow: "Currently",
    stat: "Open",
    sub: "to interesting problems",
  },
  {
    id: "project-3",
    kind: "placeholder",
    size: "lg",
    glyph: "🎛",
    title: "Project Three",
    note: "A medium block — good for a project hero shot.",
    caption: "<b>🎛 Project Three</b> — one-line description of the project",
    href: "/work",
  },
  {
    id: "photos",
    kind: "placeholder",
    size: "sm",
    glyph: "📷",
    title: "Photos",
    note: "Drop a photo grid in here.",
    caption: "<b>📷 Photos</b> — things I pointed a camera at",
  },
  {
    id: "project-4",
    kind: "placeholder",
    size: "sm",
    glyph: "🌈",
    title: "Experiment",
    note: "A small square block.",
    caption: "<b>🌈 Experiment</b> — one-line description",
    href: "/work",
  },
  {
    id: "project-5",
    kind: "placeholder",
    size: "md",
    glyph: "📅",
    title: "Project Five",
    note: "Another wide block.",
    caption: "<b>📅 Project Five</b> — one-line description of the project",
    href: "/work",
  },
  {
    id: "project-6",
    kind: "placeholder",
    size: "sm",
    glyph: "🪄",
    title: "Project Six",
    note: "A small square block.",
    caption: "<b>🪄 Project Six</b> — one-line description",
    href: "/work",
  },
  {
    id: "project-7",
    kind: "placeholder",
    size: "sm",
    glyph: "🏗",
    title: "Project Seven",
    note: "A small square block.",
    caption: "<b>🏗 Project Seven</b> — one-line description",
    href: "/work",
  },
  {
    id: "banner",
    kind: "placeholder",
    size: "wide",
    glyph: "✨",
    title: "Full-width banner",
    note: "Spans all four columns — good for a closing statement or a call to action.",
  },
];
