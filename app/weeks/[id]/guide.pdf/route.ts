import type { NextRequest } from "next/server";
import { renderGuidePdf } from "@/lib/pdf/guide";
import { fileStem, loadForPdf, pdfResponse } from "@/lib/pdf/route";
import { buildGuideView } from "@/lib/render/guide";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await loadForPdf(req, (await ctx.params).id);
  if ("res" in r) return r.res;
  const view = buildGuideView(r.data.week, r.data.series, r.data.settings);
  const pdf = await renderGuidePdf({
    seriesName: view.seriesName,
    weekNumber: view.weekNumber,
    serviceDate: view.serviceDate,
    heroTagline: view.heroTagline,
    rows: view.scheduleRows,
    sections: view.sections,
  });
  return pdfResponse(pdf, `${fileStem(view.seriesName, view.weekNumber)}-Leader-Guide.pdf`);
}
