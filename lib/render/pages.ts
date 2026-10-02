// The other public pages: archive, leader code, and simple message pages. Same shell and
// components as the guide.
import { dateShort, escapeHtml as e } from "../format";
import type { FooterSettings } from "../types";
import { documentShell, footerHtml, heroHtml } from "./guide";

export type ArchiveEntry = {
  id: number;
  seriesName: string;
  seriesReference: string;
  seriesId: number;
  weekNumber: number;
  serviceDate: string;
  verseReference: string;
  isCurrent: boolean;
};

export function renderArchive(entries: ArchiveEntry[], footer: FooterSettings): string {
  // Reverse-chronological, grouped by series as it goes.
  const groups: { key: string; label: string; items: ArchiveEntry[] }[] = [];
  for (const en of entries) {
    const key = String(en.seriesId);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: [en.seriesName, en.seriesReference].filter(Boolean).map(e).join(" &bull; "), items: [] };
      groups.push(g);
    }
    g.items.push(en);
  }

  const list = groups
    .map(
      (g) => `<div class="arch-series">
      <span class="n">${g.label}</span>
      <ul class="arch-list">
        ${g.items
          .map(
            (en) => `<li class="arch-row">
          <a class="arch-main" href="${en.isCurrent ? "/" : `/weeks/${en.id}`}">
            <span class="arch-title">${e(en.seriesName)} &bull; Week ${en.weekNumber}${en.isCurrent ? ' <span class="arch-pill">This week</span>' : ""}</span>
            <span class="arch-meta">${[e(dateShort(en.serviceDate)), e(en.verseReference)].filter(Boolean).join(" &bull; ")}</span>
          </a>
          <div class="arch-print">
            <a href="/weeks/${en.id}/small-group.pdf">Small group PDF</a>
            <a href="/weeks/${en.id}/guide.pdf">Full guide PDF</a>
          </div>
        </li>`,
          )
          .join("\n        ")}
      </ul>
    </div>`,
    )
    .join("\n    ");

  const body = `${heroHtml("Leader's Guide", "Past Weeks", '<a href="/" style="color:#fff">Back to this week\'s guide</a>', "page-hero")}

<section>
  <div class="wrap">
    <div class="archive">
    ${list || '<p class="empty-note">Nothing published yet.</p>'}
    </div>
  </div>
</section>

${footerHtml(footer, "Nexus Student Ministry &bull; Past Weeks", null)}`;

  return documentShell({ title: "Nexus | Past Weeks", description: "Past Nexus leader guides.", body, mode: "live", script: false });
}

export function renderAccess(opts: { next: string; error?: string | null; footer: FooterSettings }): string {
  const body = `${heroHtml("Nexus Student Ministry", "Leader's<br>Guide", null)}

<section>
  <div class="wrap">
    <div class="access">
      <h2 class="sec-h">Leader Code</h2>
      <p>Enter the code Tanner shared with you. You only need to do this once on this device.</p>
      <form method="post" action="/access">
        <input type="hidden" name="next" value="${e(opts.next)}">
        ${opts.error ? `<div class="err" role="alert">${e(opts.error)}</div>` : ""}
        <div class="field">
          <label for="code">Code</label>
          <input type="text" id="code" name="code" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" required autofocus>
        </div>
        <button class="btn" type="submit">Open the guide</button>
      </form>
    </div>
  </div>
</section>

${footerHtml(opts.footer, "Nexus Student Ministry &bull; Leader's Guide", null)}`;
  return documentShell({ title: "Nexus | Leader's Guide", description: "Leader's Guide for Nexus.", body, mode: "live", script: false });
}

export function renderMessage(opts: { title: string; message: string; footer: FooterSettings; link?: { href: string; label: string } }): string {
  const body = `${heroHtml("Nexus Student Ministry", "Leader's<br>Guide", null)}

<section>
  <div class="wrap">
    <div class="access">
      <h2 class="sec-h">${e(opts.title)}</h2>
      <p>${e(opts.message)}</p>
      ${opts.link ? `<p><a href="${e(opts.link.href)}" style="color:var(--navy-stripe);font-weight:600;text-decoration:none">${e(opts.link.label)}</a></p>` : ""}
    </div>
  </div>
</section>

${footerHtml(opts.footer, "Nexus Student Ministry", null)}`;
  return documentShell({ title: `Nexus | ${opts.title}`, description: opts.message, body, mode: "live", script: false });
}
