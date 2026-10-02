// Shared loading and access rules for the PDF routes.
import type { NextRequest } from "next/server";
import { getWeek, loadGuide, type GuideData } from "../data";
import { isAdmin, leaderGate } from "../http";

export async function loadForPdf(req: NextRequest, id: string): Promise<{ data: GuideData } | { res: Response }> {
  const gate = await leaderGate(req);
  if (gate) return { res: gate };
  const week = await getWeek(Number(id));
  const data = week && (week.published || isAdmin(req)) ? await loadGuide(week) : null;
  if (!data) return { res: new Response("Week not found", { status: 404 }) };
  return { data };
}

export function pdfResponse(pdf: Buffer, filename: string, extra: Record<string, string> = {}): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, no-cache",
      ...extra,
    },
  });
}

export function fileStem(seriesName: string, weekNumber: number): string {
  return `${seriesName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Nexus"}-Wk${weekNumber}`;
}
