import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Minimal `.env.local` loader for standalone scripts run via `tsx`
 * (Next.js's own dev/build process loads `.env.local` automatically, but a
 * script invoked directly with `tsx scripts/foo.ts` gets no env unless it
 * loads it itself). Intentionally dependency-free rather than pulling in
 * `dotenv` for a handful of `KEY=VALUE` lines. Never overwrites a variable
 * already present in the real environment (e.g. CI secrets).
 */
export function loadEnvLocal(): void {
  let contents: string;
  try {
    contents = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
