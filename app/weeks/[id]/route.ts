// Any published week, rendered exactly like the current week, with a past-week banner.
import type { NextRequest } from "next/server";
import { getCurrentWeek, getSettings, getWeek, loadGuide } from "@/lib/data";
import { htmlResponse, isAdmin, leaderGate } from "@/lib/http";
import { buildGuideView, renderGuideDocument } from "@/lib/render/guide";
import { renderMessage } from "@/lib/render/pages";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await leaderGate(req);
  if (gate) return gate;
  const { id } = await ctx.params;
  const week = await getWeek(Number(id));
  const data = week && (week.published || isAdmin(req)) ? await loadGuide(week) : null;
  if (!data) {
    const { footer } = await getSettings();
    return htmlResponse(
      req,
      renderMessage({ title: "Week Not Found", message: "That week is not available.", footer, link: { href: "/archive", label: "See past weeks" } }),
      404,
    );
  }
  const current = await getCurrentWeek();
  const view = buildGuideView(data.week, data.series, data.settings);
  return htmlResponse(
    req,
    renderGuideDocument(view, {
      mode: "live",
      archiveHref: "/archive",
      pastWeek: current && current.id !== data.week.id && data.week.published ? { currentHref: "/" } : null,
      draftNotice: data.week.published ? null : "Not published yet. Only admins can see this week.",
    }),
  );
}
