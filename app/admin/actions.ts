"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE_S, adminPassword, checkAdminPassword, makeAdminToken, safeNext, verifyAdminToken } from "@/lib/auth";
import { runChecks, type CheckWarning } from "@/lib/checks";
import {
  createSeries,
  createWeek,
  deleteDraftWeek,
  getPreviousWeek,
  getSeries,
  getWeek,
  listSeries,
  saveSettings,
  saveTemplate,
  saveWeek,
  setActiveSeries,
  setPublished,
  unfreezeSchedule,
  updateSeriesInfo,
} from "@/lib/data";
import type { ScheduleRow, Series, SiteSettings, Week, WeekInput } from "@/lib/types";

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token)) redirect("/admin/login");
}

function refreshAll() {
  revalidatePath("/admin", "layout");
}

// ---------- session ----------

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!adminPassword()) return { error: "ADMIN_PASSWORD is not set on the server. Add it in Vercel, then redeploy." };
  const ok = checkAdminPassword(String(form.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 700));
    return { error: "That password didn't work." };
  }
  (await cookies()).set(ADMIN_COOKIE, makeAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_S,
  });
  redirect(safeNext(String(form.get("next") ?? ""), "/admin"));
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---------- weeks ----------

export async function createWeekAction(form: FormData) {
  await requireAdmin();
  const mode = form.get("mode") === "blank" ? "blank" : "duplicate";
  const id = await createWeek(mode);
  refreshAll();
  redirect(`/admin/weeks/${id}`);
}

export type SaveResult = { ok: true; week: Week; changes: string[] } | { ok: false; error: string };

export async function saveWeekAction(id: number, input: WeekInput): Promise<SaveResult> {
  await requireAdmin();
  try {
    const { week, changes } = await saveWeek(id, input);
    refreshAll();
    return { ok: true, week, changes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save." };
  }
}

export type PublishResult =
  | { ok: true; week: Week; changes: string[] }
  | { ok: false; needsConfirm: true; warnings: CheckWarning[]; week: Week; changes: string[] }
  | { ok: false; needsConfirm?: false; error: string };

/** Saves any pending edits, runs the pre-publish checks, and publishes unless there are warnings to confirm. */
export async function publishWeekAction(id: number, input: WeekInput | null, force: boolean): Promise<PublishResult> {
  await requireAdmin();
  try {
    let changes: string[] = [];
    let week = await getWeek(id);
    if (input) ({ week, changes } = await saveWeek(id, input));
    if (!week) return { ok: false, error: "Week not found." };
    const series = await getSeries(week.series_id);
    if (!series) return { ok: false, error: "Series not found." };
    if (!force) {
      const warnings = runChecks(week, await getPreviousWeek(week), series);
      if (warnings.length) return { ok: false, needsConfirm: true, warnings, week, changes };
    }
    await setPublished(id, true);
    refreshAll();
    return { ok: true, week: { ...week, published: true }, changes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not publish." };
  }
}

export async function unpublishWeekAction(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await setPublished(id, false);
  refreshAll();
  return { ok: true };
}

export async function unpublishFormAction(form: FormData) {
  await requireAdmin();
  await setPublished(Number(form.get("id")), false);
  refreshAll();
}

export async function deleteWeekFormAction(form: FormData) {
  await requireAdmin();
  await deleteDraftWeek(Number(form.get("id")));
  refreshAll();
  redirect("/admin");
}

export async function unfreezeAction(id: number): Promise<Week | null> {
  await requireAdmin();
  await unfreezeSchedule(id);
  refreshAll();
  return getWeek(id);
}

// ---------- series ----------

export async function saveSeriesInfoAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  await updateSeriesInfo(id, name, String(form.get("reference") ?? ""));
  refreshAll();
}

export async function createSeriesAction(form: FormData) {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const id = await createSeries(name, String(form.get("reference") ?? ""));
  refreshAll();
  redirect(`/admin/series?id=${id}&created=1`);
}

/** Start a series from the week editor. Returns the refreshed series list so the editor can switch to it. */
export async function createSeriesInlineAction(
  name: string,
  reference: string,
): Promise<{ ok: true; id: number; series: Series[] } | { ok: false; error: string }> {
  await requireAdmin();
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Give the series a name." };
  const existing = await listSeries();
  if (existing.some((s) => s.name.trim().toLowerCase() === clean.toLowerCase())) {
    return { ok: false, error: `A series named "${clean}" already exists. Pick it from the list instead.` };
  }
  const id = await createSeries(clean, reference);
  refreshAll();
  return { ok: true, id, series: await listSeries() };
}

export async function setActiveSeriesAction(form: FormData) {
  await requireAdmin();
  await setActiveSeries(Number(form.get("id")));
  refreshAll();
}

export async function saveTemplateAction(seriesId: number, rows: ScheduleRow[]): Promise<{ ok: true; changes: string[]; frozen: number } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const res = await saveTemplate(seriesId, rows);
    refreshAll();
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save the template." };
  }
}

// ---------- settings ----------

export type SettingsState = { ok: boolean; message: string | null };

export async function saveSettingsAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const settings: SiteSettings = {
    leader_code: String(form.get("leader_code") ?? ""),
    footer: {
      address: String(form.get("address") ?? ""),
      contact_heading: String(form.get("contact_heading") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      org_line: String(form.get("org_line") ?? ""),
    },
  };
  const changes = await saveSettings(settings);
  refreshAll();
  return { ok: true, message: `Saved.${changes.length ? ` Also ${changes.join(", ")}.` : ""}` };
}
