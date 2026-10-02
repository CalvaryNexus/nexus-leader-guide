// The current week's leader guide (the main event).
import type { NextRequest } from "next/server";
import { getCurrentWeek, getSettings, loadGuide } from "@/lib/data";
import { htmlResponse, leaderGate } from "@/lib/http";
import { buildGuideView, renderGuideDocument } from "@/lib/render/guide";
import { renderMessage } from "@/lib/render/pages";

export async function GET(req: NextRequest) {
  const gate = await leaderGate(req);
  if (gate) return gate;
  const data = await loadGuide(await getCurrentWeek());
  if (!data) {
    const { footer } = await getSettings();
    return htmlResponse(req, renderMessage({ title: "Coming Soon", message: "This week's guide has not been published yet.", footer }));
  }
  const view = buildGuideView(data.week, data.series, data.settings);
  return htmlResponse(req, renderGuideDocument(view, { mode: "live", archiveHref: "/archive" }));
}
