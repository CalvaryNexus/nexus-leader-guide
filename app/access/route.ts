// Leader code page. The code is entered once per device and remembered.
import { NextResponse, type NextRequest } from "next/server";
import { LEADER_COOKIE, LEADER_MAX_AGE_S, leaderToken, normalizeCode, safeNext } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { htmlResponse } from "@/lib/http";
import { renderAccess } from "@/lib/render/pages";

export async function GET(req: NextRequest) {
  const { footer } = await getSettings();
  return htmlResponse(req, renderAccess({ next: safeNext(req.nextUrl.searchParams.get("next")), footer }));
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code = String(form.get("code") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));
  const settings = await getSettings();

  if (!normalizeCode(settings.leader_code) || normalizeCode(code) === normalizeCode(settings.leader_code)) {
    const res = NextResponse.redirect(new URL(next, req.url), 303);
    res.cookies.set(LEADER_COOKIE, leaderToken(settings.leader_code), {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: LEADER_MAX_AGE_S,
    });
    return res;
  }

  await new Promise((r) => setTimeout(r, 600)); // slow down guessing
  return htmlResponse(req, renderAccess({ next, error: "That code didn't match. Check with Tanner for this season's code.", footer: settings.footer }), 401);
}
