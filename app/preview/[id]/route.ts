// Admin preview of any week, published or not, opened in a new tab from the editor.
import type { NextRequest } from "next/server";
import { getWeek, loadGuide } from "@/lib/data";
import { htmlResponse, isAdmin } from "@/lib/http";
import { buildGuideView, renderGuideDocument } from "@/lib/render/guide";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return Response.redirect(new URL(`/admin/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url), 303);
  const { id } = await ctx.params;
  const data = await loadGuide(await getWeek(Number(id)));
  if (!data) return new Response("Week not found", { status: 404 });
  const view = buildGuideView(data.week, data.series, data.settings);
  return htmlResponse(
    req,
    renderGuideDocument(view, {
      mode: "live",
      archiveHref: "/archive",
      draftNotice: data.week.published
        ? "Preview. This week is published, so leaders see exactly this."
        : "Preview. This week is not published yet, so leaders can't see it.",
    }),
  );
}
