// Helpers for the public route handlers (the guide is served as plain HTML, no client JavaScript
// beyond the reference's scroll-reveal script, which keeps it fast on cellular).
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, LEADER_COOKIE, verifyAdminToken, verifyLeaderToken } from "./auth";
import { getSettings } from "./data";

export function htmlResponse(req: NextRequest, html: string, status = 200): Response {
  const etag = `"${createHash("sha1").update(html).digest("base64url")}"`;
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "private, no-cache",
    vary: "Cookie",
    etag,
    "x-robots-tag": "noindex, nofollow",
  };
  if (status === 200 && req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(html, { status, headers });
}

export function isAdmin(req: NextRequest): boolean {
  return verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

/** Null when the visitor may see leader pages; otherwise a redirect to the code page. */
export async function leaderGate(req: NextRequest): Promise<Response | null> {
  if (isAdmin(req)) return null;
  const { leader_code } = await getSettings();
  if (verifyLeaderToken(req.cookies.get(LEADER_COOKIE)?.value, leader_code)) return null;
  const next = req.nextUrl.pathname + req.nextUrl.search;
  return Response.redirect(new URL(`/access?next=${encodeURIComponent(next)}`, req.url), 303);
}

export function notFound(req: NextRequest, html: string): Response {
  return htmlResponse(req, html, 404);
}
