# brandon-lai.github.io

Personal site — a bento-grid portfolio built with Next.js (App Router), statically
exported and deployed to GitHub Pages by `.github/workflows/nextjs.yml`.

```bash
npm run dev     # local dev at http://localhost:3000
npm run build   # static export → ./out (what the Pages workflow uploads)
```

## Where the content lives

Everything you'll routinely edit is in `src/app/data/`:

| File | What it controls |
| --- | --- |
| `data/site.js` | Wordmark, nav items, social icon links, hero heading + manifesto lines |
| `data/tiles.js` | The bento grid on the home page — one entry per block |
| `data/experience.js` | The work history on `/work`, newest first |
| `data/eras.js` | The eight points on the `/beta` modernity scale |

Nothing else needs to change to fill the site in.

## Adding a block

Append an entry to `TILES` in `src/app/data/tiles.js`:

```js
{
  id: "my-project",
  kind: "placeholder",          // which renderer draws the inside
  size: "md",                   // how much grid it occupies
  glyph: "🛠",
  title: "My Project",
  note: "Short blurb.",
  caption: "<b>🛠 My Project</b> — shown in the gutter on hover",
  href: "/work",                // adds the corner arrow link
  // arrow: false,              // ...unless you suppress it
}
```

**Sizes** (`size`) — the grid is 4 columns on desktop, 2 on tablet, 1 on phone:

| size | shape | good for |
| --- | --- | --- |
| `xs` | 1 col, short | stat chip |
| `sm` | 1 col, square | icon, photo, small link card |
| `tall` | 1 col, tall | vertical card, phone mock |
| `md` | 2 cols, short | wide preview, embed |
| `lg` | 2 cols, medium | project hero shot |
| `xl` | 2 cols, very tall | the manifesto block |
| `wide` | 4 cols, short | full-bleed banner |

The grid uses `grid-auto-flow: dense`, so blocks backfill gaps automatically —
reordering the array is the fastest way to re-compose the page.

**Kinds** (`kind`) map to renderers in `src/app/components/tiles/`:
`hero`, `link-card`, `stat`, `placeholder`. To add your own, drop a component in
that folder and register it in `components/tiles/index.js`.

## Structure

```
src/app/
  layout.js              root shell — fonts, Nav
  page.js                home — renders the bento grid from data/tiles.js
  about|work|contact/    content pages (work renders data/experience.js)
  beta/                  "Beta" — one work history, eight eras
    Lab.js               stage, scroll-through-time, fit-to-height scaling
    EraSlider.js         the modernity scale (a real <input type="range">)
    eras/                one renderer per era; register new ones in eras/index.js
    lab.css              all era styling, scoped to this route
  globals.css            design tokens + every class used above
  components/
    Nav.js               floating pill nav with the sliding indicator
    TopBar.js            wordmark + social icons (not rendered — drop
                         <TopBar /> into layout.js to bring it back)
    Tile.js              block shell: surface, hover caption, corner arrow
    Icons.js             inline SVG icons
    tiles/               block renderers
  data/                  ← edit these
```

Design tokens (colour, radius, grid geometry, easing) are the `:root` custom
properties at the top of `globals.css`. Light and dark palettes are both defined
there; dark follows the OS setting.

> `components/Letter.js` and `components/LinkedInLogo.js` are left over from the
> previous three.js homepage and are no longer imported. Delete them (and the
> `three` / `@react-three/*` dependencies) once you're sure you don't want them.
