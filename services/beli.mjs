/**
 * Our Beli client. Beli has no public API; this speaks the private one its
 * mobile app uses, as documented by the MIT-licensed jcjc-dev/beli-mcp
 * contract (captured from app v9.3.1). It only ever reads, and only your own
 * account: one login, five ranked lists, one bookmark list per sync.
 *
 *   fetchBeli({ phone, password }) → the panel's data (see ../src/app/data/live/beli.json)
 *
 * Check it against your account from a terminal (asks for the password, hidden):
 *   node services/beli.mjs --check
 */
import { ask, sleep } from "./lib.mjs";

const HOSTS = {
  auth: "https://backoffice-service-onboarding-t57o3dxfca-nn.a.run.app",
  api: "https://backoffice-service-t57o3dxfca-nn.a.run.app",
};
const HEADERS = {
  Accept: "application/json",
  Origin: "https://localhost",
  Referer: "https://localhost/",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 16; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.91 Mobile Safari/537.36",
};
/** Beli's list categories, and how the panel labels them */
const CATEGORIES = { RES: "Restaurants", BAR: "Bars", COFFEE: "Coffee", BAKERY: "Bakeries", DESSERT: "Dessert" };

export class BeliError extends Error {
  constructor(step, status, body) {
    super(`Beli ${step} → ${status}${body ? `: ${body.slice(0, 160)}` : ""}`);
    this.status = status;
  }
}

/** Beli logs in by phone number in E.164 form (+15551234567). */
export function normalizePhone(raw) {
  const digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function call(step, url, { token, body } = {}) {
  const headers = { ...HEADERS };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new BeliError(step, res.status, text);
  return text ? JSON.parse(text) : {};
}

function claims(jwt) {
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

const round1 = (n) => (typeof n === "number" ? Math.round(n * 10) / 10 : null);
const lastVisit = (row) => (row.visit_dates?.length ? [...row.visit_dates].sort().at(-1) : null);

function place(row, category) {
  const b = row.business ?? {};
  return {
    name: b.name,
    score: round1(row.score),
    area: b.neighborhood || b.borough || b.city || null,
    city: b.city ?? null,
    cuisine: b.cuisines?.[0] ?? null,
    price: typeof b.price === "number" ? b.price : null,
    visited: lastVisit(row),
    category: CATEGORIES[category] ?? category,
  };
}

export async function fetchBeli({ phone, password }) {
  const tok = await call("login", `${HOSTS.auth}/api/token/`, {
    body: { phone_no: normalizePhone(phone), password },
  });
  const token = tok.access;
  const me = await call("profile", `${HOSTS.auth}/api/user/logged-in/`, { token });
  const user = me.results?.[0] ?? {};
  const userId = user.id ?? claims(token).user_id;

  const been = {};
  for (const cat of Object.keys(CATEGORIES)) {
    const url = `${HOSTS.api}/api/get-ranking/?user=${userId}&category=${cat}`;
    been[cat] = (await call(`ranking ${cat}`, url, { token })).results ?? [];
    await sleep(350); // be a polite client
  }
  const bm = await call("bookmarks", `${HOSTS.api}/api/get-bookmark/?user=${userId}&category=RES`, { token });
  const want = Object.values(bm).flat();

  const all = Object.entries(been).flatMap(([cat, rows]) => rows.map((r) => place(r, cat)));
  const top = been.RES.map((r) => place(r, "RES"))
    .filter((p) => p.name && p.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const recent = all
    .filter((p) => p.name && p.visited)
    .sort((a, b) => b.visited.localeCompare(a.visited))
    .slice(0, 4);

  return {
    schema: 1,
    sample: false,
    source: "beli",
    updated: new Date().toISOString(),
    user: { username: user.username ?? null },
    counts: {
      been: all.length,
      byCategory: Object.fromEntries(Object.entries(been).map(([c, rows]) => [CATEGORIES[c], rows.length])),
      wantToTry: want.length,
    },
    top,
    recent,
    want: want.slice(0, 5).map((r) => ({ name: r.business?.name, area: r.business?.neighborhood || r.business?.city || null })),
  };
}

/* ---- `node services/beli.mjs --check` --------------------------------------- */
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("--check")) {
  const phone = process.env.BELI_PHONE || (await ask("Beli phone number: "));
  const password = process.env.BELI_PASSWORD || (await ask("Beli password (hidden): ", { hidden: true }));
  try {
    const d = await fetchBeli({ phone, password });
    console.log(`\nLogged in as @${d.user.username}. ${d.counts.been} places ranked, ${d.counts.wantToTry} on want-to-try.`);
    console.log("Top 3:", d.top.slice(0, 3).map((p) => `${p.name} (${p.score})`).join(", ") || "none");
    console.log("\nBeli works. Add BELI_PHONE and BELI_PASSWORD as repo secrets and the site will sync on its own.");
  } catch (e) {
    console.error(`\n${e.message}`);
    if (e.status === 403) console.error("Beli refused the login itself, so their app now needs something this client can't send.");
    if (e.status === 401) console.error("Wrong phone number or password.");
    process.exitCode = 1;
  }
}
