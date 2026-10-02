"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { publishWeekAction, saveWeekAction, unfreezeAction, unpublishWeekAction } from "@/app/admin/actions";
import { runChecks, type CheckWarning } from "@/lib/checks";
import { dateLong } from "@/lib/format";
import { buildGuideView, renderGuideDocument } from "@/lib/render/guide";
import { newRowId } from "@/lib/schedule";
import { GLANCE_MAX, type ExtraSection, type FooterSettings, type Series, type Week, type WeekInput } from "@/lib/types";
import { Group, ItemList, TextField } from "./fields";
import { PreviewPane } from "./PreviewPane";
import { ScheduleEditor } from "./ScheduleEditor";

function toInput(w: Week): WeekInput {
  return {
    series_id: w.series_id,
    week_number: w.week_number,
    service_date: w.service_date,
    hero_tagline: w.hero_tagline,
    theme_verse_text: w.theme_verse_text,
    theme_verse_reference: w.theme_verse_reference,
    main_idea: w.main_idea,
    question_of_the_day: w.question_of_the_day,
    meal: w.meal,
    welcome_blocks: w.welcome_blocks,
    glance_rows: w.glance_rows,
    schedule_overrides: w.schedule_overrides,
    extra_sections: w.extra_sections,
    small_group_note: w.small_group_note,
    small_group_questions: w.small_group_questions,
  };
}

const SECTION_KINDS: Record<string, { label: string; title: string; subtitle: string; noun: string }> = {
  game: { label: "Large group game", title: "Game name, e.g. MatBall", subtitle: "When and where, e.g. 6:35 PM in the Gym", noun: "rule" },
  testimony: { label: "Testimony", title: "e.g. Testimony", subtitle: "Who and when", noun: "note" },
  guest: { label: "Special guest", title: "e.g. Special Guest", subtitle: "Who and when", noun: "note" },
  serve: { label: "Serve project", title: "e.g. Serve Project", subtitle: "When and where", noun: "step" },
  custom: { label: "Other", title: "Section title", subtitle: "Optional subtitle", noun: "item" },
};

type Props = {
  initialWeek: Week;
  seriesList: Series[];
  prevWeek: Week | null;
  footer: FooterSettings;
  isLive: boolean;
  autoPublish: boolean;
};

export function WeekEditor({ initialWeek, seriesList, prevWeek, footer, isLive, autoPublish }: Props) {
  const id = initialWeek.id;
  const [form, setForm] = useState<WeekInput>(() => toInput(initialWeek));
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(toInput(initialWeek)));
  const [published, setPublished] = useState(initialWeek.published);
  const [snapshot, setSnapshot] = useState(initialWeek.schedule_snapshot);
  const [busy, setBusy] = useState<null | "save" | "publish" | "unpublish">(null);
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const [dialog, setDialog] = useState<CheckWarning[] | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [newKind, setNewKind] = useState("game");
  const formRef = useRef(form);
  formRef.current = form;
  const barRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(form) !== savedJson;

  const series = seriesList.find((s) => s.id === Number(form.series_id)) ?? seriesList[0];

  // ---- live preview and checks (deferred so typing stays snappy) ----
  const weekLike = useMemo<Week>(() => ({ ...initialWeek, ...form, published, schedule_snapshot: snapshot }), [initialWeek, form, published, snapshot]);
  const deferredWeek = useDeferredValue(weekLike);
  const html = useMemo(
    () => renderGuideDocument(buildGuideView(deferredWeek, series, { footer }), { mode: "preview", archiveHref: "/archive" }),
    [deferredWeek, series, footer],
  );
  const warnings = useMemo(() => runChecks(deferredWeek, prevWeek, series), [deferredWeek, prevWeek, series]);

  const set = <K extends keyof WeekInput>(k: K, v: WeekInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const showToast = useCallback((msg: string, bad = false) => {
    setToast({ msg, bad });
    window.setTimeout(() => setToast((t) => (t?.msg === msg ? null : t)), bad ? 6000 : 3200);
  }, []);

  const apply = useCallback((w: Week, sentJson: string) => {
    const serverInput = toInput(w);
    // Don't clobber anything typed while the request was in flight.
    if (JSON.stringify(formRef.current) === sentJson) setForm(serverInput);
    setSavedJson(JSON.stringify(serverInput));
    setPublished(w.published);
    setSnapshot(w.schedule_snapshot);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const sent = JSON.stringify(formRef.current);
    setBusy("save");
    const res = await saveWeekAction(id, formRef.current);
    setBusy(null);
    if (!res.ok) {
      showToast(res.error, true);
      return false;
    }
    apply(res.week, sent);
    showToast(res.changes.length ? `Saved. Also ${res.changes.join(", ")}.` : published ? "Saved. Leaders see the update now." : "Saved.");
    return true;
  }, [id, apply, showToast, published]);

  const publish = useCallback(
    async (force: boolean) => {
      const sent = JSON.stringify(formRef.current);
      setBusy("publish");
      const res = await publishWeekAction(id, sent !== savedJson ? formRef.current : null, force);
      setBusy(null);
      if (res.ok) {
        apply(res.week, sent);
        setDialog(null);
        showToast("Published. Leaders can see this week now.");
      } else if (res.needsConfirm) {
        apply(res.week, sent);
        setDialog(res.warnings);
      } else {
        showToast(res.error, true);
      }
    },
    [id, savedJson, apply, showToast],
  );

  const unpublish = async () => {
    if (!window.confirm("Unpublish this week? Leaders will no longer see it.")) return;
    setBusy("unpublish");
    await unpublishWeekAction(id);
    setBusy(null);
    setPublished(false);
    showToast("Unpublished.");
  };

  /** Open a saved-version page (preview, PDFs). Saves first so it matches the editor. */
  const openSaved = async (url: string) => {
    if (!dirty) {
      window.open(url, "_blank", "noopener");
      return;
    }
    const w = window.open("about:blank", "_blank");
    if (await save()) {
      if (w) w.location.href = url;
      else window.open(url, "_blank", "noopener");
    } else w?.close();
  };

  // Cmd/Ctrl+S saves; warn before leaving with unsaved edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!busy) void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(formRef.current) !== savedJson) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [save, busy, savedJson]);

  // Publish straight from the week list (?publish=1).
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoPublish && !autoRan.current && !initialWeek.published) {
      autoRan.current = true;
      window.history.replaceState(null, "", `/admin/weeks/${id}`);
      void publish(false);
    }
  }, [autoPublish, initialWeek.published, id, publish]);

  // Sticky offsets depend on the editor bar's height.
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--ed-bar-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- list helpers ----
  const moveIn = <T,>(arr: T[], i: number, d: number): T[] => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    const a = [...arr];
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  };

  const secondary = (
    <>
      <button type="button" className="btn quiet sm" onClick={() => void openSaved(`/preview/${id}`)}>
        Open preview &#8599;
      </button>
      <button type="button" className="btn quiet sm" onClick={() => void openSaved(`/weeks/${id}/small-group.pdf`)}>
        Half-sheet
      </button>
      <button type="button" className="btn quiet sm" onClick={() => void openSaved(`/weeks/${id}/guide.pdf`)}>
        Guide PDF
      </button>
    </>
  );

  const statusPill = published ? (
    isLive ? <span className="pill live">Live now</span> : <span className="pill pub">Published</span>
  ) : (
    <span className="pill draft">Draft</span>
  );

  return (
    <>
      <div className="ed-bar" ref={barRef}>
        <a className="back" href="/admin">
          &larr; Weeks
        </a>
        <span className="title">
          {series?.name} &bull; Week {form.week_number}
        </span>
        <span className="state">
          {statusPill}
          {dirty ? (
            <>
              <span className="dirty-dot" aria-hidden /> <span className="saved-note">Unsaved changes</span>
            </>
          ) : (
            <span className="saved-note clean">All changes saved</span>
          )}
        </span>
        <div className="ed-tabs" role="group" aria-label="Editor view">
          <button type="button" aria-pressed={view === "edit"} onClick={() => setView("edit")}>
            Edit
          </button>
          <button type="button" aria-pressed={view === "preview"} onClick={() => setView("preview")}>
            Preview
          </button>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost sm" onClick={() => void save()} disabled={!dirty || busy !== null}>
            {busy === "save" ? "Saving..." : "Save"}
          </button>
          <span className="hide-sm btn-row" style={{ gap: 6 }}>
            {secondary}
          </span>
          {published ? (
            <button type="button" className="btn ghost sm" onClick={() => void unpublish()} disabled={busy !== null}>
              Unpublish
            </button>
          ) : (
            <button type="button" className="btn ok sm" onClick={() => void publish(false)} disabled={busy !== null}>
              {busy === "publish" ? "Checking..." : "Publish"}
            </button>
          )}
        </div>
      </div>

      <div className={`ed-layout${view === "preview" ? " show-preview" : ""}`}>
        <div className="ed-form">
          <div className="ed-form-inner">
            <div className="show-sm ed-more">{secondary}</div>
            {warnings.length > 0 ? (
              <details className="checks">
                <summary>
                  {warnings.length} thing{warnings.length === 1 ? "" : "s"} to check before publishing
                </summary>
                <ul>
                  {warnings.map((w) => (
                    <li key={w.id}>
                      <b>{w.title}</b>
                      <span>{w.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <details className="checks clear">
                <summary>Pre-publish checks: nothing stale found.</summary>
              </details>
            )}

            {/* 1. Week basics */}
            <Group n={1} id="g-basics" title="Week basics">
              <div className="field-grid basics">
                <label className="field">
                  <span className="label">Series</span>
                  <select className="select" value={form.series_id} onChange={(e) => set("series_id", Number(e.target.value))}>
                    {seriesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.reference ? ` (${s.reference})` : ""}
                        {s.active ? "" : " (inactive)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Week number</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.week_number}
                    onChange={(e) => set("week_number", e.target.value === "" ? 0 : Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span className="label">Service date</span>
                  <input className="input" type="date" value={form.service_date} onChange={(e) => set("service_date", e.target.value)} required />
                </label>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <span className="label">Hero line</span>
                <div className="hero-line">
                  <span className="date-part">{dateLong(form.service_date) || "Date"} &bull;</span>
                  <TextField value={form.hero_tagline} onChange={(v) => set("hero_tagline", v)} ariaLabel="Hero line" placeholder="Leaders arrive 5:30 PM" />
                </div>
                <span className="hint">The weekday and date come from the service date.</span>
              </div>
            </Group>

            {/* 2. Theme verse and main idea */}
            <Group n={2} id="g-verse" title="Theme verse and main idea">
              <TextField
                label="Theme verse"
                multiline
                big
                value={form.theme_verse_text}
                onChange={(v) => set("theme_verse_text", v)}
                hint="Shown in large capitals on the navy band."
              />
              <div className="field-grid two" style={{ marginTop: 14 }}>
                <TextField label="Reference" value={form.theme_verse_reference} onChange={(v) => set("theme_verse_reference", v)} placeholder="John 15:9 (ESV)" />
              </div>
              <div style={{ marginTop: 14 }}>
                <TextField label="Main idea" multiline value={form.main_idea} onChange={(v) => set("main_idea", v)} hint="Follows a bold &quot;Main idea:&quot; label. Also prints on the half-sheet." />
              </div>
            </Group>

            {/* 3. Question of the Day and meal */}
            <Group n={3} id="g-qotd" title="Question of the Day and meal">
              <TextField label="Question of the Day" multiline value={form.question_of_the_day} onChange={(v) => set("question_of_the_day", v)} />
              <div style={{ marginTop: 14 }}>
                <TextField
                  label="Meal"
                  value={form.meal}
                  onChange={(v) => set("meal", v)}
                  placeholder="Cereal bar"
                  hint={
                    <>
                      Also fills <code>{"{meal}"}</code> in the 6:03 schedule row, so it is only typed once.
                    </>
                  }
                />
              </div>
            </Group>

            {/* 4. Welcome blocks */}
            <Group n={4} id="g-welcome" title="Welcome blocks" carry hint="Left column at the top of the guide. These carry over from last week, so edit only when something changes.">
              {form.welcome_blocks.map((b, i) => (
                <div className="block-card" key={i}>
                  <div className="block-head">
                    <span className="label">Block {i + 1}</span>
                    <span className="btn-row">
                      <button type="button" className="icon-btn" disabled={i === 0} onClick={() => set("welcome_blocks", moveIn(form.welcome_blocks, i, -1))} aria-label="Move block up">
                        &uarr;
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={i === form.welcome_blocks.length - 1}
                        onClick={() => set("welcome_blocks", moveIn(form.welcome_blocks, i, 1))}
                        aria-label="Move block down"
                      >
                        &darr;
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => set("welcome_blocks", form.welcome_blocks.filter((_, x) => x !== i))}
                        aria-label="Remove block"
                      >
                        &times;
                      </button>
                    </span>
                  </div>
                  <TextField
                    label="Heading"
                    value={b.heading}
                    onChange={(v) => set("welcome_blocks", form.welcome_blocks.map((x, xi) => (xi === i ? { ...x, heading: v } : x)))}
                  />
                  <div style={{ marginTop: 12 }}>
                    <TextField
                      label="Body"
                      multiline
                      value={b.body}
                      onChange={(v) => set("welcome_blocks", form.welcome_blocks.map((x, xi) => (xi === i ? { ...x, body: v } : x)))}
                      hint="Leave a blank line between paragraphs. **Double asterisks** for bold."
                    />
                  </div>
                  <label className="check" style={{ marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={b.callouts}
                      onChange={(e) => set("welcome_blocks", form.welcome_blocks.map((x, xi) => ({ ...x, callouts: xi === i ? e.target.checked : e.target.checked ? false : x.callouts })))}
                    />
                    Show the Question of the Day and Meal cards under this block
                  </label>
                </div>
              ))}
              <div className="list-foot">
                <button type="button" className="btn ghost sm" onClick={() => set("welcome_blocks", [...form.welcome_blocks, { heading: "", body: "", callouts: false }])}>
                  + Add block
                </button>
              </div>
            </Group>

            {/* 5. At a glance */}
            <Group n={5} id="g-glance" title="At a glance" carry hint="The blue panel beside the welcome. Four rows at most: the full schedule sits right below it.">
              {form.glance_rows.map((r, i) => (
                <div className="glance-row" key={i}>
                  <TextField
                    label="Label"
                    value={r.label}
                    onChange={(v) => set("glance_rows", form.glance_rows.map((x, xi) => (xi === i ? { ...x, label: v } : x)))}
                  />
                  <TextField label="Time" value={r.time} onChange={(v) => set("glance_rows", form.glance_rows.map((x, xi) => (xi === i ? { ...x, time: v } : x)))} />
                  <TextField
                    label="Detail"
                    value={r.detail}
                    onChange={(v) => set("glance_rows", form.glance_rows.map((x, xi) => (xi === i ? { ...x, detail: v } : x)))}
                  />
                  <span className="tools">
                    <button type="button" className="icon-btn" disabled={i === 0} onClick={() => set("glance_rows", moveIn(form.glance_rows, i, -1))} aria-label="Move row up">
                      &uarr;
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={i === form.glance_rows.length - 1}
                      onClick={() => set("glance_rows", moveIn(form.glance_rows, i, 1))}
                      aria-label="Move row down"
                    >
                      &darr;
                    </button>
                    <button type="button" className="icon-btn danger" onClick={() => set("glance_rows", form.glance_rows.filter((_, x) => x !== i))} aria-label="Remove row">
                      &times;
                    </button>
                  </span>
                </div>
              ))}
              <div className="list-foot">
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={form.glance_rows.length >= GLANCE_MAX}
                  onClick={() => set("glance_rows", [...form.glance_rows, { label: "", time: "", detail: "" }])}
                >
                  + Add row
                </button>
                <span className="cap-note">
                  {form.glance_rows.length >= GLANCE_MAX
                    ? "Four rows is the limit. Past four it stops being a glance and becomes a second schedule."
                    : `${form.glance_rows.length} of ${GLANCE_MAX} rows`}
                </span>
              </div>
            </Group>

            {/* 6. Schedule */}
            <Group
              n={6}
              id="g-schedule"
              title="Run of Night"
              hint={
                <>
                  Comes from the {series?.name} template. Change anything here for this week only; the template itself lives under{" "}
                  <a href={`/admin/series?id=${series?.id}`}>Series</a>.
                </>
              }
            >
              {series && (
                <ScheduleEditor
                  template={series.schedule_template}
                  overrides={form.schedule_overrides}
                  snapshot={snapshot}
                  onChange={(ov) => set("schedule_overrides", ov)}
                  onUnfreeze={async () => {
                    if (!window.confirm("Use the current series template (plus this week's changes) for this week again?")) return;
                    const w = await unfreezeAction(id);
                    if (w) setSnapshot(w.schedule_snapshot);
                  }}
                />
              )}
            </Group>

            {/* 7. Optional sections */}
            <Group n={7} id="g-sections" title="Optional sections" hint="Game rules, a testimony, a special guest, a serve project. Switched off, a section disappears from the guide completely.">
              {form.extra_sections.map((s, i) => {
                const kind = SECTION_KINDS[s.kind] ?? SECTION_KINDS.custom;
                const patch = (p: Partial<ExtraSection>) => set("extra_sections", form.extra_sections.map((x, xi) => (xi === i ? { ...x, ...p } : x)));
                return (
                  <div className={`sec-card${s.enabled ? "" : " off"}`} key={s.id}>
                    <div className="sec-top">
                      <label className="switch">
                        <input type="checkbox" checked={s.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
                        <span className="track" aria-hidden />
                        <span className="sr-only">Show on the guide</span>
                      </label>
                      <span className="name">{s.title || kind.label}</span>
                      <span className="pill muted">{kind.label}</span>
                      {!s.enabled && <span className="muted small">Hidden from the guide</span>}
                      <span className="tools">
                        <button type="button" className="icon-btn" disabled={i === 0} onClick={() => set("extra_sections", moveIn(form.extra_sections, i, -1))} aria-label="Move section up">
                          &uarr;
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={i === form.extra_sections.length - 1}
                          onClick={() => set("extra_sections", moveIn(form.extra_sections, i, 1))}
                          aria-label="Move section down"
                        >
                          &darr;
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => {
                            if (window.confirm(`Remove ${s.title || "this section"}?`)) set("extra_sections", form.extra_sections.filter((_, x) => x !== i));
                          }}
                          aria-label="Remove section"
                        >
                          &times;
                        </button>
                      </span>
                    </div>
                    <div className="sec-body">
                      <div className="field-grid two">
                        <TextField label="Title" value={s.title} onChange={(v) => patch({ title: v })} placeholder={kind.title} />
                        <TextField label="Subtitle" value={s.subtitle} onChange={(v) => patch({ subtitle: v })} placeholder={kind.subtitle} />
                      </div>
                      <div className="field">
                        <span className="label">{kind.noun === "rule" ? "Rules" : "Items"} (numbered cards)</span>
                        <ItemList items={s.items} onChange={(items) => patch({ items })} noun={kind.noun} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="list-foot">
                <select className="select" style={{ width: "auto" }} value={newKind} onChange={(e) => setNewKind(e.target.value)} aria-label="Section type">
                  {Object.entries(SECTION_KINDS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => set("extra_sections", [...form.extra_sections, { id: newRowId(), kind: newKind, enabled: true, title: "", subtitle: "", items: [] }])}
                >
                  + Add section
                </button>
              </div>
            </Group>

            {/* 8. Small group questions */}
            <Group n={8} id="g-questions" title="Small group questions">
              <TextField label="Note under the heading" value={form.small_group_note} onChange={(v) => set("small_group_note", v)} placeholder="7:45 PM, 15 to 30 mins. Release groups to open gym once finished." />
              <div className="field" style={{ marginTop: 14 }}>
                <span className="label">Questions</span>
                <ItemList items={form.small_group_questions} onChange={(q) => set("small_group_questions", q)} noun="question" />
              </div>
            </Group>
          </div>
        </div>

        <aside className="ed-preview" aria-label="Preview">
          <PreviewPane html={html} />
        </aside>
      </div>

      {dialog && (
        <div className="dialog-back" role="dialog" aria-modal="true" aria-labelledby="pub-title">
          <div className="dialog">
            <h2 id="pub-title">Check before publishing</h2>
            <p className="muted" style={{ margin: 0 }}>
              These might be left over from an earlier week. Publish anyway if they&apos;re intentional.
            </p>
            <ul>
              {dialog.map((w) => (
                <li key={w.id}>
                  <b>{w.title}</b>
                  <span>{w.detail}</span>
                </li>
              ))}
            </ul>
            <div className="btn-row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn ghost" onClick={() => setDialog(null)} autoFocus>
                Keep editing
              </button>
              <button type="button" className="btn ok" onClick={() => void publish(true)} disabled={busy !== null}>
                {busy === "publish" ? "Publishing..." : "Publish anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast ? " show" : ""}${toast?.bad ? " bad" : ""}`} role="status" aria-live="polite">
        {toast?.msg}
      </div>
    </>
  );
}
