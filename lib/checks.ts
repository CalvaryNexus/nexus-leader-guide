// Pre-publish checks (blueprint 8.4). Warnings, never hard blocks: Tanner sometimes repeats a question on purpose.
import { applyTokens, weekScheduleRows } from "./schedule";
import { findViolations, type ViolationKind } from "./sanitize";
import { stripTranslation } from "./format";
import type { Series, Week, WeekInput } from "./types";

export type CheckWarning = { id: string; title: string; detail: string };

type CheckedWeek = WeekInput & { schedule_snapshot?: Week["schedule_snapshot"] };

const norm = (s: string) => (s ?? "").toLowerCase().replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
const normRef = (s: string) => norm(stripTranslation(s)).replace(/\s+/g, "");
const clip = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 3).trimEnd()}...` : s);

/** Every piece of leader-facing text on the week, labelled with where it lives. */
function textFields(w: CheckedWeek, series: Series): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, text: string) => text?.trim() && out.push({ where, text });
  add("Hero line", w.hero_tagline);
  add("Theme verse", w.theme_verse_text);
  add("Verse reference", w.theme_verse_reference);
  add("Main idea", w.main_idea);
  add("Question of the Day", w.question_of_the_day);
  add("Meal", w.meal);
  w.welcome_blocks.forEach((b, i) => {
    add(`Welcome block ${i + 1} heading`, b.heading);
    add(`Welcome block ${i + 1}`, b.body);
  });
  w.glance_rows.forEach((r, i) => add(`At a glance row ${i + 1}`, [r.label, r.time, r.detail].join(" | ")));
  for (const r of weekScheduleRows({ ...w, schedule_snapshot: w.schedule_snapshot ?? null }, series)) {
    add(`Schedule ${r.time || "row"}`, [r.item, r.item_note, r.detail].filter(Boolean).join(" | "));
  }
  w.extra_sections
    .filter((s) => s.enabled)
    .forEach((s) => {
      add(`${s.title || "Optional section"} title`, s.title);
      add(`${s.title || "Optional section"} subtitle`, s.subtitle);
      s.items.forEach((it, i) => add(`${s.title || "Optional section"} item ${i + 1}`, it));
    });
  add("Small group note", w.small_group_note);
  w.small_group_questions.forEach((q, i) => add(`Question ${i + 1}`, q));
  return out;
}

const VIOLATION_LABEL: Record<ViolationKind, string> = {
  dash: "em or en dash",
  emoji: "emoji",
  curly: "curly quotes",
};

export function runChecks(w: CheckedWeek, prev: Week | null, series: Series): CheckWarning[] {
  const warnings: CheckWarning[] = [];
  const fields = textFields(w, series);

  // 1. "Week N" that doesn't match this week's number.
  for (const f of fields) {
    const text = applyTokens(f.text, { meal: w.meal, week_number: w.week_number, series_name: series.name });
    for (const m of text.matchAll(/\bweek\s*#?\s*(\d+)\b/gi)) {
      if (Number(m[1]) !== Number(w.week_number)) {
        warnings.push({
          id: `weeknum-${f.where}-${m.index}`,
          title: `"${m[0]}" in ${f.where}`,
          detail: `This is Week ${w.week_number}. Possibly left over from an earlier week: "${clip(text)}"`,
        });
      }
    }
  }

  if (prev) {
    const prevLabel = `last week (Week ${prev.week_number})`;
    // 2. Same theme verse reference as last week.
    if (w.theme_verse_reference.trim() && normRef(w.theme_verse_reference) === normRef(prev.theme_verse_reference)) {
      warnings.push({ id: "verse-ref", title: "Theme verse reference matches last week", detail: `${w.theme_verse_reference} was also the verse for ${prevLabel}.` });
    }
    // Same verse text / main idea / QotD / meal: the same leftover failure, so flag them too.
    const same: [string, string, string][] = [
      ["verse-text", "Theme verse", w.theme_verse_text],
      ["main-idea", "Main idea", w.main_idea],
      ["qotd", "Question of the Day", w.question_of_the_day],
      ["meal", "Meal", w.meal],
    ];
    const prevVals: Record<string, string> = {
      "verse-text": prev.theme_verse_text,
      "main-idea": prev.main_idea,
      qotd: prev.question_of_the_day,
      meal: prev.meal,
    };
    for (const [id, label, val] of same) {
      if (val.trim() && norm(val) === norm(prevVals[id])) {
        warnings.push({ id, title: `${label} is the same as last week`, detail: `"${clip(val)}" was also used ${prevLabel}.` });
      }
    }

    // 3. Small group questions identical to last week.
    const cur = w.small_group_questions.filter((q) => q.trim()).map(norm);
    const old = prev.small_group_questions.filter((q) => q.trim()).map(norm);
    if (cur.length && cur.length === old.length && cur.every((q, i) => q === old[i])) {
      warnings.push({ id: "questions-all", title: "Small group questions are identical to last week", detail: `All ${cur.length} questions match ${prevLabel}.` });
    } else {
      const oldSet = new Set(old);
      cur.forEach((q, i) => {
        if (oldSet.has(q)) {
          warnings.push({ id: `question-${i}`, title: `Question ${i + 1} repeats last week`, detail: `"${clip(w.small_group_questions.filter((x) => x.trim())[i])}" was also asked ${prevLabel}.` });
        }
      });
    }
  }

  // 4. Typography: dashes, emoji, curly quotes.
  for (const f of fields) {
    const kinds = findViolations(f.text);
    if (kinds.length) {
      warnings.push({
        id: `typo-${f.where}`,
        title: `${kinds.map((k) => VIOLATION_LABEL[k]).join(", ")} in ${f.where}`,
        detail: `Saving fixes this automatically: "${clip(f.text)}"`,
      });
    }
  }

  // Times quoted outside the schedule that the schedule no longer has (e.g. worship moved 7:20 to 7:10).
  const scheduleTimes = new Set(weekScheduleRows({ ...w, schedule_snapshot: w.schedule_snapshot ?? null }, series).map((r) => normTime(r.time)));
  if (scheduleTimes.size) {
    const timeSources: { where: string; text: string }[] = [
      { where: "Hero line", text: w.hero_tagline },
      ...w.glance_rows.map((r, i) => ({ where: `At a glance row ${i + 1} (${r.label})`, text: r.time })),
      { where: "Small group note", text: w.small_group_note },
    ];
    for (const s of timeSources) {
      for (const m of (s.text ?? "").matchAll(/\b\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\b/g)) {
        if (!scheduleTimes.has(normTime(m[0]))) {
          warnings.push({ id: `time-${s.where}-${m.index}`, title: `${m[0]} in ${s.where} is not in tonight's schedule`, detail: "The Run of Night may have moved. Check that this time is still right." });
        }
      }
    }
  }

  // Missing essentials.
  if (!w.theme_verse_text.trim()) warnings.push({ id: "empty-verse", title: "No theme verse", detail: "The theme verse band will only show the main idea." });
  if (!w.main_idea.trim()) warnings.push({ id: "empty-main-idea", title: "No main idea", detail: "The half-sheet will print without a main idea." });
  if (!w.small_group_questions.some((q) => q.trim())) warnings.push({ id: "empty-questions", title: "No small group questions", detail: "The Small Group Questions section will not appear." });

  return warnings;
}

function normTime(t: string): string {
  const m = /(\d{1,2}):(\d{2})\s*([AaPp])?/.exec(t ?? "");
  return m ? `${Number(m[1])}:${m[2]}${(m[3] ?? "").toLowerCase()}` : norm(t);
}
