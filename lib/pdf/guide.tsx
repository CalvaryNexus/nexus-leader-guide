// Full leader guide PDF (blueprint 7.2): the Run of Night plus any optional rules sections, same
// brand, laid out after the Fall Kickoff run-of-night reference.
import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { dateFooter, dateLong } from "../format";
import type { ExtraSection, ScheduleRow } from "../types";
import { C, LOGO_RATIO, NavyBand, Rich, logoWhite, registerFonts } from "./common";

export type GuidePdfData = {
  seriesName: string;
  weekNumber: number;
  serviceDate: string;
  heroTagline: string;
  rows: ScheduleRow[];
  sections: ExtraSection[];
};

const MARGIN = 36;
const PAGE_W = 612;
const INNER_W = PAGE_W - MARGIN * 2;
const COL = { time: 68, item: 160 };

const th = { fontFamily: "Poppins", fontWeight: 600, fontSize: 6.5, letterSpacing: 1.3, color: "#FFFFFF", textTransform: "uppercase" as const };

function Schedule({ rows }: { rows: ScheduleRow[] }) {
  // Same striping rule as the web table: every even row of the table body (band rows included).
  const items: ({ kind: "band"; label: string } | { kind: "row"; row: ScheduleRow })[] = [];
  let band: string | null = null;
  for (const r of rows) {
    if (r.band !== band) {
      band = r.band;
      if (band.trim()) items.push({ kind: "band", label: band });
    }
    items.push({ kind: "row", row: r });
  }

  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: "row", backgroundColor: C.navy, paddingVertical: 8, paddingHorizontal: 10 }}>
        <Text style={{ ...th, width: COL.time }}>Time</Text>
        <Text style={{ ...th, width: COL.item }}>Item</Text>
        <Text style={{ ...th, flex: 1 }}>Details</Text>
      </View>
      {items.map((it, i) =>
        it.kind === "band" ? (
          <View key={i} style={{ backgroundColor: C.navyText, paddingVertical: 5, paddingHorizontal: 10 }} wrap={false}>
            <Text style={{ ...th, fontSize: 6.3, letterSpacing: 1.6 }}>{it.label}</Text>
          </View>
        ) : (
          <View
            key={i}
            wrap={false}
            style={{
              flexDirection: "row",
              paddingVertical: 7,
              paddingHorizontal: 10,
              borderTopWidth: 0.75,
              borderTopColor: C.rule,
              backgroundColor: it.row.highlight ? C.card : (i + 1) % 2 === 0 ? C.paper2 : "#FFFFFF",
            }}
          >
            <Text style={{ width: COL.time, fontFamily: "Poppins", fontWeight: 700, fontSize: 8.75, color: C.navyText, paddingRight: 6 }}>{it.row.time}</Text>
            <View style={{ width: COL.item, paddingRight: 10 }}>
              <Text style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 9.25, lineHeight: 1.3, color: C.navyText }}>{it.row.item}</Text>
              {it.row.item_note.trim() ? (
                <Text style={{ fontFamily: "Poppins", fontSize: 7, lineHeight: 1.35, color: C.inkSoft, marginTop: 2 }}>{it.row.item_note}</Text>
              ) : null}
            </View>
            <Rich text={it.row.detail} style={{ flex: 1, fontFamily: "Poppins", fontSize: 8.5, lineHeight: 1.45, color: C.inkSoft }} />
          </View>
        ),
      )}
      <View style={{ height: 0.75, backgroundColor: C.rule }} />
    </View>
  );
}

function RulesSection({ s, first }: { s: ExtraSection; first: boolean }) {
  // Two columns, filled top to bottom like the kickoff reference.
  const half = Math.ceil(s.items.length / 2);
  const cols = [s.items.slice(0, half), s.items.slice(half)];
  return (
    <View style={{ marginTop: first ? 0 : 26 }}>
      <View wrap={false}>
        <Text style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 17, color: C.navyText, textAlign: "center" }}>{s.title}</Text>
        {s.subtitle.trim() ? <Rich text={s.subtitle} style={{ fontFamily: "Poppins", fontSize: 9.5, color: C.inkSoft, textAlign: "center", marginTop: 3 }} /> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        {cols.map((col, c) => (
          <View key={c} style={{ flex: 1, gap: 6 }}>
            {col.map((item, i) => {
              const n = c === 0 ? i + 1 : half + i + 1;
              return (
                <View key={i} wrap={false} style={{ borderWidth: 0.75, borderColor: C.rule, borderRadius: 4, paddingVertical: 8, paddingRight: 10, paddingLeft: 30, position: "relative" }}>
                  <Text style={{ position: "absolute", left: 10, top: 8.5, fontFamily: "Poppins", fontWeight: 700, fontSize: 8, color: C.stripe }}>{String(n).padStart(2, "0")}</Text>
                  <Rich text={item} style={{ fontFamily: "Poppins", fontSize: 8.75, lineHeight: 1.45, color: C.inkSoft }} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function GuideDoc({ d }: { d: GuidePdfData }) {
  const footer = ["Nexus Student Ministry", d.seriesName, `Week ${d.weekNumber}`, dateFooter(d.serviceDate)].filter(Boolean).join(" • ");
  const when = [dateLong(d.serviceDate), d.heroTagline.trim()].filter(Boolean).join("  •  ");
  const logoH = 22;
  const pageStyle = { paddingTop: MARGIN, paddingHorizontal: MARGIN, paddingBottom: MARGIN + 18 };
  const Footer = () => (
    <Text
      fixed
      style={{ position: "absolute", bottom: 26, left: MARGIN, right: MARGIN, textAlign: "center", fontFamily: "Poppins", fontSize: 7, color: C.faint }}
      render={({ pageNumber, totalPages }) => `${footer} • Page ${pageNumber} of ${totalPages}`}
    />
  );

  return (
    <Document title={`${d.seriesName} Week ${d.weekNumber} Leader's Guide`} author="Nexus Student Ministry" creator="Nexus Leader Guide">
      <Page size="LETTER" style={pageStyle}>
        <NavyBand width={INNER_W} height={100} radius={6} stripe={44}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Image src={logoWhite()} style={{ height: logoH, width: logoH * LOGO_RATIO }} />
            <Text style={{ fontFamily: "Archivo Black", fontSize: 19, color: "#FFFFFF", marginTop: 7, lineHeight: 1 }}>RUN OF NIGHT</Text>
            <Text style={{ fontFamily: "Poppins", fontWeight: 600, fontSize: 8.5, color: "#FFFFFF", marginTop: 7 }}>{when}</Text>
          </View>
        </NavyBand>
        <Schedule rows={d.rows} />
        <Footer />
      </Page>
      {d.sections.length > 0 && (
        <Page size="LETTER" style={pageStyle}>
          {d.sections.map((s, i) => (
            <RulesSection key={s.id} s={s} first={i === 0} />
          ))}
          <Footer />
        </Page>
      )}
    </Document>
  );
}

export async function renderGuidePdf(d: GuidePdfData): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<GuideDoc d={d} />);
}
