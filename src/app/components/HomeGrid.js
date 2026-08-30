import Tile from "./Tile";
import { TILE_KINDS } from "./tiles";
import { TILES } from "../data/tiles";

/**
 * The bento grid. Not currently routed — `/` forwards to `/beta` for now.
 * To bring it back, render <HomeGrid /> from app/page.js.
 */
export default function HomeGrid() {
  return (
    <div className="page">
      <div className="bento">
        {TILES.map(({ id, kind, size, caption, href, arrow, ...props }) => {
          const Content = TILE_KINDS[kind] ?? TILE_KINDS.placeholder;
          return (
            <Tile
              key={id}
              size={size}
              caption={caption}
              href={href}
              arrow={arrow !== false}
              label={props.title}
              interactive={kind !== "hero"}
            >
              <Content {...props} href={href} />
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
