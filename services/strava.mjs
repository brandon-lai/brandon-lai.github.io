/**
 * Strava, through its official API (https://developers.strava.com).
 *
 *   fetchStrava({ clientId, clientSecret, refreshToken }) → the panel's data
 *     (see ../src/app/data/live/strava.json)
 *
 * Only activities whose visibility is "Everyone" are shown, and route shapes
 * are trimmed at both ends and drawn without a map (see routePath).
 * Get the three credentials once with: node services/strava-auth.mjs
 */
import { routePath, warn } from "./lib.mjs";

const API = "https://www.strava.com/api/v3";

export class StravaError extends Error {
  constructor(step, status, body) {
    super(`Strava ${step} → ${status}${body ? `: ${body.slice(0, 160)}` : ""}`);
    this.status = status;
  }
}

async function get(step, path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new StravaError(step, res.status, text);
  return JSON.parse(text);
}

export async function accessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new StravaError("token", res.status, text);
  const tok = JSON.parse(text);
  if (tok.refresh_token && tok.refresh_token !== refreshToken) {
    warn("Strava issued a new refresh token. Run `node services/strava-auth.mjs` again so the STRAVA_REFRESH_TOKEN secret stays current.");
  }
  return tok.access_token;
}

const totals = (t) => ({ count: t?.count ?? 0, distance: Math.round(t?.distance ?? 0), movingTime: t?.moving_time ?? 0 });

export async function fetchStrava(creds) {
  const token = await accessToken(creds);
  const athlete = await get("athlete", "/athlete", token);
  const stats = await get("stats", `/athletes/${athlete.id}/stats`, token);
  const after = Math.floor(Date.now() / 1000) - 45 * 86400;
  const acts = await get("activities", `/athlete/activities?per_page=60&after=${after}`, token);

  const shown = acts
    .filter((a) => !a.private && (a.visibility ?? "everyone") === "everyone")
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  const weekAgo = Date.now() - 7 * 86400000;
  const week = shown.filter((a) => Date.parse(a.start_date) >= weekAgo);

  return {
    schema: 1,
    sample: false,
    source: "strava",
    updated: new Date().toISOString(),
    units: athlete.measurement_preference === "meters" ? "metric" : "imperial",
    week: {
      count: week.length,
      distance: Math.round(week.reduce((s, a) => s + (a.distance ?? 0), 0)),
      movingTime: week.reduce((s, a) => s + (a.moving_time ?? 0), 0),
    },
    ytd: { run: totals(stats.ytd_run_totals), ride: totals(stats.ytd_ride_totals) },
    recent: shown.slice(0, 5).map((a) => ({
      id: a.id,
      name: a.name,
      sport: a.sport_type ?? a.type,
      date: a.start_date_local,
      distance: Math.round(a.distance ?? 0),
      movingTime: a.moving_time ?? 0,
      elevation: Math.round(a.total_elevation_gain ?? 0),
      route: routePath(a.map?.summary_polyline),
    })),
  };
}

/* ---- `node services/strava.mjs --check` (reads the three STRAVA_* env vars) ---- */
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("--check")) {
  try {
    const d = await fetchStrava({
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      refreshToken: process.env.STRAVA_REFRESH_TOKEN,
    });
    console.log(`Strava works: ${d.week.count} public activities in the last 7 days, latest "${d.recent[0]?.name ?? "none"}".`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
