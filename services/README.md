# Live data: running mileage (and Beli, by hand)

| file | what |
|------|------|
| `running.mjs` | turns the mileage the iPhone Shortcut sends into `src/app/data/live/running.json` |
| `beli.mjs` | our Beli client, parked: `--check` tells you if Beli's login opens up again |
| `lib.mjs` | shared helpers |

## Running

The Running block on `/beta` shows miles this year, runs this year, miles this
week, and a 12-week bar chart. It reads `src/app/data/live/running.json`.

Runs are recorded in Nike Run Club, which saves them to Apple Health. A
Shortcut on the iPhone reads the daily running distance from Health and
starts the deploy workflow with it. The workflow passes it to `running.mjs`,
keeps the result in the Actions cache, and rebuilds the site. It also rebuilds
daily on its own, so "this week" rolls over even without a new run.

Strava isn't used: since June 2026 its API needs a paid subscription.

Until the Shortcut has run once, the block shows committed sample data with a
"Sample data" tag.

### 1. Make a GitHub token (once)

At <https://github.com/settings/personal-access-tokens/new>, create a
fine-grained token:

- **Repository access:** Only select repositories → `brandon-lai.github.io`
- **Permissions → Repository → Actions:** Read and write (nothing else)
- **Expiration:** the longest you're comfortable with. When it expires, the
  block simply stops updating until you swap in a new token.

That permission lets the token start workflows on this one repository. It
can't read or change any code.

### 2. Build the Shortcut

In the Shortcuts app, create a shortcut named **Send runs to site**:

1. **Find Health Samples**: Type is *Walking + Running Distance*. Add a filter,
   *Source is Nike Run Club*, and another, *Start Date is in the last 400
   days*. Set *Group By* to **Day** and the unit to **mi**.
2. **Repeat with Each** item in *Health Samples*:
   - **Format Date**: *Repeat Item → Start Date*, Date Format *Custom*,
     `yyyy-MM-dd`.
   - **Text**: *Formatted Date*, a space, then *Repeat Item → Value*.
3. **Combine Text**: *Repeat Results*, with *New Lines*.
4. **Get Contents of URL**:
   - URL: `https://api.github.com/repos/brandon-lai/brandon-lai.github.io/actions/workflows/nextjs.yml/dispatches`
   - Method **POST**.
   - Headers:
     - `Authorization`: `Bearer <your token>`
     - `Accept`: `application/vnd.github+json`
   - Request Body **JSON**, with two fields:
     - `ref` (Text): `main`
     - `inputs` (Dictionary), containing:
       - `runs` (Text): *Combined Text*
       - `unit` (Text): `mi`

Run it once by hand. Then open the repo's Actions tab: a "Deploy Next.js site
to Pages" run should start, and its "Update running mileage" step should say
something like `running: 142 days, 985.3 mi sent`. If it says it couldn't find
any pairs, the warning shows the start of what arrived.

### 3. Make it automatic

In Shortcuts → Automation → **+** → **App** → *Nike Run Club*, choose **Is
Closed** and **Run Immediately**, then pick *Send runs to site*. The site
updates a couple of minutes after each run, once you close the app.

Use the app trigger rather than a time of day: Health data can't be read while
the phone is locked, so a night-time automation would find nothing.

### Run it by hand

```sh
RUN_DAYS="2026-11-19 6.2
2026-11-17 3.1" node services/running.mjs
```

The parser takes every `yyyy-mm-dd <number>` pair it can find, whatever is
between them, and accepts a decimal comma. Days sent replace the stored days
in that date range; older days are kept.

## Beli (parked)

The Beli block reads `src/app/data/beli.json`, edited by hand from the app
(Restaurants → Been, sorted by score). It shows the leading run of ranks, up
to ten, so a missing rank cuts the list off there.

`beli.mjs` speaks the private API Beli's app uses, as documented by
[jcjc-dev/beli-mcp](https://github.com/jcjc-dev/beli-mcp) (MIT). As of
2026-11-20, Beli's login refused requests from outside its app (403), even for
malformed input. Using it is likely against Beli's terms anyway.
`node services/beli.mjs --check` shows whether that has changed.
