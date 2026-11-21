# Live data: Strava (and Beli, by hand)

The Strava block on `/beta` reads `src/app/data/live/strava.json`. The deploy
workflow runs `node services/sync.mjs` before every build, and it rebuilds on
its own every six hours, so once Strava is connected it stays current.

The Beli block reads `src/app/data/beli.json`, which is edited by hand from
the app (Restaurants → Been, sorted by score). It shows the leading run of
ranks, up to ten, so a missing rank cuts the list off there.

| file | what |
|------|------|
| `sync.mjs` | runs both services and writes the JSON; never fails the build |
| `strava.mjs` | official Strava API: last 7 days, year-to-date, recent public activities |
| `beli.mjs` | our Beli client, parked: `--check` tells you if Beli's login opens up again |
| `strava-auth.mjs` | one-time Strava connection that stores the repo secrets |
| `lib.mjs` | shared helpers (polyline decoding, route shapes, prompts) |

Until Strava has synced, its block shows the committed sample data with a
"Sample data" tag.

## Connect Strava (once)

1. Create an API application at <https://www.strava.com/settings/api>. Use any
   name and website, and set **Authorization Callback Domain** to `localhost`.
2. From the repo root, with the GitHub CLI logged in:
   `node services/strava-auth.mjs <client_id> <client_secret>`
3. Approve in the browser. The script saves `STRAVA_CLIENT_ID`,
   `STRAVA_CLIENT_SECRET` and `STRAVA_REFRESH_TOKEN` as repo secrets.

Only activities set to **Everyone** are shown. Routes are drawn as a bare
shape, with no map, and the first and last 450 m are cut off so nothing points
at where a run starts.

## Beli (parked)

Beli has no public API. `beli.mjs` speaks the private API its app uses, as
documented by [jcjc-dev/beli-mcp](https://github.com/jcjc-dev/beli-mcp) (MIT),
and only ever reads your own lists. Because it is unofficial, Beli can change
it at any time, and using it is likely against their terms.

1. Check it works with your account (it asks for the password, hidden):
   `node services/beli.mjs --check`
2. If it does, wire `fetchBeli` back into `sync.mjs` (it was removed while
   the login refused outside clients) and add `BELI_PHONE` and `BELI_PASSWORD`
   as repository secrets.

As of 2026-11-20, Beli's login refused requests from outside its app (403)
even for malformed input, so the block uses the hand-maintained list.

## Run it by hand

`node services/sync.mjs` with the secrets above set as environment variables
writes fresh JSON locally. To rebuild the live site right away, run the
"Deploy Next.js site to Pages" workflow from the Actions tab.
