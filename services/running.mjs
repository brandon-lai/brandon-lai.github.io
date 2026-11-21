/**
 * Running mileage for /beta, sent by an iPhone Shortcut.
 *
 * Nike Run Club saves every run to Apple Health. A Shortcut on Brandon's
 * phone reads the daily running distance from Health and starts the deploy
 * workflow with it as the `runs` input (see README.md). The workflow hands it
 * to this script, which writes src/app/data/live/running.json:
 *
 *   RUN_DAYS="2026-11-19 6.2
 *   2026-11-17 3.1" RUN_UNIT=mi node services/running.mjs
 *
 * The parser is deliberately forgiving: it pulls every "yyyy-mm-dd <number>"
 * pair out of the text, whatever separates them, and takes a decimal comma.
 * The days it is sent replace the stored days in that range; older days are
 * kept, so a short Shortcut window never erases history. With nothing usable
 * in RUN_DAYS it changes nothing and exits 0, so a build never fails here.
 */
import { fileURLToPath } from "node:url";
import { readJson, warn, writeJson } from "./lib.mjs";

const OUT = fileURLToPath(new URL("../src/app/data/live/running.json", import.meta.url));
const KM_PER_MI = 1.609344;
const KEEP_DAYS = 800;

/** "yyyy-mm-dd value" pairs → Map(date → miles); per-day totals are summed */
export function parseDays(text, unit = "mi") {
  const days = new Map();
  const today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const re = /(\d{4}-\d{2}-\d{2})[^\d]+?(\d+(?:[.,]\d+)?)/g;
  for (const [, date, raw] of String(text ?? "").matchAll(re)) {
    const v = Number(raw.replace(",", "."));
    const miles = unit === "km" ? v / KM_PER_MI : v;
    if (Number.isNaN(Date.parse(date)) || date < "2000-01-01" || date > today) continue;
    if (!(miles > 0 && miles < 150)) continue;
    days.set(date, (days.get(date) ?? 0) + miles);
  }
  return days;
}

export function merge(prevDays, incoming) {
  const sent = [...incoming.keys()].sort();
  const from = sent[0];
  const kept = (prevDays ?? []).filter((d) => d.date < from);
  const fresh = sent.map((date) => ({ date, mi: Math.round(incoming.get(date) * 100) / 100 }));
  return [...kept, ...fresh].slice(-KEEP_DAYS);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const unit = (process.env.RUN_UNIT || "mi").trim().toLowerCase().startsWith("k") ? "km" : "mi";
  const incoming = parseDays(process.env.RUN_DAYS, unit);
  const prev = await readJson(OUT);
  if (!process.env.RUN_DAYS?.trim()) {
    console.log(`running: nothing sent, keeping ${prev?.sample ? "the sample data" : `data from ${prev?.updated ?? "an earlier run"}`}`);
  } else if (!incoming.size) {
    warn(`running: couldn't find any "yyyy-mm-dd distance" pairs in what the Shortcut sent, so nothing changed. It started: ${process.env.RUN_DAYS.slice(0, 120)}`);
  } else {
    const days = merge(prev?.sample ? [] : prev?.days, incoming);
    await writeJson(OUT, { schema: 1, sample: false, source: "Nike Run Club via Apple Health", updated: new Date().toISOString(), days });
    const total = [...incoming.values()].reduce((s, v) => s + v, 0);
    console.log(`running: ${incoming.size} days, ${total.toFixed(1)} mi sent; ${days.length} days stored`);
  }
}
