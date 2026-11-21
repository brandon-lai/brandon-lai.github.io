# Live data: Beli + Strava

The Strava and Beli blocks on `/beta` read `src/app/data/live/*.json`. The
deploy workflow runs `node services/sync.mjs` before every build, and it
rebuilds on its own every six hours, so the site stays current with nothing
to do by hand.

| file | what |
|------|------|
| `sync.mjs` | runs both services and writes the JSON; never fails the build |
| `strava.mjs` | official Strava API: last 7 days, year-to-date, recent public activities |
| `beli.mjs` | our Beli client: your ranked lists and want-to-try |
| `strava-auth.mjs` | one-time Strava connection that stores the repo secrets |
| `lib.mjs` | shared helpers (polyline decoding, route shapes, prompts) |

Until a service has synced, its block shows the committed sample data with a
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

## Connect Beli

Beli has no public API. `beli.mjs` speaks the private API its app uses, as
documented by [jcjc-dev/beli-mcp](https://github.com/jcjc-dev/beli-mcp) (MIT),
and only ever reads your own lists. Because it is unofficial, Beli can change
it at any time, and using it is likely against their terms.

1. Check it works with your account (it asks for the password, hidden):
   `node services/beli.mjs --check`
2. If it does, add `BELI_PHONE` (e.g. `+15551234567`) and `BELI_PASSWORD` as
   repository secrets under Settings → Secrets and variables → Actions.

As of 2026-11-20, Beli's login refused requests from outside its app (403)
even for malformed input. If `--check` shows a 403, the automatic sync can't
log in, and the block keeps showing whatever `beli.json` holds.

## Run it by hand

`node services/sync.mjs` with the secrets above set as environment variables
writes fresh JSON locally. To rebuild the live site right away, run the
"Deploy Next.js site to Pages" workflow from the Actions tab.
