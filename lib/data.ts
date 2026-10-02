// Queries and mutations. Server only.
import { db } from "./db";
import { addDays, todayCentral } from "./format";
import { normalizeOverrides, pruneOverrides, snapshotRows } from "./schedule";
import { sanitizeDeep } from "./sanitize";
import { DEFAULT_GLANCE_ROWS, DEFAULT_HERO_TAGLINE, DEFAULT_SMALL_GROUP_NOTE, DEFAULT_WELCOME_BLOCKS, SEED_FOOTER } from "./seed";
import { GLANCE_MAX, type FooterSettings, type ScheduleRow, type Series, type SiteSettings, type Week, type WeekInput } from "./types";

// ---------- settings ----------

export async function getSettings(): Promise<SiteSettings> {
  const rows = await (await db()).query<{ key: string; value: unknown }>(`select key, value from settings where key in ('leader_code', 'footer')`);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    leader_code: typeof map.leader_code === "string" ? map.leader_code : "",
    footer: { ...SEED_FOOTER, ...((map.footer as Partial<FooterSettings>) ?? {}) },
  };
}

export async function saveSettings(input: SiteSettings): Promise<string[]> {
  const { value, changes } = sanitizeDeep(input);
  const conn = await db();
  await conn.query(
    `insert into settings (key, value) values ('leader_code', $1::jsonb), ('footer', $2::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [JSON.stringify(value.leader_code.trim()), JSON.stringify(value.footer)],
  );
  return changes;
}

// ---------- series ----------

type SeriesRow = Omit<Series, "schedule_template"> & { schedule_template: ScheduleRow[] | null };
const toSeries = (r: SeriesRow): Series => ({ ...r, schedule_template: r.schedule_template ?? [] });

export async function listSeries(): Promise<Series[]> {
  const rows = await (await db()).query<SeriesRow>(`select id, name, reference, active, schedule_template from series order by created_at desc, id desc`);
  return rows.map(toSeries);
}

export async function getSeries(id: number): Promise<Series | null> {
  const rows = await (await db()).query<SeriesRow>(`select id, name, reference, active, schedule_template from series where id = $1`, [id]);
  return rows[0] ? toSeries(rows[0]) : null;
}

export async function getActiveSeries(): Promise<Series | null> {
  const rows = await (await db()).query<SeriesRow>(
    `select id, name, reference, active, schedule_template from series order by active desc, created_at desc, id desc limit 1`,
  );
  return rows[0] ? toSeries(rows[0]) : null;
}

export async function updateSeriesInfo(id: number, name: string, reference: string): Promise<string[]> {
  const { value, changes } = sanitizeDeep({ name, reference });
  await (await db()).query(`update series set name = $2, reference = $3 where id = $1`, [id, value.name, value.reference]);
  return changes;
}

export async function setActiveSeries(id: number) {
  const conn = await db();
  // Only one series is active at a time.
  await conn.query(`update series set active = false where active and id <> $1`, [id]);
  await conn.query(`update series set active = true where id = $1`, [id]);
}

/** New series, starting from a copy of the current active series' template (row ids kept, so week overrides still line up). */
export async function createSeries(name: string, reference: string): Promise<number> {
  const { value } = sanitizeDeep({ name, reference });
  const from = await getActiveSeries();
  const [row] = await (await db()).query<{ id: number }>(
    `insert into series (name, reference, active, schedule_template) values ($1, $2, false, $3::jsonb) returning id`,
    [value.name, value.reference, JSON.stringify(from?.schedule_template ?? [])],
  );
  await setActiveSeries(row.id);
  return row.id;
}

/**
 * Save a series template. Weeks in this series whose date has passed get their current schedule
 * frozen first, so the archive keeps showing the schedule those nights actually had.
 */
export async function saveTemplate(seriesId: number, template: ScheduleRow[]): Promise<{ changes: string[]; frozen: number }> {
  const { value, changes } = sanitizeDeep(template);
  const series = await getSeries(seriesId);
  if (!series) throw new Error("Series not found");
  const conn = await db();
  const past = await conn.query<{ id: number; schedule_overrides: Week["schedule_overrides"] }>(
    `select id, schedule_overrides from weeks where series_id = $1 and schedule_snapshot is null and service_date < $2::date`,
    [seriesId, todayCentral()],
  );
  const templateChanged = JSON.stringify(series.schedule_template) !== JSON.stringify(value);
  if (templateChanged) {
    for (const w of past) {
      await conn.query(`update weeks set schedule_snapshot = $2::jsonb where id = $1`, [
        w.id,
        JSON.stringify(snapshotRows(series.schedule_template, normalizeOverrides(w.schedule_overrides))),
      ]);
    }
  }
  await conn.query(`update series set schedule_template = $2::jsonb where id = $1`, [seriesId, JSON.stringify(value)]);
  return { changes, frozen: templateChanged ? past.length : 0 };
}

// ---------- weeks ----------

const WEEK_COLS = `w.id, w.series_id, w.week_number, w.service_date::text as service_date, w.hero_tagline, w.theme_verse_text,
  w.theme_verse_reference, w.main_idea, w.question_of_the_day, w.meal, w.welcome_blocks, w.glance_rows, w.schedule_overrides,
  w.schedule_snapshot, w.extra_sections, w.small_group_note, w.small_group_questions, w.published,
  w.published_at::text as published_at, w.updated_at::text as updated_at`;

function toWeek(r: Record<string, unknown>): Week {
  return {
    ...(r as unknown as Week),
    welcome_blocks: (r.welcome_blocks as Week["welcome_blocks"]) ?? [],
    glance_rows: (r.glance_rows as Week["glance_rows"]) ?? [],
    schedule_overrides: normalizeOverrides(r.schedule_overrides as Week["schedule_overrides"]),
    schedule_snapshot: (r.schedule_snapshot as Week["schedule_snapshot"]) ?? null,
    extra_sections: (r.extra_sections as Week["extra_sections"]) ?? [],
    small_group_questions: (r.small_group_questions as string[]) ?? [],
  };
}

export type WeekListItem = Week & { series_name: string; series_reference: string };

export async function listWeeks(opts: { publishedOnly?: boolean } = {}): Promise<WeekListItem[]> {
  const rows = await (await db()).query(
    `select ${WEEK_COLS}, s.name as series_name, s.reference as series_reference
     from weeks w join series s on s.id = w.series_id
     ${opts.publishedOnly ? "where w.published" : ""}
     order by w.service_date desc, w.id desc`,
  );
  return rows.map((r) => ({ ...toWeek(r), series_name: String(r.series_name), series_reference: String(r.series_reference) }));
}

export async function getWeek(id: number): Promise<Week | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await (await db()).query(`select ${WEEK_COLS} from weeks w where w.id = $1`, [id]);
  return rows[0] ? toWeek(rows[0]) : null;
}

/** The current week is the most recent published week by service date. */
export async function getCurrentWeek(): Promise<Week | null> {
  const rows = await (await db()).query(`select ${WEEK_COLS} from weeks w where w.published order by w.service_date desc, w.id desc limit 1`);
  return rows[0] ? toWeek(rows[0]) : null;
}

/** The week before this one, for stale-content checks. Prefers published weeks. */
export async function getPreviousWeek(week: Pick<Week, "id" | "service_date">): Promise<Week | null> {
  const rows = await (await db()).query(
    `select ${WEEK_COLS} from weeks w
     where w.id <> $1 and (w.service_date < $2::date or (w.service_date = $2::date and w.id < $1))
     order by w.published desc, w.service_date desc, w.id desc limit 1`,
    [week.id, week.service_date],
  );
  return rows[0] ? toWeek(rows[0]) : null;
}

export async function getLatestWeek(): Promise<Week | null> {
  const rows = await (await db()).query(`select ${WEEK_COLS} from weeks w order by w.service_date desc, w.id desc limit 1`);
  return rows[0] ? toWeek(rows[0]) : null;
}

async function insertWeek(w: WeekInput): Promise<number> {
  const [row] = await (await db()).query<{ id: number }>(
    `insert into weeks (series_id, week_number, service_date, hero_tagline, theme_verse_text, theme_verse_reference, main_idea,
       question_of_the_day, meal, welcome_blocks, glance_rows, schedule_overrides, extra_sections, small_group_note, small_group_questions)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15::jsonb) returning id`,
    [
      w.series_id,
      w.week_number,
      w.service_date,
      w.hero_tagline,
      w.theme_verse_text,
      w.theme_verse_reference,
      w.main_idea,
      w.question_of_the_day,
      w.meal,
      JSON.stringify(w.welcome_blocks),
      JSON.stringify(w.glance_rows),
      JSON.stringify(w.schedule_overrides),
      JSON.stringify(w.extra_sections),
      w.small_group_note,
      JSON.stringify(w.small_group_questions),
    ],
  );
  return row.id;
}

/**
 * "Duplicate last week" (blueprint 4.3): carries the schedule, welcome blocks and at-a-glance;
 * clears the verse, main idea, Question of the Day, meal and small group questions.
 * Optional sections come along switched off, so last week's game never publishes by accident.
 *
 * "New week" starts from the plain template instead, keeping only the rarely-changing welcome
 * blocks and at-a-glance, which default to the previous week's values (blueprint 3.4).
 */
export async function createWeek(mode: "duplicate" | "blank"): Promise<number> {
  const last = await getLatestWeek();
  const active = await getActiveSeries();
  if (!active) throw new Error("Create a series first.");
  const sameSeries = last && last.series_id === active.id;
  const today = todayCentral();
  const nextDate = last ? addDays(last.service_date, 7) : today;

  const input: WeekInput = {
    series_id: active.id,
    week_number: sameSeries ? last.week_number + 1 : 1,
    service_date: nextDate,
    hero_tagline: last?.hero_tagline ?? DEFAULT_HERO_TAGLINE,
    theme_verse_text: "",
    theme_verse_reference: "",
    main_idea: "",
    question_of_the_day: "",
    meal: "",
    welcome_blocks: last?.welcome_blocks.length ? last.welcome_blocks : DEFAULT_WELCOME_BLOCKS,
    glance_rows: last?.glance_rows.length ? last.glance_rows : DEFAULT_GLANCE_ROWS,
    schedule_overrides:
      mode === "duplicate" && last ? pruneOverrides(active.schedule_template, last.schedule_overrides) : { rows: {}, added: [] },
    extra_sections: mode === "duplicate" && last ? last.extra_sections.map((s) => ({ ...s, enabled: false })) : [],
    small_group_note: last?.small_group_note ?? DEFAULT_SMALL_GROUP_NOTE,
    small_group_questions: [],
  };
  return insertWeek(input);
}

/** Normalize and sanitize editor input before it touches the database. */
export function cleanWeekInput(input: WeekInput): { value: WeekInput; changes: string[] } {
  const { value, changes } = sanitizeDeep(input);
  value.week_number = Math.max(0, Math.round(Number(value.week_number) || 0));
  value.series_id = Number(value.series_id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.service_date)) throw new Error("Service date is missing.");
  value.glance_rows = value.glance_rows.slice(0, GLANCE_MAX); // hard cap (blueprint 3.5)
  value.welcome_blocks = value.welcome_blocks.map((b) => ({ heading: b.heading, body: b.body, callouts: Boolean(b.callouts) }));
  value.small_group_questions = value.small_group_questions.filter((q) => q.trim());
  value.extra_sections = value.extra_sections.map((s) => ({ ...s, enabled: Boolean(s.enabled), items: s.items.filter((i) => i.trim()) }));
  return { value, changes };
}

export async function saveWeek(id: number, input: WeekInput): Promise<{ week: Week; changes: string[] }> {
  const { value: w, changes } = cleanWeekInput(input);
  const series = await getSeries(w.series_id);
  if (!series) throw new Error("Series not found");
  w.schedule_overrides = pruneOverrides(series.schedule_template, w.schedule_overrides);
  await (await db()).query(
    `update weeks set series_id=$2, week_number=$3, service_date=$4, hero_tagline=$5, theme_verse_text=$6, theme_verse_reference=$7,
       main_idea=$8, question_of_the_day=$9, meal=$10, welcome_blocks=$11::jsonb, glance_rows=$12::jsonb, schedule_overrides=$13::jsonb,
       extra_sections=$14::jsonb, small_group_note=$15, small_group_questions=$16::jsonb, updated_at=now()
     where id=$1`,
    [
      id,
      w.series_id,
      w.week_number,
      w.service_date,
      w.hero_tagline,
      w.theme_verse_text,
      w.theme_verse_reference,
      w.main_idea,
      w.question_of_the_day,
      w.meal,
      JSON.stringify(w.welcome_blocks),
      JSON.stringify(w.glance_rows),
      JSON.stringify(w.schedule_overrides),
      JSON.stringify(w.extra_sections),
      w.small_group_note,
      JSON.stringify(w.small_group_questions),
    ],
  );
  const week = await getWeek(id);
  if (!week) throw new Error("Week not found");
  return { week, changes };
}

export async function setPublished(id: number, published: boolean) {
  await (await db()).query(
    `update weeks set published = $2, published_at = case when $2 then coalesce(published_at, now()) else published_at end, updated_at = now() where id = $1`,
    [id, published],
  );
}

/** Drop a frozen schedule so the week follows the series template (plus its overrides) again. */
export async function unfreezeSchedule(id: number) {
  await (await db()).query(`update weeks set schedule_snapshot = null, updated_at = now() where id = $1`, [id]);
}

/** Only drafts can be deleted; published weeks are the archive. */
export async function deleteDraftWeek(id: number): Promise<boolean> {
  const rows = await (await db()).query(`delete from weeks where id = $1 and not published returning id`, [id]);
  return rows.length > 0;
}

export type GuideData = { week: Week; series: Series; settings: SiteSettings };

export async function loadGuide(week: Week | null): Promise<GuideData | null> {
  if (!week) return null;
  const [series, settings] = await Promise.all([getSeries(week.series_id), getSettings()]);
  if (!series) return null;
  return { week, series, settings };
}
