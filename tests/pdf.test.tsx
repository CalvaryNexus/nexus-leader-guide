// The half-sheet must always fill exactly one 5.5in card per half, whatever the question count.
import { describe, expect, it } from "vitest";
import { countPages } from "../lib/pdf/common";
import { renderGuidePdf } from "../lib/pdf/guide";
import { pickQuestionSize, renderSmallGroup } from "../lib/pdf/small-group";
import { SEED_TEMPLATE, SEED_WEEK } from "../lib/seed";

const base = {
  seriesName: "Abide",
  weekNumber: 3,
  mainIdea: "Obedience is our response to abiding in Jesus.",
  verseReference: "John 15:9 (ESV)",
  questions: SEED_WEEK.small_group_questions,
};

describe("small group half-sheet", () => {
  it("prints the reference week on one letter page, near the reference's 9.9pt", async () => {
    const { pdf, size } = await renderSmallGroup(base);
    expect(countPages(pdf)).toBe(1);
    expect(size).toBeGreaterThanOrEqual(9.6);
    expect(size).toBeLessThanOrEqual(10);
    expect(pdf.toString("latin1")).toContain("/Font"); // real text, not an image
  }, 30_000);

  it("uses the full 10pt when there are only a few questions", async () => {
    expect(await pickQuestionSize({ ...base, questions: base.questions.slice(0, 4) })).toBe(10);
  }, 30_000);

  it("scales down instead of spilling when there are more questions", async () => {
    const nine = [...base.questions, "One more question that runs a little long so it wraps onto a second line of the card?", "And a final one?"];
    const size = await pickQuestionSize({ ...base, questions: nine });
    expect(size).toBeLessThan(9.9);
    expect(size).toBeGreaterThanOrEqual(8);
    const { pdf } = await renderSmallGroup({ ...base, questions: nine });
    expect(countPages(pdf)).toBe(1);
  }, 60_000);
});

describe("full guide PDF", () => {
  it("is one page without optional sections and two with them", async () => {
    const d = { seriesName: "Abide", weekNumber: 3, serviceDate: "2026-09-27", heroTagline: "Leaders arrive 5:30 PM", rows: SEED_TEMPLATE, sections: [] };
    expect(countPages(await renderGuidePdf(d))).toBe(1);
    const game = { id: "g", kind: "game", enabled: true, title: "MatBall", subtitle: "6:35 PM in the Gym", items: ["One", "Two", "Three"] };
    expect(countPages(await renderGuidePdf({ ...d, sections: [game] }))).toBe(2);
  }, 30_000);
});
