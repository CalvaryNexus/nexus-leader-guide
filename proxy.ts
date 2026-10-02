// Admin is the only authenticated surface (blueprint section 2). Leader pages check the leader code
// in their own route handlers because the code lives in the database.
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(pathname + search)}`, req.url));
}

export const config = { matcher: ["/admin/:path*"] };
