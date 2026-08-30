import Hero from "./Hero";
import LinkCard from "./LinkCard";
import Placeholder from "./Placeholder";
import Stat from "./Stat";

/** kind (in data/tiles.js) → renderer */
export const TILE_KINDS = {
  hero: Hero,
  "link-card": LinkCard,
  stat: Stat,
  placeholder: Placeholder,
};

export { Hero, LinkCard, Stat, Placeholder };
