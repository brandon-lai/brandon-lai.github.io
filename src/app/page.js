import Tile from "./components/Tile";
import { TILE_KINDS } from "./components/tiles";
import { TILES } from "./data/tiles";

export default function Home() {
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
