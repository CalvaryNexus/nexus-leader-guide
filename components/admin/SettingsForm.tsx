"use client";

import { useActionState } from "react";
import { saveSettingsAction, type SettingsState } from "@/app/admin/actions";
import type { SiteSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, { ok: false, message: null });
  const f = settings.footer;
  return (
    <form action={action}>
      <section className="panel">
        <h2>Leader code</h2>
        <p className="lede">
          Leaders type this once per phone and it&apos;s remembered. Changing it signs every phone out, so share the new one. Leave it blank to
          open the guide to anyone with the link.
        </p>
        <label className="field">
          <span className="label">Code</span>
          <input className="input big" name="leader_code" defaultValue={settings.leader_code} autoComplete="off" spellCheck={false} style={{ maxWidth: 320 }} />
          <span className="hint">Not case-sensitive. Something short and easy to text works best.</span>
        </label>
      </section>

      <section className="panel">
        <h2>Footer</h2>
        <p className="lede">Shown at the bottom of every page.</p>
        <div className="field-grid two">
          <label className="field">
            <span className="label">Address</span>
            <textarea className="textarea" name="address" rows={2} defaultValue={f.address} />
            <span className="hint">Line breaks are kept.</span>
          </label>
          <label className="field">
            <span className="label">Contact heading</span>
            <input className="input" name="contact_heading" defaultValue={f.contact_heading} />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input className="input" name="email" type="email" defaultValue={f.email} />
          </label>
          <label className="field">
            <span className="label">Phone</span>
            <input className="input" name="phone" defaultValue={f.phone} />
          </label>
          <label className="field">
            <span className="label">Bottom line, right</span>
            <input className="input" name="org_line" defaultValue={f.org_line} />
          </label>
        </div>
      </section>

      <div className="list-foot" style={{ justifyContent: "flex-end", marginTop: 18 }}>
        {state.message && <span className="fixnote">{state.message}</span>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
