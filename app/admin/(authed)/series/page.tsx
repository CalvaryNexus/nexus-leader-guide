import type { Metadata } from "next";
import { createSeriesAction, saveSeriesInfoAction, setActiveSeriesAction } from "@/app/admin/actions";
import { TemplateEditor } from "@/components/admin/TemplateEditor";
import { listSeries } from "@/lib/data";

export const metadata: Metadata = { title: "Series" };

export default async function SeriesPage({ searchParams }: { searchParams: Promise<{ id?: string; created?: string }> }) {
  const sp = await searchParams;
  const all = await listSeries();
  const selected = all.find((s) => s.id === Number(sp.id)) ?? all.find((s) => s.active) ?? all[0];
  const active = all.find((s) => s.active);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Leader Guide</span>
          <h1 className="page-title">Series</h1>
        </div>
      </div>

      {sp.created && <p className="alert ok">New series started and set as active. Its schedule template starts as a copy of the previous series.</p>}

      {selected && (
        <>
          <section className="panel">
            <div className="btn-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>{selected.name}</h2>
              {selected.active ? <span className="pill live">Active series</span> : <span className="pill muted">Not active</span>}
            </div>
            <form action={saveSeriesInfoAction} key={`info-${selected.id}-${selected.name}-${selected.reference}`}>
              <input type="hidden" name="id" value={selected.id} />
              <div className="field-grid two">
                <label className="field">
                  <span className="label">Series name</span>
                  <input className="input" name="name" defaultValue={selected.name} required />
                </label>
                <label className="field">
                  <span className="label">Reference</span>
                  <input className="input" name="reference" defaultValue={selected.reference} placeholder="John 15" />
                </label>
              </div>
              <div className="list-foot" style={{ justifyContent: "space-between" }}>
                <span className="hint">The name appears in the hero, the footer and the half-sheet. The reference appears beside it in the archive.</span>
                <button className="btn sm" type="submit">
                  Save name
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>Schedule template</h2>
            <p className="lede">
              The default Run of Night for every {selected.name} week. Each week only stores what it changes, so a time that moves for good
              should be changed here once.
            </p>
            <TemplateEditor key={selected.id} seriesId={selected.id} seriesName={selected.name} initial={selected.schedule_template} />
          </section>
        </>
      )}

      <section className="panel">
        <h2>All series</h2>
        <p className="lede">One series is active at a time. New weeks are created in the active series.</p>
        <ul className="series-list">
          {all.map((s) => (
            <li key={s.id} className="series-item">
              <span className="name">{s.name}</span>
              {s.reference && <span className="muted small">{s.reference}</span>}
              {s.active && <span className="pill live">Active</span>}
              <span className="tools">
                {s.id !== selected?.id && (
                  <a className="btn ghost sm" href={`/admin/series?id=${s.id}`}>
                    Edit
                  </a>
                )}
                {!s.active && (
                  <form action={setActiveSeriesAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn quiet sm" type="submit">
                      Make active
                    </button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>

        <h3 style={{ fontSize: 15, margin: "22px 0 10px" }}>Start a new series</h3>
        <form action={createSeriesAction}>
          <div className="field-grid two">
            <label className="field">
              <span className="label">Name</span>
              <input className="input" name="name" required placeholder="e.g. Abide" />
            </label>
            <label className="field">
              <span className="label">Reference</span>
              <input className="input" name="reference" placeholder="e.g. John 15" />
            </label>
          </div>
          <div className="list-foot" style={{ justifyContent: "space-between" }}>
            <span className="hint">{active ? `Copies the ${active.name} schedule template and becomes the active series.` : "Becomes the active series."}</span>
            <button className="btn sm" type="submit">
              Start series
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
