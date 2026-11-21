/**
 * One-time Strava connection. Run it on your own machine:
 *
 *   node services/strava-auth.mjs <client_id> <client_secret>
 *
 * (both are on https://www.strava.com/settings/api; set that app's
 * "Authorization Callback Domain" to `localhost`). It opens Strava in your
 * browser, you approve read access, and it stores STRAVA_CLIENT_ID,
 * STRAVA_CLIENT_SECRET and STRAVA_REFRESH_TOKEN as secrets on this repo with
 * the GitHub CLI. Secrets go to `gh` on stdin, never on a command line.
 */
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";

const [clientId, clientSecret] = process.argv.slice(2);
if (!clientId || !clientSecret) {
  console.error("usage: node services/strava-auth.mjs <client_id> <client_secret>");
  process.exit(1);
}

const PORT = 8721;
const redirect = `http://localhost:${PORT}/exchange`;
const authorize = new URL("https://www.strava.com/oauth/authorize");
authorize.search = new URLSearchParams({
  client_id: clientId,
  response_type: "code",
  redirect_uri: redirect,
  approval_prompt: "force",
  scope: "read,activity:read",
}).toString();

function setSecret(name, value) {
  const r = spawnSync("gh", ["secret", "set", name], { input: value, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`gh secret set ${name} failed: ${r.stderr.trim()}`);
  console.log(`  set ${name}`);
}

const page = (msg) =>
  `<!doctype html><meta charset="utf-8"><title>Strava</title><body style="font:16px system-ui;padding:48px">${msg}</body>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, redirect);
  if (url.pathname !== "/exchange") return res.writeHead(404).end();
  const code = url.searchParams.get("code");
  const scope = url.searchParams.get("scope") ?? "";
  try {
    if (!code) throw new Error(url.searchParams.get("error") || "Strava sent no code");
    if (!scope.includes("activity:read")) throw new Error("activity access wasn't granted; tick the activities box and try again");
    const r = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code" }),
    });
    const tok = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(tok));
    console.log(`Connected as ${tok.athlete?.firstname ?? "you"}. Saving repo secrets:`);
    setSecret("STRAVA_CLIENT_ID", String(clientId));
    setSecret("STRAVA_CLIENT_SECRET", clientSecret);
    setSecret("STRAVA_REFRESH_TOKEN", tok.refresh_token);
    res.writeHead(200, { "Content-Type": "text/html" }).end(page("Strava is connected. You can close this tab."));
    console.log("Done. The next site build will pull your activities.");
  } catch (e) {
    console.error(`Strava connection failed: ${e.message}`);
    res.writeHead(500, { "Content-Type": "text/html" }).end(page(`Something went wrong: ${e.message}`));
    process.exitCode = 1;
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Opening Strava to approve access…\nIf nothing opens, visit:\n${authorize}\n`);
  spawnSync(process.platform === "darwin" ? "open" : "xdg-open", [authorize.toString()]);
});
