// Two gates, both cookie-based:
//  - Admin: one shared password (ADMIN_PASSWORD env var). Session cookie expires after 30 days and is
//    invalidated when the password changes.
//  - Leaders: a shared code set in admin Settings, entered once per device and remembered for 400 days
//    (the browser maximum). Changing the code signs every device out. A blank code opens the guide to
//    anyone with the link.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "nx_admin";
export const LEADER_COOKIE = "nx_leader";
const ADMIN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LEADER_MAX_AGE_S = 400 * 24 * 60 * 60;

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Without an explicit secret, derive one from values that are already private to this deployment.
  return createHash("sha256")
    .update(`nexus-leader-guide:${process.env.ADMIN_PASSWORD ?? ""}:${process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "local"}`)
    .digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD?.trim();
  return p ? p : null;
}

export function checkAdminPassword(attempt: string): boolean {
  const p = adminPassword();
  if (!p) return false;
  return safeEqual(sign(`pw:${attempt}`), sign(`pw:${p}`));
}

export function makeAdminToken(now = Date.now()): string {
  const exp = now + ADMIN_TTL_MS;
  return `${exp}.${sign(`admin:${exp}:${adminPassword() ?? ""}`)}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token || !adminPassword()) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !(Number(exp) > Date.now())) return false;
  return safeEqual(mac, sign(`admin:${exp}:${adminPassword()}`));
}

export const ADMIN_COOKIE_MAX_AGE_S = ADMIN_TTL_MS / 1000;

export function normalizeCode(code: string): string {
  return (code ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function leaderToken(code: string): string {
  return sign(`leader:${normalizeCode(code)}`);
}

export function verifyLeaderToken(token: string | undefined | null, code: string): boolean {
  if (!normalizeCode(code)) return true; // no code set: the guide is open
  return Boolean(token) && safeEqual(token as string, leaderToken(code));
}

/** Only allow redirects back into this site. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
