// Archive: every published week, newest first. A list and a link (blueprint 4.2).
import type { NextRequest } from "next/server";
import { getSettings, listWeeks } from "@/lib/data";
import { htmlResponse, leaderGate } from "@/lib/http";
import { renderArchive } from "@/lib/render/pages";

export async function GET(req: NextRequest) {
  const gate = await leaderGate(req);
  if (gate) return gate;
  const [weeks, settings] = await Promise.all([listWeeks({ publishedOnly: true }), getSettings()]);
  const entries = weeks.map((w, i) => ({
    id: w.id,
    seriesId: w.series_id,
    seriesName: w.series_name,
    seriesReference: w.series_reference,
    weekNumber: w.week_number,
    serviceDate: w.service_date,
    verseReference: w.theme_verse_reference,
    isCurrent: i === 0,
  }));
  return htmlResponse(req, renderArchive(entries, settings.footer));
}
