import { describe, expect, it } from "vitest";
import { runChecks } from "../lib/checks";
import { applyTokens, resolveSchedule, setRowOverride, snapshotRows, weekScheduleRows } from "../lib/schedule";
import { findViolations, sanitizeText } from "../lib/sanitize";
import { SEED_SERIES, SEED_TEMPLATE, SEED_WEEK } from "../lib/seed";
import type { Series, Week } from "../lib/types";
import { splitPastedList } from "../components/admin/fields";
import { dateFooter, dateLong, stripTranslation } from "../lib/format";

describe("typography hygiene (8.1)", () => {
  const fix = (s: string) => sanitizeText(s).text;
  it("turns time ranges into 'to' and number ranges into hyphens", () => {
    expect(fix("6:15–7:30")).toBe("6:15 to 7:30");
    expect(fix("6:15 — 7:30 PM")).toBe("6:15 to 7:30 PM");
    expect(fix("6–7 PM")).toBe("6 to 7 PM");
    expect(fix("5–7 mins")).toBe("5-7 mins");
    expect(fix("John 15:1–8")).toBe("John 15:1-8");
  });
  it("turns prose dashes into commas", () => {
    expect(fix("Pray — then eat")).toBe("Pray, then eat");
    expect(fix("Pray—then eat")).toBe("Pray, then eat");
    expect(fix("Break! — then go")).toBe("Break! then go");
    expect(fix("Mon–Fri")).toBe("Mon-Fri");
  });
  it("straightens curly quotes from Word and Google Docs", () => {
    expect(fix("“As the Father” and Jesus’ command")).toBe('"As the Father" and Jesus\' command');
  });
  it("removes emoji, including joined and flagged ones", () => {
    expect(fix("Pizza night 🍕🔥")).toBe("Pizza night");
    expect(fix("Team 👨‍👩‍👧 time")).toBe("Team time");
    expect(fix("Go ❤️")).toBe("Go");
  });
  it("leaves clean text alone and reports what changed", () => {
    expect(sanitizeText("Doors open at 5:45.").changes).toEqual([]);
    expect(sanitizeText("it’s 5–7").changes).toEqual(["straightened curly quotes", "replaced dashes"]);
    expect(findViolations("a — b “c” 😀")).toEqual(["dash", "emoji", "curly"]);
  });
});

const series: Series = { id: 1, active: true, ...SEED_SERIES };
const baseWeek: Week = { id: 2, series_id: 1, published: false, published_at: null, updated_at: null, schedule_snapshot: null, ...SEED_WEEK };

describe("schedule template and overrides (3.6)", () => {
  it("fills {meal} so it's typed once", () => {
    const rows = weekScheduleRows(baseWeek, series);
    expect(rows.find((r) => r.id === "dinner")?.detail).toBe("Cereal bar. Focus on intentional connection time (buffer).");
    expect(applyTokens("{meal}. Focus on connection.", { meal: "", week_number: 3, series_name: "Abide" })).toBe("Focus on connection.");
  });
  it("stores only diffs, and storing the template value removes the override", () => {
    const worship = SEED_TEMPLATE.find((r) => r.id === "worship")!;
    let ov = setRowOverride({ rows: {}, added: [] }, worship, "time", "7:20 PM");
    expect(ov.rows).toEqual({ worship: { time: "7:20 PM" } });
    const resolved = resolveSchedule(SEED_TEMPLATE, ov).find((r) => r.id === "worship")!;
    expect(resolved.time).toBe("7:20 PM");
    expect(resolved.overridden).toEqual(["time"]);
    ov = setRowOverride(ov, worship, "time", "7:10 PM");
    expect(ov.rows).toEqual({});
  });
  it("hides rows and places week-only rows", () => {
    const game = SEED_TEMPLATE.find((r) => r.id === "game")!;
    const ov = setRowOverride({ rows: {}, added: [{ id: "x", after: "welcome", band: "Program", time: "6:02 PM", item: "Testimony", item_note: "", detail: "", highlight: false }] }, game, "hidden", true);
    const rows = weekScheduleRows({ ...baseWeek, schedule_overrides: ov }, series);
    expect(rows.map((r) => r.id)).not.toContain("game");
    expect(rows.map((r) => r.id).slice(2, 5)).toEqual(["welcome", "x", "dinner"]);
  });
  it("a frozen snapshot wins over later template edits", () => {
    const snap = snapshotRows(SEED_TEMPLATE, { rows: {}, added: [] });
    const edited: Series = { ...series, schedule_template: SEED_TEMPLATE.map((r) => (r.id === "worship" ? { ...r, time: "7:00 PM" } : r)) };
    expect(weekScheduleRows({ ...baseWeek, schedule_snapshot: snap }, edited).find((r) => r.id === "worship")?.time).toBe("7:10 PM");
    expect(weekScheduleRows(baseWeek, edited).find((r) => r.id === "worship")?.time).toBe("7:00 PM");
  });
});

describe("pre-publish checks (8.4)", () => {
  const prev: Week = { ...baseWeek, id: 1, week_number: 3 };
  const next: Week = { ...baseWeek, id: 2, week_number: 4, service_date: "2026-10-04" };
  it("flags last week's verse and questions", () => {
    const ids = runChecks(next, prev, series).map((w) => w.id);
    expect(ids).toContain("verse-ref");
    expect(ids).toContain("questions-all");
    expect(ids).toContain("main-idea");
  });
  it("flags single repeated questions", () => {
    const w = { ...next, theme_verse_reference: "John 15:12", small_group_questions: ["Something new?", prev.small_group_questions[2]] };
    const titles = runChecks(w, prev, series).map((x) => x.title);
    expect(titles).toContain("Question 2 repeats last week");
    expect(titles).not.toContain("Small group questions are identical to last week");
  });
  it("flags a stale week number in body text", () => {
    const w = { ...next, question_of_the_day: "What stuck with you from Week 3?" };
    expect(runChecks(w, prev, series).some((x) => x.title.startsWith('"Week 3" in Question of the Day'))).toBe(true);
  });
  it("flags dashes, emoji and curly quotes", () => {
    const w = { ...next, meal: "Tacos — 🌮" };
    expect(runChecks(w, prev, series).some((x) => x.id === "typo-Meal")).toBe(true);
  });
  it("flags at-a-glance times the schedule no longer has", () => {
    const w = { ...next, glance_rows: [{ label: "Small Group", time: "7:30 PM", detail: "" }] };
    expect(runChecks(w, prev, series).some((x) => x.title.includes("7:30 PM"))).toBe(true);
  });
  it("is quiet for a clean, fresh week", () => {
    expect(runChecks(prev, null, series)).toEqual([]);
  });
});

describe("formatting", () => {
  it("formats dates without time zone drift", () => {
    expect(dateLong("2026-09-27")).toBe("Sunday, September 27");
    expect(dateFooter("2026-09-06")).toBe("Sunday, Sep. 6th");
    expect(stripTranslation("John 15:9 (ESV)")).toBe("John 15:9");
  });
  it("splits a pasted numbered list", () => {
    expect(splitPastedList("1. First?\n2) Second\n\n• Third — really")).toEqual(["First?", "Second", "Third, really"]);
  });
});
