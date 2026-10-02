import { headers } from "next/headers";
import { createWeekAction, deleteWeekFormAction, unpublishFormAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { CopyButton } from "@/components/admin/CopyButton";
import { getActiveSeries, getSettings, listWeeks } from "@/lib/data";
import { dateShort } from "@/lib/format";

export default async function WeeksPage() {
  const [weeks, settings, active, h] = await Promise.all([listWeeks(), getSettings(), getActiveSeries(), headers()]);
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const current = weeks.find((w) => w.published);
  const latest = weeks[0];
  const nextLabel = latest
    ? latest.series_id === active?.id
      ? `${active?.name} Week ${latest.week_number + 1}`
      : `${active?.name} Week 1`
    : `${active?.name ?? "First"} week`;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Leader Guide</span>
          <h1 className="page-title">Weeks</h1>
        </div>
      </div>

      <div className="hero-actions">
        <div className="dup-card">
          <span className="stripe a" />
          <span className="stripe b" />
          <h2>Start {nextLabel}</h2>
          <p>
            Duplicate last week to keep the schedule, welcome blocks and at a glance. The verse, main idea, Question of the Day, meal and small group
            questions start empty.
          </p>
          <form action={createWeekAction} className="btn-row">
            <input type="hidden" name="mode" value="duplicate" />
            <button className="btn lg" type="submit" disabled={!latest}>
              Duplicate last week
            </button>
          </form>
          <form action={createWeekAction}>
            <input type="hidden" name="mode" value="blank" />
            <button type="submit" className="btn quiet sm" style={{ marginTop: 10 }}>
              Or start a new week from the plain template
            </button>
          </form>
        </div>

        <div className="panel blue access-card">
          <h2>Leader access</h2>
          <p className="lede">Share the link and code with leaders. They enter the code once per phone.</p>
          <dl>
            <div>
              <dt>Link</dt>
              <dd>
                <span>{origin.replace(/^https?:\/\//, "")}</span>
                <CopyButton text={origin} />
              </dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>
                {settings.leader_code ? (
                  <>
                    <span className="code-chip">{settings.leader_code}</span>
                    <CopyButton text={settings.leader_code} />
                  </>
                ) : (
                  <span className="muted" style={{ fontWeight: 500 }}>
                    None. The guide is open to anyone with the link.
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <p className="small" style={{ margin: "12px 0 0" }}>
            <a href="/admin/settings">Change the code</a>
          </p>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="empty">No weeks yet. Start one above.</div>
      ) : (
        <ul className="weeks">
          {weeks.map((w) => {
            const isLive = current?.id === w.id;
            return (
              <li key={w.id} className={`week-row${isLive ? " is-live" : ""}`}>
                <div>
                  <div className="week-title">
                    <a href={`/admin/weeks/${w.id}`}>
                      {w.series_name} &bull; Week {w.week_number}
                    </a>
                    {isLive ? (
                      <span className="pill live">Live now</span>
                    ) : w.published ? (
                      <span className="pill pub">Published</span>
                    ) : (
                      <span className="pill draft">Draft</span>
                    )}
                  </div>
                  <div className="week-meta">
                    {dateShort(w.service_date)}
                    {w.theme_verse_reference ? ` • ${w.theme_verse_reference}` : ""}
                    {` • ${w.small_group_questions.length} question${w.small_group_questions.length === 1 ? "" : "s"}`}
                  </div>
                </div>
                <div className="week-actions">
                  <a className="btn ghost sm" href={`/admin/weeks/${w.id}`}>
                    Edit
                  </a>
                  <a className="btn quiet sm" href={`/preview/${w.id}`} target="_blank" rel="noopener">
                    Preview
                  </a>
                  <a className="btn quiet sm" href={`/weeks/${w.id}/small-group.pdf`} target="_blank" rel="noopener">
                    Half-sheet
                  </a>
                  <a className="btn quiet sm" href={`/weeks/${w.id}/guide.pdf`} target="_blank" rel="noopener">
                    Guide PDF
                  </a>
                  {w.published ? (
                    <form action={unpublishFormAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <ConfirmSubmit className="btn ghost sm" message={`Unpublish ${w.series_name} Week ${w.week_number}? Leaders will no longer see it.`}>
                        Unpublish
                      </ConfirmSubmit>
                    </form>
                  ) : (
                    <>
                      <a className="btn sm" href={`/admin/weeks/${w.id}?publish=1`}>
                        Publish
                      </a>
                      <form action={deleteWeekFormAction}>
                        <input type="hidden" name="id" value={w.id} />
                        <ConfirmSubmit className="btn quiet sm" message={`Delete the draft ${w.series_name} Week ${w.week_number}? This can't be undone.`}>
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
