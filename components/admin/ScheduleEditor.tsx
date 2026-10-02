"use client";

import { newRowId, resetRowOverride, resolveSchedule, setRowOverride, type ResolvedRow } from "@/lib/schedule";
import type { AddedRow, ScheduleField, ScheduleOverrides, ScheduleRow } from "@/lib/types";
import { TextField } from "./fields";

type Props = {
  template: ScheduleRow[];
  overrides: ScheduleOverrides;
  snapshot: ScheduleRow[] | null;
  onChange: (ov: ScheduleOverrides) => void;
  onUnfreeze: () => void;
};

const FIELD_LABEL: Record<Exclude<ScheduleField, "highlight">, string> = {
  time: "Time",
  item: "Item",
  item_note: "Under item",
  detail: "Details",
};

/**
 * The week's Run of Night: template values shown muted (dashed, grey), anything changed for this
 * week shown normally with a "Reset to template" control. Only the differences are saved.
 */
export function ScheduleEditor({ template, overrides, snapshot, onChange, onUnfreeze }: Props) {
  if (snapshot) {
    return (
      <div>
        <p className="alert info" style={{ marginTop: 0 }}>
          This week&apos;s schedule was frozen when the series template changed after this date, so the archive keeps showing the schedule this
          night actually had.
        </p>
        <div className="sched">
          {snapshot.map((r) => (
            <div key={r.id} className={`srow${r.highlight ? " hl" : ""}`}>
              <div className="srow-top">
                <span className="who">
                  {r.time} &nbsp;{r.item}
                </span>
                {r.item_note && <span className="muted small">{r.item_note}</span>}
              </div>
              <div className="muted small" style={{ whiteSpace: "pre-line" }}>
                {r.detail}
              </div>
            </div>
          ))}
        </div>
        <div className="list-foot">
          <button type="button" className="btn ghost sm" onClick={onUnfreeze}>
            Use the current series template again
          </button>
        </div>
      </div>
    );
  }

  const rows = resolveSchedule(template, overrides);
  const byId = new Map(template.map((r) => [r.id, r]));

  const editTemplateRow = (r: ResolvedRow, field: ScheduleField | "hidden", value: string | boolean) => {
    const t = byId.get(r.id);
    if (t) onChange(setRowOverride(overrides, t, field, value));
  };
  const editAddedRow = (r: ResolvedRow, patch: Partial<AddedRow>) => {
    onChange({ ...overrides, added: overrides.added.map((a) => (a.id === r.id ? { ...a, ...patch } : a)) });
  };
  const addAfter = (r: ResolvedRow) => {
    const row: AddedRow = { id: newRowId(), band: r.band, time: "", item: "", item_note: "", detail: "", highlight: false, after: r.source === "template" ? r.id : (r.after ?? null) };
    const added = [...overrides.added];
    if (r.source === "added") added.splice(added.findIndex((a) => a.id === r.id) + 1, 0, row);
    else {
      // After any week-only rows already anchored to this template row.
      const lastIdx = added.map((a) => a.after).lastIndexOf(r.id);
      added.splice(lastIdx === -1 ? added.length : lastIdx + 1, 0, row);
    }
    onChange({ ...overrides, added });
  };
  const removeAdded = (r: ResolvedRow) => onChange({ ...overrides, added: overrides.added.filter((a) => a.id !== r.id) });

  let band: string | null = null;
  const out: React.ReactNode[] = [];
  for (const r of rows) {
    if (r.band !== band) {
      band = r.band;
      if (band) out.push(<div key={`band-${r.id}`} className="sched-band">{band}</div>);
    }
    const isTemplate = r.source === "template";
    const changed = r.overridden.length > 0;
    const cls = ["srow", r.highlight && "hl", changed && "changed", !isTemplate && "added", r.hidden && "hidden"].filter(Boolean).join(" ");
    const set = (field: ScheduleField, v: string | boolean) => (isTemplate ? editTemplateRow(r, field, v) : editAddedRow(r, { [field]: v }));
    const inh = (f: ScheduleField) => (isTemplate && !r.overridden.includes(f) ? "inherited" : "");
    const lbl = (f: Exclude<ScheduleField, "highlight">) => (
      <span className="mini-label">
        {FIELD_LABEL[f]}
        {isTemplate && r.overridden.includes(f) && <span className="ov">&bull; changed</span>}
      </span>
    );

    out.push(
      <div key={r.id} className={cls}>
        <div className="srow-top">
          <span className="who">
            {r.time || "New row"} &nbsp;{r.item}
          </span>
          {!isTemplate && <span className="pill info">This week only</span>}
          {changed && <span className="pill info">Changed this week</span>}
          {r.hidden && <span className="pill muted">Hidden this week</span>}
          <span className="tools">
            {isTemplate && changed && (
              <button type="button" className="btn quiet sm" onClick={() => onChange(resetRowOverride(overrides, r.id))}>
                Reset to template
              </button>
            )}
            {isTemplate && (
              <button type="button" className="btn quiet sm" onClick={() => editTemplateRow(r, "hidden", !r.hidden)}>
                {r.hidden ? "Show" : "Hide this week"}
              </button>
            )}
            {!isTemplate && (
              <button type="button" className="btn quiet sm" onClick={() => removeAdded(r)}>
                Remove
              </button>
            )}
            {!r.hidden && (
              <button type="button" className="btn quiet sm" onClick={() => addAfter(r)}>
                + Row below
              </button>
            )}
          </span>
        </div>
        <div className="sfields">
          <div>
            {lbl("time")}
            <TextField value={r.time} onChange={(v) => set("time", v)} inputClassName={inh("time")} ariaLabel="Time" placeholder="6:00 PM" />
          </div>
          <div>
            {lbl("item")}
            <TextField value={r.item} onChange={(v) => set("item", v)} inputClassName={inh("item")} ariaLabel="Item" />
          </div>
          <div>
            {lbl("item_note")}
            <TextField value={r.item_note} onChange={(v) => set("item_note", v)} inputClassName={inh("item_note")} ariaLabel="Under item" placeholder="Optional" />
          </div>
          <div className="wide">
            {lbl("detail")}
            <TextField multiline value={r.detail} onChange={(v) => set("detail", v)} inputClassName={inh("detail")} ariaLabel="Details" />
          </div>
          <label className="check wide">
            <input type="checkbox" checked={r.highlight} onChange={(e) => set("highlight", e.target.checked)} />
            Highlight this row
            {isTemplate && r.overridden.includes("highlight") && <span className="mini-label" style={{ margin: 0 }}><span className="ov">&bull; changed</span></span>}
          </label>
        </div>
      </div>,
    );
  }

  return (
    <div>
      <div className="legend">
        <span>
          <i style={{ border: "1.5px dashed var(--rule)", background: "var(--paper-2)" }} /> From the series template
        </span>
        <span>
          <i style={{ boxShadow: "inset 3px 0 0 var(--navy-stripe)", border: "1px solid var(--rule)" }} /> Changed this week
        </span>
        <span>
          <code>{"{meal}"}</code> fills in tonight&apos;s meal
        </span>
      </div>
      <div className="sched">{out}</div>
      {rows.length === 0 && <p className="muted">The series template has no rows yet. Add them under Series.</p>}
    </div>
  );
}
