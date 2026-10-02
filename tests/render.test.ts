// "Output must be visually identical to the current hand-built guide." This renders the seeded
// Week 3 and compares it, element by element, with the hand-built reference file.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildGuideView, renderGuideDocument } from "../lib/render/guide";
import { REFERENCE_CSS } from "../lib/render/reference-css";
import { SEED_FOOTER, SEED_SERIES, SEED_WEEK } from "../lib/seed";
import type { Series, Week } from "../lib/types";

const reference = fs.readFileSync(path.join(__dirname, "../reference/abide-week-3-index.html"), "utf8");

const series: Series = { id: 1, active: true, ...SEED_SERIES };
const week: Week = { id: 1, series_id: 1, published: true, published_at: null, updated_at: null, schedule_snapshot: null, ...SEED_WEEK };
const html = renderGuideDocument(buildGuideView(week, series, { footer: SEED_FOOTER }), { mode: "live", archiveHref: null as unknown as string });

/** Body markup as a list of tags and text, whitespace-insensitive. */
function tokens(doc: string): string[] {
  const body = doc.slice(doc.indexOf("<body>"), doc.indexOf("<script>"));
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&bull;/g, "•")
    .replace(/<br\s*\/?>/g, "<br>")
    .split(/(<[^>]+>)/)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

describe("public guide matches the reference", () => {
  it("has the same markup, apart from the intended differences", () => {
    const ours = tokens(html).map((t) =>
      // The logo is a real asset now instead of base64 (blueprint section 9), with dimensions to prevent layout shift.
      t.replace(/<img class="(logo-nexus|foot-logo)" src="\/nexus-logo-white.png" width="900" height="223" alt="Nexus">/, '<img class="$1" alt="Nexus">'),
    );
    const theirs = tokens(reference).map((t) => t.replace(/<img class="(logo-nexus|foot-logo)" src="data:[^"]+" alt="Nexus">/, '<img class="$1" alt="Nexus">'));

    // Decision 3: the hero names the weekday and date instead of "NEXUS Schedule".
    const i = theirs.indexOf("NEXUS Schedule");
    expect(i).toBeGreaterThan(-1);
    theirs[i] = "Sunday, September 27";

    expect(ours).toEqual(theirs);
  });

  it("uses the reference stylesheet verbatim", () => {
    const refCss = reference.slice(reference.indexOf("<style>") + 7, reference.indexOf("</style>"));
    // Every rule we ship from the reference appears in it unchanged.
    for (const chunk of REFERENCE_CSS.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean)) {
      if (chunk.startsWith("/* --------- FORM")) continue;
      for (const line of chunk.split("\n")) expect(refCss).toContain(line);
    }
  });

  it("loads the brand fonts exactly as specified", () => {
    expect(html).toContain("https://fonts.googleapis.com/css2?family=Archivo+Black&family=Poppins:wght@400;500;600;700&display=swap");
  });

  it("drops disabled optional sections completely", () => {
    const withGame: Week = {
      ...week,
      extra_sections: [{ id: "g", kind: "game", enabled: false, title: "MatBall", subtitle: "6:35 PM in the Gym", items: ["Rule one"] }],
    };
    const off = renderGuideDocument(buildGuideView(withGame, series, { footer: SEED_FOOTER }), { mode: "live" });
    expect(off).not.toContain("MatBall");
    const on = renderGuideDocument(
      buildGuideView({ ...withGame, extra_sections: [{ ...withGame.extra_sections[0], enabled: true }] }, series, { footer: SEED_FOOTER }),
      { mode: "live" },
    );
    expect(on).toContain('<h2 class="sec-h reveal">MatBall</h2>');
    expect(on).toContain('<p class="sec-sub reveal">6:35 PM in the Gym</p>');
    // Game sits between Run of Night and the (tinted) small group questions, on a white section.
    expect(on.indexOf("Run of Night")).toBeLessThan(on.indexOf("MatBall"));
    expect(on.indexOf("MatBall")).toBeLessThan(on.indexOf("Small Group Questions"));
    expect(on).toMatch(/<section>\s*<div class="wrap">\s*<h2 class="sec-h reveal">MatBall/);
  });

  it("escapes HTML in content", () => {
    const evil = renderGuideDocument(buildGuideView({ ...week, meal: "<script>alert(1)</script>" }, series, { footer: SEED_FOOTER }), { mode: "live" });
    expect(evil).not.toContain("<script>alert(1)</script>");
    expect(evil).toContain("&lt;script&gt;");
  });
});
