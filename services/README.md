# Live data: workouts (and Beli, by hand)

| file | what |
|------|------|
| `activity.mjs` | turns the workouts the iPhone Shortcut sends into `src/app/data/live/activity.json` |
| `beli.mjs` | our Beli client, parked: `--check` tells you if Beli's login opens up again |
| `lib.mjs` | shared helpers |

## Workouts

The activity block on `/beta` shows workouts and hours this year and this
week, the top three sports (hours of tennis, miles run, number of classes),
hours per week for 12 weeks coloured by sport, and the latest three workouts.
It reads `src/app/data/live/activity.json`. Only the day of each workout is
shown, never the time.

Everything comes from Apple Health, where the Apple Watch, Nike Run Club and
other apps save every workout. A Shortcut on the iPhone reads them and starts
the deploy workflow with them. The workflow passes them to `activity.mjs`,
keeps the result in the Actions cache, and rebuilds the site. It also rebuilds
daily on its own, so "this week" rolls over even without a new workout.

Until the Shortcut has sent workouts once, the block shows this week and the
latest runs from Strava's public widgets instead. Strava's API isn't used: since
June 2026 it needs a paid subscription, and its free widgets only list runs.

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

In the Shortcuts app, create a shortcut named **Send workouts to site**:

1. **Find Health Samples**: Type is **Workouts**. Add a filter, *Start Date is
   in the last 400 days*. Leave the limit off.
2. **Repeat with Each** item in *Health Samples*, and inside it:
   - **Format Date**: *Repeat Item → Start Date*, Date Format *Custom*,
     `yyyy-MM-dd`.
   - **Get Details of Health Sample**, three times, on *Repeat Item*: the
     sport (called *Name*, *Type* or *Workout Type* depending on your iOS
     version; pick the one that reads "Tennis" for a tennis session),
     *Duration*, and *Distance*.
   - **Text**: *Formatted Date* `|` *sport* `|` *Duration* `|` *Distance*
     (type the bars yourself; spaces around them are fine).
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
       - `workouts` (Text): *Combined Text*
       - `unit` (Text): `mi`

Run it once by hand. Then open the repo's Actions tab: a "Deploy Next.js site
to Pages" run should start, and its "Update workouts" step should say
something like `activity: 212 workouts sent (98 tennis, 60 run, 54 class)`. If
it says it couldn't read any workouts, the warning shows the start of what
arrived; that's all that's needed to adjust the parser.

The parser is forgiving: any `yyyy-mm-dd` date, the sport in words, a
duration as `85 min`, `1 hr 25 min`, `1:25:00`, `46:13` or plain seconds or
minutes, and a distance with `mi`, `km` or `m`. Durations under a minute and
lines without a date are skipped. Tennis, pickleball and other racquet sports
count as tennis; strength, HIIT, yoga, pilates, cardio and the
like count as classes.

If GitHub answers that the inputs are too large, change *the last 400 days*
to 200.

**If Shortcuts doesn't offer Workouts** as a type on your iOS version, the
*Health Exporter & Shortcuts* app adds an "Export Workouts" action that can
stand in for steps 1 and 2; its text output goes into step 3 the same way.

### 3. Make it automatic

iOS locks Health data while the phone is locked, so the Shortcut has to run
while it's unlocked. In Shortcuts → Automation → **+** → **App**, pick an app
you open every day (Messages, Instagram...), choose **Is Closed** and **Run
Immediately**, then pick *Send workouts to site*. The site updates a couple of
minutes later.

(*Apple Watch Workout → Ends* also works as a trigger, but when the phone is
locked in a pocket it finds nothing and sends nothing; harmless, just late.)

### Run it by hand

```sh
ACTIVITY="2026-11-20 | Tennis | 85 min |
2026-11-19 | Running | 46:13 | 2.6 mi" node services/activity.mjs
```

Workouts sent replace the stored ones in their date range; older ones are
kept for about two years.

## Beli (parked)

The Beli block reads `src/app/data/beli.json`, edited by hand from the app
(Restaurants → Been, sorted by score). It shows the leading run of ranks, up
to ten, so a missing rank cuts the list off there.

`beli.mjs` speaks the private API Beli's app uses, as documented by
[jcjc-dev/beli-mcp](https://github.com/jcjc-dev/beli-mcp) (MIT). As of
2026-11-20, Beli's login refused requests from outside its app (403), even for
malformed input. Using it is likely against Beli's terms anyway.
`node services/beli.mjs --check` shows whether that has changed.
