import Future from "./Future";
import Laptop from "./Laptop";
import Macintosh from "./Macintosh";
import Manuscript from "./Manuscript";
import Phone from "./Phone";
import Stone from "./Stone";
import Terminal from "./Terminal";
import Typewriter from "./Typewriter";

/** era id (data/eras.js) → renderer */
export const ERA_RENDERERS = {
  stone: Stone,
  manuscript: Manuscript,
  typewriter: Typewriter,
  terminal: Terminal,
  macintosh: Macintosh,
  laptop: Laptop,
  phone: Phone,
  future: Future,
};
