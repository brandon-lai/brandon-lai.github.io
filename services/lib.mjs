/**
 * Shared helpers for the data services. No dependencies: Node 20+ only.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

export const CI = Boolean(process.env.GITHUB_ACTIONS);

/** A warning that shows up on the workflow run summary in CI, plain text locally. */
export function warn(msg) {
  console.log(CI ? `::warning::${msg}` : `warning: ${msg}`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

/** Ask for a value on the terminal; `hidden` keeps a password off the screen. */
export function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (v) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(v.trim());
    });
  });
}
