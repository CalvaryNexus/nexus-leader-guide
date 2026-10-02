// Content model. Mirrors Section 3 of the blueprint.

/** One row of the Run of Night table. `band` is the section header the row sits under (Setup / Program / Close). */
export type ScheduleRow = {
  id: string;
  band: string;
  time: string;
  item: string;
  item_note: string;
  detail: string;
  highlight: boolean;
};

export type ScheduleField = "time" | "item" | "item_note" | "detail" | "highlight";
export const SCHEDULE_FIELDS: ScheduleField[] = ["time", "item", "item_note", "detail", "highlight"];

/** A week's diff against one template row. Only the fields that differ are stored. */
export type RowOverride = Partial<Pick<ScheduleRow, ScheduleField>> & { hidden?: boolean };

/** A row that exists for this week only, placed after template row `after` (null = top). */
export type AddedRow = ScheduleRow & { after: string | null };

/** Everything a week stores about its schedule: diffs only, never a full copy. */
export type ScheduleOverrides = {
  rows: Record<string, RowOverride>;
  added: AddedRow[];
};

export type WelcomeBlock = {
  heading: string;
  body: string;
  /** Show the Question of the Day and Meal callout cards under this block. */
  callouts: boolean;
};

export type GlanceRow = { label: string; time: string; detail: string };

/** Generic optional section (game rules, testimony, special guest, serve project...). */
export type ExtraSection = {
  id: string;
  kind: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  items: string[];
};

export type Series = {
  id: number;
  name: string;
  reference: string;
  active: boolean;
  schedule_template: ScheduleRow[];
};

export type Week = {
  id: number;
  series_id: number;
  week_number: number;
  service_date: string; // YYYY-MM-DD
  hero_tagline: string;
  theme_verse_text: string;
  theme_verse_reference: string;
  main_idea: string;
  question_of_the_day: string;
  meal: string;
  welcome_blocks: WelcomeBlock[];
  glance_rows: GlanceRow[];
  schedule_overrides: ScheduleOverrides;
  /** Set when the series template changed after this week's date, so the archive keeps the schedule it actually had. */
  schedule_snapshot: ScheduleRow[] | null;
  extra_sections: ExtraSection[];
  small_group_note: string;
  small_group_questions: string[];
  published: boolean;
  published_at: string | null;
  updated_at: string | null;
};

/** Fields an admin edits in the week editor. */
export type WeekInput = Omit<Week, "id" | "published" | "published_at" | "updated_at" | "schedule_snapshot">;

export type FooterSettings = {
  address: string;
  contact_heading: string;
  email: string;
  phone: string;
  org_line: string;
};

export type SiteSettings = {
  leader_code: string;
  footer: FooterSettings;
};

export const GLANCE_MAX = 4;
