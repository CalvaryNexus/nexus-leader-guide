// Schedule = series template + per-week diffs (blueprint 3.6).
import {
  SCHEDULE_FIELDS,
  type AddedRow,
  type RowOverride,
  type ScheduleField,
  type ScheduleOverrides,
  type ScheduleRow,
  type Series,
  type Week,
} from "./types";

export const EMPTY_OVERRIDES: ScheduleOverrides = { rows: {}, added: [] };

export type ResolvedRow = ScheduleRow & {
  source: "template" | "added";
  /** Fields on a template row that this week overrides. */
  overridden: ScheduleField[];
  hidden: boolean;
  after?: string | null;
};

export function normalizeOverrides(ov: Partial<ScheduleOverrides> | null | undefined): ScheduleOverrides {
  return { rows: { ...(ov?.rows ?? {}) }, added: [...(ov?.added ?? [])] };
}

/** Template rows with this week's overrides applied, plus week-only rows in position. Includes hidden rows. */
export function resolveSchedule(template: ScheduleRow[], overrides: ScheduleOverrides | null | undefined): ResolvedRow[] {
  const ov = normalizeOverrides(overrides);
  const templateIds = new Set(template.map((r) => r.id));
  const addedAfter = (id: string | null) => ov.added.filter((a) => a.after === id);
  const toResolved = (a: AddedRow): ResolvedRow => ({ ...a, source: "added", overridden: [], hidden: false });

  const out: ResolvedRow[] = addedAfter(null).map(toResolved);
  for (const row of template) {
    const o: RowOverride = ov.rows[row.id] ?? {};
    const overridden = SCHEDULE_FIELDS.filter((f) => f in o && o[f] !== undefined && o[f] !== row[f]);
    out.push({
      ...row,
      ...Object.fromEntries(overridden.map((f) => [f, o[f]])),
      source: "template",
      overridden,
      hidden: Boolean(o.hidden),
    });
    out.push(...addedAfter(row.id).map(toResolved));
  }
  // Week-only rows whose anchor row was deleted from the template go at the end.
  out.push(...ov.added.filter((a) => a.after !== null && !templateIds.has(a.after)).map(toResolved));
  return out;
}

/** Set one field of a template row for this week. Storing the template's own value removes the override. */
export function setRowOverride(
  overrides: ScheduleOverrides,
  templateRow: ScheduleRow,
  field: ScheduleField | "hidden",
  value: string | boolean,
): ScheduleOverrides {
  const ov = normalizeOverrides(overrides);
  const cur: RowOverride = { ...(ov.rows[templateRow.id] ?? {}) };
  const isDefault = field === "hidden" ? value === false : templateRow[field] === value;
  if (isDefault) delete (cur as Record<string, unknown>)[field];
  else (cur as Record<string, unknown>)[field] = value;
  if (Object.keys(cur).length) ov.rows[templateRow.id] = cur;
  else delete ov.rows[templateRow.id];
  return ov;
}

export function resetRowOverride(overrides: ScheduleOverrides, rowId: string): ScheduleOverrides {
  const ov = normalizeOverrides(overrides);
  delete ov.rows[rowId];
  return ov;
}

/** Drop overrides that point at rows no longer in the template, or that equal the template value. */
export function pruneOverrides(template: ScheduleRow[], overrides: ScheduleOverrides): ScheduleOverrides {
  const ov = normalizeOverrides(overrides);
  const byId = new Map(template.map((r) => [r.id, r]));
  const rows: Record<string, RowOverride> = {};
  for (const [id, o] of Object.entries(ov.rows)) {
    const t = byId.get(id);
    if (!t) continue;
    const kept: RowOverride = {};
    for (const f of SCHEDULE_FIELDS) if (f in o && o[f] !== undefined && o[f] !== t[f]) (kept as Record<string, unknown>)[f] = o[f];
    if (o.hidden) kept.hidden = true;
    if (Object.keys(kept).length) rows[id] = kept;
  }
  return { rows, added: ov.added };
}

export type TokenValues = { meal: string; week_number: number | string; series_name: string };

/** Simple token substitution so values typed once flow into the schedule: {meal}, {week_number}, {series_name}. */
export function applyTokens(text: string, values: TokenValues): string {
  let emptied = false;
  const out = text.replace(/\{\s*(meal|week_number|series_name)\s*\}/gi, (_m, key: string) => {
    const v = String(values[key.toLowerCase() as keyof TokenValues] ?? "").trim();
    if (!v) emptied = true;
    return v;
  });
  // "{meal}. Focus on..." with no meal entered should not render as ". Focus on...".
  return emptied ? out.replace(/^[\s.,;:]+/, "").replace(/[ \t]{2,}/g, " ") : out;
}

/** The rows leaders see for a week: frozen snapshot if one exists, otherwise template + overrides. Hidden rows removed, tokens filled. */
export function weekScheduleRows(week: Pick<Week, "schedule_snapshot" | "schedule_overrides" | "meal" | "week_number">, series: Pick<Series, "schedule_template" | "name">): ScheduleRow[] {
  const rows = week.schedule_snapshot ?? resolveSchedule(series.schedule_template, week.schedule_overrides).filter((r) => !r.hidden);
  const values: TokenValues = { meal: week.meal, week_number: week.week_number, series_name: series.name };
  return rows.map((r) => ({
    id: r.id,
    band: r.band,
    time: applyTokens(r.time, values),
    item: applyTokens(r.item, values),
    item_note: applyTokens(r.item_note, values),
    detail: applyTokens(r.detail, values),
    highlight: r.highlight,
  }));
}

/** Snapshot for freezing a past week: the visible rows with tokens left in place (meal may still be edited). */
export function snapshotRows(template: ScheduleRow[], overrides: ScheduleOverrides): ScheduleRow[] {
  return resolveSchedule(template, overrides)
    .filter((r) => !r.hidden)
    .map(({ id, band, time, item, item_note, detail, highlight }) => ({ id, band, time, item, item_note, detail, highlight }));
}

export function newRowId(): string {
  return Math.random().toString(36).slice(2, 10);
}
