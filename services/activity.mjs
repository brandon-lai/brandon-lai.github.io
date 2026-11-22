/**
 * Workouts for /beta, sent by an iPhone Shortcut from Apple Health.
 *
 * Every workout the Apple Watch, Nike Run Club or any other app saves to
 * Health (tennis, classes, runs, walks...) reaches the Shortcut, which starts
 * the deploy workflow with them as the `workouts` input (see README.md). The
 * workflow hands that text to this script, which writes
 * src/app/data/live/activity.json:
 *
 *   ACTIVITY="2026-11-20 | Tennis | 85 min |
 *   2026-11-19 | Running | 0:46:13 | 2.6 mi" node services/activity.mjs
 *
 * One workout per line: date, type, duration, distance (optional), separated
 * by "|", tabs or commas. Shortcuts formats these differently across iOS
 * versions, so the parser is forgiving: any yyyy-mm-dd date, a type in words,
 * a duration as "85 min", "1 hr 25 min", "1:25:00", "46:13" or plain seconds
 * or minutes, and a distance with mi, km or m (else ACTIVITY_UNIT, default
 * mi). Lines it can't read are skipped. Workouts sent replace the stored ones
 * in their date range; older ones are kept. With nothing usable it changes
 * nothing and exits 0, so a build never fails here.
 */
import { fileURLToPath } from "node:url";
import { readJson, warn, writeJson } from "./lib.mjs";

const OUT = process.env.ACTIVITY_OUT || fileURLToPath(new URL("../src/app/data/live/activity.json", import.meta.url));
const KM_PER_MI = 1.609344;
const KEEP_DAYS = 800;

/** Health's workout names, grouped the way the tile talks about them */
const GROUPS = [
  ["tennis", /tennis|pickleball|padel|squash|badminton|racquet|table tennis/i],
  ["run", /run/i],
  ["ride", /cycl|bik|ride|spin/i],
  ["swim", /swim/i],
  ["walk", /walk|hik/i],
  ["class", /strength|hiit|interval|core|yoga|pilates|barre|danc|box|cardio|functional|cross ?train|boot ?camp|flexib|stair|elliptical|row|mind|martial|climb|gymnastic|fitness|class|workout/i],
];
export const groupOf = (type) => GROUPS.find(([, re]) => re.test(type))?.[0] ?? "other";

/** short, human names for Health's long ones */
const NAMES = [
  [/high intensity interval/i, "HIIT"],
  [/functional strength|traditional strength|strength training/i, "Strength"],
  [/core training/i, "Core"],
  [/mixed cardio|cardio dance/i, "Cardio"],
  [/cross training/i, "Cross training"],
  [/outdoor run|indoor run|^running$/i, "Run"],
  [/outdoor walk|indoor walk|^walking$/i, "Walk"],
  [/outdoor cycl|indoor cycl|^cycling$/i, "Ride"],
];
export const nameOf = (type) => {
  const hit = NAMES.find(([re]) => re.test(type));
  if (hit) return hit[1];
  const t = type.replace(/^HKWorkoutActivityType/, "").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

/** "85 min", "1 hr 25 min", "1:25:00", "46:13", "5100" (s) or "85" (min) -> minutes */
export function minutesOf(raw) {
  const s = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  const clock = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (clock) {
    const [a, b, c] = [clock[1], clock[2], clock[3]].map((x) => (x === undefined ? undefined : Number(x)));
    if (c !== undefined) return a * 60 + b + c / 60; // h:mm:ss
    return a < 6 ? a * 60 + b : a + b / 60; // h:mm for short leads, else mm:ss
  }
  const units = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(h(?:ou)?r?s?|m(?:in(?:ute)?s?)?|s(?:ec(?:ond)?s?)?)\b/g)];
  if (units.length) {
    return units.reduce((t, [, v, u]) => t + Number(v) * (u.startsWith("h") ? 60 : u.startsWith("s") ? 1 / 60 : 1), 0);
  }
  const n = Number(s.match(/^\d+(?:\.\d+)?$/)?.[0]);
  if (!Number.isFinite(n)) return null;
  return n > 600 ? n / 60 : n; // a bare number: seconds if large, else minutes
}

/** "3.1 mi", "5 km", "5000 m", "3.1" (in `unit`) -> miles, or null */
export function milesOf(raw, unit = "mi") {
  const m = String(raw ?? "").trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(mi(?:les?)?|km|kilometers?|m|meters?)?$/);
  if (!m) return null;
  const v = Number(m[1]);
  const u = m[2] ?? unit;
  const mi = u.startsWith("mi") ? v : u.startsWith("k") ? v / KM_PER_MI : v / 1000 / KM_PER_MI;
  return mi > 0.01 && mi < 200 ? Math.round(mi * 100) / 100 : null;
}

export function parseWorkouts(text, unit = "mi") {
  const today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const out = [];
  for (const line of String(text ?? "").split(/\r?\n|;(?=\s*\d{4}-)/)) {
    const date = line.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!date || Number.isNaN(Date.parse(date)) || date < "2000-01-01" || date > today) continue;
    const fields = line.replace(/^[^|\t,]*\d{4}-\d{2}-\d{2}[^|\t,]*/, "").split(/\s*[|\t,]\s*/).map((f) => f.trim()).filter(Boolean);
    const type = fields.find((f) => /[a-z]/i.test(f) && minutesOf(f) === null && milesOf(f, unit) === null);
    if (!type) continue;
    const rest = fields.filter((f) => f !== type);
    const min = rest.map(minutesOf).find((v) => v !== null && v > 0);
    if (!(min >= 1 && min < 24 * 60)) continue;
    const mi = rest.slice(rest.findIndex((f) => minutesOf(f) === min) + 1).map((f) => milesOf(f, unit)).find((v) => v !== null) ?? null;
    out.push({ date, type: nameOf(type), group: groupOf(type), min: Math.round(min), mi });
  }
  // the same workout sent twice counts once
  const seen = new Set();
  return out.filter((w) => {
    const k = `${w.date}|${w.type}|${w.min}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function merge(prev, incoming) {
  if (!incoming.length) return prev ?? [];
  const dates = incoming.map((w) => w.date).sort();
  const [from, to] = [dates[0], dates[dates.length - 1]];
  const kept = (prev ?? []).filter((w) => w.date < from || w.date > to);
  const all = [...kept, ...incoming].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  return all.filter((w) => w.date >= cutoff);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const unit = (process.env.ACTIVITY_UNIT || "mi").trim().toLowerCase().startsWith("k") ? "km" : "mi";
  const text = process.env.ACTIVITY;
  const prev = await readJson(OUT);
  if (!text?.trim()) {
    console.log(`activity: nothing sent, keeping ${prev?.sample !== false ? "the placeholder" : `data from ${prev.updated}`}`);
  } else {
    const incoming = parseWorkouts(text, unit);
    if (!incoming.length) {
      warn(`activity: couldn't read any workouts from what the Shortcut sent, so nothing changed. It started: ${text.slice(0, 160)}`);
    } else {
      const workouts = merge(prev?.sample === false ? prev.workouts : [], incoming);
      await writeJson(OUT, { schema: 1, sample: false, source: "Apple Health", updated: new Date().toISOString(), workouts });
      const by = incoming.reduce((m, w) => ((m[w.group] = (m[w.group] ?? 0) + 1), m), {});
      console.log(`activity: ${incoming.length} workouts sent (${Object.entries(by).map(([g, n]) => `${n} ${g}`).join(", ")}); ${workouts.length} stored`);
    }
  }
}
