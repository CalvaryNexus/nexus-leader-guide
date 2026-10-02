"use client";

import { useState } from "react";
import { saveTemplateAction } from "@/app/admin/actions";
import { newRowId } from "@/lib/schedule";
import type { ScheduleRow } from "@/lib/types";
import { TextField } from "./fields";

/** The series' default Run of Night. Weeks store only their differences from this. */
export function TemplateEditor({ seriesId, seriesName, initial }: { seriesId: number; seriesName: string; initial: ScheduleRow[] }) {
  const [rows, setRows] = useState<ScheduleRow[]>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const dirty = JSON.stringify(rows) !== saved;
  const bands = [...new Set(rows.map((r) => r.band).filter(Boolean))];

  const patch = (i: number, p: Partial<ScheduleRow>) => setRows((rs) => rs.map((r, x) => (x === i ? { ...r, ...p } : r)));
  const move = (i: number, d: number) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const a = [...rs];
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });

  const save = async () => {
    setBusy(true);
    const res = await saveTemplateAction(seriesId, rows);
    setBusy(false);
    if (!res.ok) return setMsg({ text: res.error, bad: true });
    setSaved(JSON.stringify(rows));
    const parts = ["Template saved."];
    if (res.frozen) parts.push(`${res.frozen} past week${res.frozen === 1 ? "" : "s"} kept the schedule they had.`);
    if (res.changes.length) parts.push(`Also ${res.changes.join(", ")}.`);
    setMsg({ text: parts.join(" ") });
  };

  return (
    <div>
      <datalist id="bands">
        {["Setup", "Program", "Close", ...bands.filter((b) => !["Setup", "Program", "Close"].includes(b))].map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      {rows.map((r, i) => (
        <div key={r.id} className={`tpl-row${r.highlight ? " hl" : ""}`}>
          <div className="tpl-fields">
            <label className="field">
              <span className="mini-label">Band</span>
              <input className="input" list="bands" value={r.band} onChange={(e) => patch(i, { band: e.target.value })} />
            </label>
            <div>
              <span className="mini-label">Time</span>
              <TextField value={r.time} onChange={(v) => patch(i, { time: v })} ariaLabel="Time" />
            </div>
            <div>
              <span className="mini-label">Item</span>
              <TextField value={r.item} onChange={(v) => patch(i, { item: v })} ariaLabel="Item" />
            </div>
            <div>
              <span className="mini-label">Under item</span>
              <TextField value={r.item_note} onChange={(v) => patch(i, { item_note: v })} ariaLabel="Under item" placeholder="Optional" />
            </div>
            <div className="wide">
              <span className="mini-label">Details</span>
              <TextField multiline value={r.detail} onChange={(v) => patch(i, { detail: v })} ariaLabel="Details" />
            </div>
            <div className="wide btn-row" style={{ justifyContent: "space-between" }}>
              <label className="check">
                <input type="checkbox" checked={r.highlight} onChange={(e) => patch(i, { highlight: e.target.checked })} />
                Highlight
              </label>
              <span className="btn-row">
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move row up">
                  &uarr;
                </button>
                <button type="button" className="icon-btn" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move row down">
                  &darr;
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => {
                    if (window.confirm(`Remove ${r.item || "this row"} from the ${seriesName} template?`)) setRows((rs) => rs.filter((_, x) => x !== i));
                  }}
                  aria-label="Remove row"
                >
                  &times;
                </button>
              </span>
            </div>
          </div>
        </div>
      ))}
      <div className="list-foot" style={{ justifyContent: "space-between" }}>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setRows((rs) => [...rs, { id: newRowId(), band: rs[rs.length - 1]?.band ?? "Program", time: "", item: "", item_note: "", detail: "", highlight: false }])}
        >
          + Add row
        </button>
        <span className="btn-row">
          {msg && <span className={msg.bad ? "alert err small" : "fixnote"}>{msg.text}</span>}
          <button type="button" className="btn" onClick={() => void save()} disabled={!dirty || busy}>
            {busy ? "Saving..." : "Save template"}
          </button>
        </span>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Use <code>{"{meal}"}</code> to pull in each week&apos;s meal. Changes apply to this week and future weeks; weeks already past keep the
        schedule they had.
      </p>
    </div>
  );
}
