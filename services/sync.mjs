/**
 * Pulls Strava into src/app/data/live/strava.json, which /beta reads at
 * build time. The deploy workflow runs this before every build, including a
 * scheduled one every six hours, so the site keeps itself current.
 *
 * It never fails the build: a service with no secrets is skipped, and one
 * that errors keeps its last good file (restored from the Actions cache), so
 * an outage at Strava only means slightly older numbers.
 *
 * Beli isn't synced: its login refuses outside clients, so the Beli block
 * reads the hand-maintained src/app/data/beli.json instead. beli.mjs is kept
 * so `node services/beli.mjs --check` can tell when that changes.
 *
 *   node services/sync.mjs
 */
import { fileURLToPath } from "node:url";
import { fetchStrava } from "./strava.mjs";
import { readJson, warn, writeJson } from "./lib.mjs";

const out = (name) => fileURLToPath(new URL(`../src/app/data/live/${name}.json`, import.meta.url));
const env = process.env;

const jobs = [
  {
    name: "strava",
    ready: env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET && env.STRAVA_REFRESH_TOKEN,
    run: () =>
      fetchStrava({
        clientId: env.STRAVA_CLIENT_ID,
        clientSecret: env.STRAVA_CLIENT_SECRET,
        refreshToken: env.STRAVA_REFRESH_TOKEN,
      }),
    summary: (d) => `${d.week.count} activities this week, ${d.recent.length} recent`,
  },
];

for (const job of jobs) {
  const prev = await readJson(out(job.name));
  const kept = prev?.sample ? "the sample data" : `data from ${prev?.updated ?? "an earlier sync"}`;
  if (!job.ready) {
    console.log(`${job.name}: no secrets set, keeping ${kept}`);
    continue;
  }
  try {
    const data = await job.run();
    await writeJson(out(job.name), data);
    console.log(`${job.name}: synced (${job.summary(data)})`);
  } catch (e) {
    warn(`${job.name} sync failed, keeping ${kept}. ${e.message}`);
  }
}
