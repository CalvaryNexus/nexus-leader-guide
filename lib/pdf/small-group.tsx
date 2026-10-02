// Small group half-sheet (blueprint 7.1): US Letter portrait, two identical 8.5 x 5.5in cards with a
// dashed cut line at exactly 5.5in. Question type auto-scales between 10pt and 9pt so the card fills
// the half sheet without spilling, whatever the question count.
import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { stripTranslation } from "../format";
import { C, LOGO_RATIO, NavyBand, Rich, countPages, logoWhite, registerFonts } from "./common";

export type SmallGroupData = {
  seriesName: string;
  weekNumber: number;
  mainIdea: string;
  questions: string[];
  verseReference: string;
};

const PT_PER_MM = 72 / 25.4;
const PAGE_W = 612; // 8.5in
const CARD_H = 396; // 5.5in
const PAD = { top: 8 * PT_PER_MM, x: 11 * PT_PER_MM, bottom: 7 * PT_PER_MM };
const INNER_W = PAGE_W - PAD.x * 2;
const BAND_H = 54;
const LOGO_H = 21;

const eyebrow = { fontFamily: "Poppins", fontWeight: 700, fontSize: 6.5, letterSpacing: 2, color: C.stripe, textTransform: "uppercase" as const };

function CardContent({ d, size }: { d: SmallGroupData; size: number }) {
  return (
    <>
      <NavyBand width={INNER_W} height={BAND_H}>
        <Image src={logoWhite()} style={{ position: "absolute", left: 22, top: (BAND_H - LOGO_H) / 2, height: LOGO_H, width: LOGO_H * LOGO_RATIO }} />
        <View style={{ position: "absolute", right: 23, top: 0, height: BAND_H, justifyContent: "center", alignItems: "flex-end" }}>
          <Text style={{ fontFamily: "Archivo Black", fontSize: 15, color: "#FFFFFF", lineHeight: 1 }}>SMALL GROUP</Text>
          <Text style={{ fontFamily: "Poppins", fontWeight: 600, fontSize: 6.5, letterSpacing: 1.6, color: "#BBC2D2", marginTop: 6, textTransform: "uppercase" }}>
            {d.seriesName} {"•"} Week {d.weekNumber}
          </Text>
        </View>
      </NavyBand>

      {d.mainIdea.trim() ? (
        <View style={{ marginTop: 13, backgroundColor: C.card, borderRadius: 4, paddingTop: 12, paddingBottom: 13, paddingHorizontal: 18, alignItems: "center" }}>
          <Text style={eyebrow}>Main Idea</Text>
          <Rich text={d.mainIdea} boldColor={C.navyText} style={{ marginTop: 5, fontFamily: "Poppins", fontWeight: 700, fontSize: 13, lineHeight: 1.25, color: C.navyText, textAlign: "center" }} />
        </View>
      ) : null}

      <Text style={{ ...eyebrow, marginTop: 15 }}>Questions</Text>
      <View style={{ marginTop: 5, height: 0.75, backgroundColor: C.cardLine }} />
      <View style={{ marginTop: size * 1.1 }}>
        {d.questions.map((q, i) => (
          <View key={i} style={{ flexDirection: "row", marginBottom: i === d.questions.length - 1 ? 0 : size * 0.66 }} wrap={false}>
            <Text style={{ width: 23, fontFamily: "Poppins", fontWeight: 700, fontSize: size, lineHeight: 1.36, color: C.stripe }}>{i + 1}</Text>
            <Rich text={q} style={{ flex: 1, fontFamily: "Poppins", fontSize: size, lineHeight: 1.36, color: C.ink }} />
          </View>
        ))}
      </View>

      <Text style={{ marginTop: "auto", paddingTop: 8, textAlign: "center", fontFamily: "Poppins", fontWeight: 500, fontSize: 6.3, lineHeight: 1, letterSpacing: 1.4, color: C.faint, textTransform: "uppercase" }}>
        {["Nexus Student Ministry", stripTranslation(d.verseReference)].filter(Boolean).join(" • ")}
      </Text>
    </>
  );
}

/** One card on a 5.5in page: if it renders as a single page, the type size fits. */
function FitTest({ d, size }: { d: SmallGroupData; size: number }) {
  return (
    <Document>
      <Page size={[PAGE_W, CARD_H]} style={{ paddingTop: PAD.top, paddingHorizontal: PAD.x, paddingBottom: PAD.bottom }}>
        <CardContent d={d} size={size} />
      </Page>
    </Document>
  );
}

function Sheet({ d, size }: { d: SmallGroupData; size: number }) {
  const card = (
    <View style={{ height: CARD_H, paddingTop: PAD.top, paddingHorizontal: PAD.x, paddingBottom: PAD.bottom, overflow: "hidden" }}>
      <CardContent d={d} size={size} />
    </View>
  );
  return (
    <Document title={`${d.seriesName} Week ${d.weekNumber} Small Group`} author="Nexus Student Ministry" creator="Nexus Leader Guide">
      <Page size="LETTER" style={{ position: "relative" }}>
        {card}
        {card}
        <View style={{ position: "absolute", top: CARD_H, left: 0, right: 0, borderTopWidth: 0.75, borderTopColor: "#C9D2E0", borderStyle: "dashed" }} />
      </Page>
    </Document>
  );
}

async function fits(d: SmallGroupData, size: number): Promise<boolean> {
  return countPages(await renderToBuffer(<FitTest d={d} size={size} />)) === 1;
}

/** Largest question size from 10pt down to 9pt (0.1 steps) that keeps one card on the half sheet. */
export async function pickQuestionSize(d: SmallGroupData): Promise<number> {
  registerFonts();
  const steps = Array.from({ length: 11 }, (_, i) => Math.round((10 - i * 0.1) * 10) / 10); // 10.0 ... 9.0
  if (await fits(d, steps[0])) return steps[0];
  if (!(await fits(d, steps[steps.length - 1]))) {
    // Unusually long: keep shrinking toward 8pt rather than spill into the second card.
    for (let s = 8.9; s >= 8; s = Math.round((s - 0.1) * 10) / 10) if (await fits(d, s)) return s;
    return 8;
  }
  let lo = steps.length - 1; // fits
  let hi = 0; // doesn't fit
  while (lo - hi > 1) {
    const mid = (lo + hi) >> 1;
    if (await fits(d, steps[mid])) lo = mid;
    else hi = mid;
  }
  return steps[lo];
}

export async function renderSmallGroup(d: SmallGroupData): Promise<{ pdf: Buffer; size: number }> {
  registerFonts();
  const size = await pickQuestionSize(d);
  return { pdf: await renderToBuffer(<Sheet d={d} size={size} />), size };
}
