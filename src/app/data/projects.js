/**
 * Curated live side projects, shown in the kinetic tile wall at /projects
 * and teased from the main /beta block page.
 */
export const PROJECTS = [
  {
    id: "tidepool",
    name: "Tidepool",
    tagline: "Touch the water, scare the fish",
    eyebrow: "WebGPU · Simulation",
    description:
      "A tide pool in raw WebGPU and WGSL. Touch the water and the fish dart for cover. Scroll to turn the tide.",
    // switch both to tidepool.brandonlai.me once that subdomain points at the Vercel project
    href: "https://rockpool-tide.vercel.app",
    host: "rockpool-tide.vercel.app",
    image: "/beta/tidepool.jpg",
    alt: "Sunlit rocky tide pool with turquoise water, caustics, and sea creatures",
    accent: "#1FA971",
  },
  {
    id: "etabli",
    name: "Établi",
    tagline: "Service a pocket watch, part by part",
    eyebrow: "3D · Watchmaking",
    description:
      "Disassemble, clean, oil, and regulate a 17-jewel mechanical pocket-watch caliber (ETA 6497-1) right in the browser.",
    href: "https://etabli-orcin.vercel.app",
    host: "etabli-orcin.vercel.app",
    image: "/projects/etabli.jpg",
    alt: "Interactive 3D view of an ETA 6497-1 mechanical watch movement with brass gears and ruby jewels",
    accent: "#C9A24A",
  },
  {
    id: "isochron",
    name: "Isochron",
    tagline: "Hold your watch to the mic. Is it fast?",
    eyebrow: "WebAssembly · Audio DSP",
    description:
      "Acoustic mechanical watch timegrapher powered by FFTW3f in WebAssembly. Hold a watch to your mic to measure rate and beat error.",
    href: "https://isochron-eight.vercel.app",
    host: "isochron-eight.vercel.app",
    image: "/projects/isochron.jpg",
    alt: "Minimalist acoustic timegrapher interface with paper trace, escapement beat readout, and six-position log",
    accent: "#FF4D4F",
  },
  {
    id: "incognita",
    name: "Terra Incognita",
    tagline: "Sail with Magellan. See what he saw.",
    eyebrow: "3D Globe · History",
    description:
      "Ride along with historic expeditions on a 3D globe wrapped in fog. The fog lifts only where each crew could actually see.",
    href: "https://terra-incognita-map.vercel.app",
    host: "terra-incognita-map.vercel.app",
    image: "/projects/incognita.jpg",
    alt: "3D parchment globe shrouded in fog beside expedition cards for Columbus, Magellan, Cook, and Amundsen",
    accent: "#D99B43",
  },
  {
    id: "woolmeadow",
    name: "Woolmeadow",
    tagline: "Sheep on a floating island",
    eyebrow: "3D · Miniature",
    description:
      "A tiny floating 3D sheep meadow with a winding stream, wooden bridge, and grazing sheep — built in a single HTML file.",
    href: "https://woolmeadow.vercel.app",
    host: "woolmeadow.vercel.app",
    image: "/projects/woolmeadow.jpg",
    alt: "Floating 3D miniature island with green pasture, river waterfall, cherry trees, and small white sheep",
    accent: "#59B574",
  },
  {
    id: "bandits",
    name: "Bandits",
    tagline: "Dogfight strangers over pixel islands",
    eyebrow: "Multiplayer · Game",
    description:
      "Pixel-art .io dogfights over tropical islands: sprite-stack renderer paired with a live Cloudflare Durable Object arena.",
    href: "https://bandits-zeta.vercel.app",
    host: "bandits-zeta.vercel.app",
    image: "/projects/bandits.jpg",
    alt: "Top-down pixel-art archipelago with clouds and the Bandits dogfight lobby card",
    accent: "#FF7A45",
  },
  {
    id: "fold",
    name: "Fold",
    tagline: "Origami, one crease at a time",
    eyebrow: "3D · Craft",
    description:
      "Learn origami from one realistic sheet of paper that folds itself, one exact crease at a time. Scrub, orbit, and fold along.",
    href: "https://fold-origami-six.vercel.app",
    host: "fold-origami-six.vercel.app",
    image: "/projects/fold.jpg",
    alt: "Clean white origami canvas with a cream square sheet of paper and crisp Swiss typography",
    accent: "#3B82F6",
  },
  {
    id: "byhand",
    name: "byhand",
    tagline: "A note that types itself the way you did",
    eyebrow: "Playful Utility",
    description:
      "One short lock-screen note typed by hand for one person, replayed in your exact typing rhythm.",
    href: "https://byhand-beta.vercel.app",
    host: "byhand-beta.vercel.app",
    image: "/projects/byhand.jpg",
    alt: "Minimal white interface demonstrating a live keystroke-replayed lock screen note",
    accent: "#3B82F6",
  },
];
