import type { NextRequest } from "next/server";
import { fileStem, loadForPdf, pdfResponse } from "@/lib/pdf/route";
import { renderSmallGroup } from "@/lib/pdf/small-group";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await loadForPdf(req, (await ctx.params).id);
  if ("res" in r) return r.res;
  const { week, series } = r.data;
  const { pdf, size } = await renderSmallGroup({
    seriesName: series.name,
    weekNumber: week.week_number,
    mainIdea: week.main_idea,
    questions: week.small_group_questions.filter((q) => q.trim()),
    verseReference: week.theme_verse_reference,
  });
  return pdfResponse(pdf, `${fileStem(series.name, week.week_number)}-Small-Group.pdf`, { "x-question-size": String(size) });
}
