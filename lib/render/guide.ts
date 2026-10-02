// Renders the public leader guide as a complete HTML document, matching the Abide Week 3 reference
// markup element for element. Pure string building with no server imports, so the admin's live
// preview runs this exact function in the browser.
import { dateLong, dateShort, escapeHtml as e, inlineHtml, paragraphs } from "../format";
import { weekScheduleRows } from "../schedule";
import type { ExtraSection, FooterSettings, GlanceRow, ScheduleRow, Series, SiteSettings, Week, WelcomeBlock } from "../types";
import { REFERENCE_CSS } from "./reference-css";

export type GuideView = {
  seriesName: string;
  weekNumber: number;
  serviceDate: string;
  heroTagline: string;
  welcomeBlocks: WelcomeBlock[];
  questionOfTheDay: string;
  meal: string;
  glanceRows: GlanceRow[];
  verseText: string;
  verseReference: string;
  mainIdea: string;
  scheduleRows: ScheduleRow[];
  sections: ExtraSection[];
  smallGroupNote: string;
  smallGroupQuestions: string[];
  footer: FooterSettings;
};

export function buildGuideView(week: Week, series: Series, settings: Pick<SiteSettings, "footer">): GuideView {
  return {
    seriesName: series.name,
    weekNumber: week.week_number,
    serviceDate: week.service_date,
    heroTagline: week.hero_tagline,
    welcomeBlocks: week.welcome_blocks.filter((b) => b.heading.trim() || b.body.trim() || b.callouts),
    questionOfTheDay: week.question_of_the_day,
    meal: week.meal,
    glanceRows: week.glance_rows.filter((r) => r.label.trim() || r.time.trim() || r.detail.trim()).slice(0, 4),
    verseText: week.theme_verse_text,
    verseReference: week.theme_verse_reference,
    mainIdea: week.main_idea,
    scheduleRows: weekScheduleRows(week, series),
    // Disabled sections disappear completely, heading and all.
    sections: week.extra_sections
      .filter((s) => s.enabled && (s.title.trim() || s.items.some((i) => i.trim())))
      .map((s) => ({ ...s, items: s.items.filter((i) => i.trim()) })),
    smallGroupNote: week.small_group_note,
    smallGroupQuestions: week.small_group_questions.filter((q) => q.trim()),
    footer: settings.footer,
  };
}

export type RenderMode = "live" | "preview";

export type GuideRenderOptions = {
  mode: RenderMode;
  /** Shown above the hero when this is not the current week. */
  pastWeek?: { currentHref: string } | null;
  /** Admin-only preview of an unpublished week. */
  draftNotice?: string | null;
  archiveHref?: string;
};

// ---------- shared page shell ----------

export const APP_CSS = `
/* --------- APP ADDITIONS (not in the reference file) --------- */
.notice-outer{padding:clamp(14px,2vw,20px) 0 0}
.notice{
  display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;justify-content:space-between;
  background:var(--card);border-radius:var(--radius);padding:12px 18px;
  font-family:var(--f-head);font-size:13.5px;line-height:1.45;color:var(--navy-text);
}
.notice b{font-weight:600}
.notice a{font-weight:600;color:var(--navy-stripe);text-decoration:none;white-space:nowrap}
.notice a:hover{text-decoration:underline}
.notice.draft{background:#FDF5E4;color:#8A6114}
.sec-h.solo{margin-bottom:clamp(28px,4vw,42px)}
.foot-links{margin-top:14px}

.hero.page-hero h1{font-family:var(--f-head);font-weight:700;font-size:clamp(30px,5vw,46px);line-height:1.1;text-transform:none;letter-spacing:0}
.archive{display:grid;gap:clamp(30px,4vw,44px)}
.arch-series .n{
  font-family:var(--f-head);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:var(--navy-stripe);display:block;margin-bottom:12px;
}
.arch-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.arch-row{
  background:var(--paper);border:1px solid var(--rule);border-radius:10px;
  display:grid;grid-template-columns:1fr;gap:10px 18px;padding:16px 18px;align-items:center;
}
@media(min-width:720px){.arch-row{grid-template-columns:1fr auto}}
.arch-main{color:inherit;text-decoration:none;display:block}
.arch-title{font-family:var(--f-head);font-weight:600;font-size:16.5px;color:var(--navy-text);display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.arch-meta{font-size:14.5px;color:var(--ink-soft);margin-top:2px}
.arch-main:hover .arch-title{color:var(--navy-stripe)}
.arch-pill{
  font-family:var(--f-head);font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
  background:var(--navy);color:#fff;padding:3px 9px;border-radius:99px;
}
.arch-print{display:flex;flex-wrap:wrap;gap:8px}
.arch-print a{
  font-family:var(--f-head);font-size:12.5px;font-weight:500;color:var(--ink-soft);text-decoration:none;
  border:1px solid var(--rule);border-radius:99px;padding:6px 12px;transition:.16s;white-space:nowrap;
}
.arch-print a:hover{border-color:var(--navy);color:var(--navy-text)}
.empty-note{text-align:center;color:var(--ink-soft);padding:30px 0}

.access{max-width:420px;margin:0 auto;text-align:center}
.access p{color:var(--ink-soft);margin:0 0 22px}
.access form{display:grid;gap:12px;text-align:left}
.access .err{
  font-family:var(--f-head);font-size:13px;font-weight:500;color:var(--need);
  background:#FBEDEA;border:1px solid #F0CFC8;padding:9px 12px;border-radius:8px;text-align:left;
}
`;

const REVEAL_SCRIPT = `<script>
const io = new IntersectionObserver(es => {
  es.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
}, { rootMargin:"0px 0px -6% 0px", threshold:.04 });
document.querySelectorAll(".reveal").forEach((el,i) => {
  el.style.transitionDelay = Math.min(i%5*50,240) + "ms";
  io.observe(el);
});
</script>`;

export function documentShell(opts: { title: string; description: string; body: string; mode: RenderMode; script?: boolean }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(opts.title)}</title>
<meta name="description" content="${e(opts.description)}">
<meta name="theme-color" content="#1C326A">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/icon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-icon.png">
${opts.mode === "preview" ? '<base target="_blank">\n' : ""}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${REFERENCE_CSS}${APP_CSS}</style>
${opts.script === false ? "" : '<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>\n'}</head>
<body>
${opts.body}
${opts.script === false || opts.mode === "preview" ? "" : REVEAL_SCRIPT}
</body>
</html>
`;
}

/** Class for elements that scroll-reveal. The preview shows everything immediately. */
function rv(mode: RenderMode): string {
  return mode === "preview" ? "reveal in" : "reveal";
}

export function heroHtml(sub: string, h1Html: string, whenHtml: string | null, extraClass = ""): string {
  return `<!-- ====== HERO ====== -->
<div class="hero-outer">
  <div class="wrap">
    <div class="hero${extraClass ? ` ${extraClass}` : ""}">
      <span class="stripe a"></span>
      <span class="stripe b"></span>
      <div class="hero-in">
        <div class="logo-lockup">
          <img class="logo-nexus" src="/nexus-logo-white.png" width="900" height="223" alt="Nexus">
          ${sub ? `<span class="sub">${sub}</span>` : ""}
        </div>
        <div>
          <h1>${h1Html}</h1>
          ${whenHtml ? `<p class="when">${whenHtml}</p>` : ""}
        </div>
      </div>
    </div>
  </div>
</div>`;
}

export function footerHtml(footer: FooterSettings, bottomLeft: string, archiveHref: string | null): string {
  const tel = footer.phone.replace(/[^\d+]/g, "");
  return `<!-- ====== FOOTER ====== -->
<footer>
  <div class="wrap foot-grid">
    <div>
      <img class="foot-logo" src="/nexus-logo-white.png" width="900" height="223" alt="Nexus">
      ${footer.address ? `<p>${inlineHtml(footer.address).replace(/<br>\n/g, "<br>")}</p>` : ""}
      ${archiveHref ? `<p class="foot-links"><a href="${e(archiveHref)}">Past weeks and printables</a></p>` : ""}
    </div>
    <div>
      ${footer.contact_heading ? `<h4>${e(footer.contact_heading)}</h4>` : ""}
      ${footer.email ? `<p><a href="mailto:${e(footer.email)}">${e(footer.email)}</a></p>` : ""}
      ${footer.phone ? `<p><a href="tel:${e(tel)}">${e(footer.phone)}</a></p>` : ""}
    </div>
  </div>
  <div class="wrap">
    <div class="foot-bottom">
      <span>${bottomLeft}</span>
      <span>${e(footer.org_line)}</span>
    </div>
  </div>
</footer>`;
}

function noticeHtml(html: string, cls = ""): string {
  return `<div class="notice-outer">
  <div class="wrap">
    <div class="notice${cls ? ` ${cls}` : ""}">${html}</div>
  </div>
</div>`;
}

// ---------- the guide ----------

function welcomeHtml(v: GuideView, mode: RenderMode): string {
  const blocks = v.welcomeBlocks;
  const hasCallouts = Boolean(v.questionOfTheDay.trim() || v.meal.trim());
  // Callout cards go under the block that asks for them, or the last block if none does.
  let calloutIndex = blocks.findIndex((b) => b.callouts);
  if (calloutIndex === -1) calloutIndex = blocks.length - 1;

  const cards: string[] = [];
  if (v.questionOfTheDay.trim()) {
    cards.push(`<div class="card blue" style="text-align:left">
        <span class="n">Question of the Day</span>
        <h3>${inlineHtml(v.questionOfTheDay)}</h3>
      </div>`);
  }
  if (v.meal.trim()) {
    cards.push(`<div class="card blue" style="text-align:left${cards.length ? "; margin-top:14px" : ""}">
        <span class="n">Tonight's Meal</span>
        <h3>${inlineHtml(v.meal)}</h3>
      </div>`);
  }

  const parts = blocks.map((b, i) => {
    const out: string[] = [];
    if (b.heading.trim()) out.push(`<h2>${inlineHtml(b.heading)}</h2>`);
    for (const p of paragraphs(b.body)) out.push(`<p>${inlineHtml(p, "strong")}</p>`);
    if (i === calloutIndex && hasCallouts) out.push(cards.join("\n\n      "));
    return out.join("\n      ");
  });
  if (!blocks.length && hasCallouts) parts.push(cards.join("\n\n      "));
  if (!parts.length) return "";

  return `<div class="welcome ${rv(mode)}">
      ${parts.join("\n\n      <div class=\"gap\"></div>\n\n      ")}
    </div>`;
}

function glanceHtml(v: GuideView, mode: RenderMode): string {
  if (!v.glanceRows.length) return "";
  const rows = v.glanceRows.map((r) => {
    const dd = [r.time.trim() ? `<b>${e(r.time)}</b>` : "", r.detail.trim() ? inlineHtml(r.detail) : ""].filter(Boolean).join("<br>");
    return `<div class="row">
          <dt>${e(r.label)}</dt>
          <dd>${dd}</dd>
        </div>`;
  });
  return `<div class="glance ${rv(mode)}">
      <h2>Nexus at a Glance</h2>
      <dl>
        ${rows.join("\n        ")}
      </dl>
    </div>`;
}

function verseHtml(v: GuideView): string {
  if (!v.verseText.trim() && !v.mainIdea.trim()) return "";
  return `<!-- ====== THEME VERSE ====== -->
<div class="verse">
  <span class="stripe a"></span>
  <span class="stripe b"></span>
  <div class="inner">
    <p class="label">Week ${e(String(v.weekNumber))} Theme Verse</p>
    ${v.verseText.trim() ? `<blockquote>${inlineHtml(v.verseText)}</blockquote>` : ""}
    ${v.verseReference.trim() ? `<cite>${e(v.verseReference)}</cite>` : ""}
    ${
      v.mainIdea.trim()
        ? `<p style="margin-top:26px; font-size:19px; color:rgba(255,255,255,.88)">
      <strong style="color:#fff">Main idea:</strong> ${inlineHtml(v.mainIdea)}</p>`
        : ""
    }
  </div>
</div>`;
}

function scheduleHtml(v: GuideView, mode: RenderMode): string {
  if (!v.scheduleRows.length) return "";
  const out: string[] = [];
  let band: string | null = null;
  for (const r of v.scheduleRows) {
    if (r.band !== band) {
      band = r.band;
      if (band.trim()) out.push(`<tr class="band"><td colspan="3">${e(band)}</td></tr>`);
    }
    out.push(`<tr${r.highlight ? ' class="hl"' : ""}>
            <td class="time">${e(r.time)}</td>
            <td class="item"><b>${e(r.item)}</b>${r.item_note.trim() ? `<span>${e(r.item_note)}</span>` : ""}</td>
            <td class="det">${inlineHtml(r.detail)}</td>
          </tr>`);
  }
  return `<!-- ====== SCHEDULE ====== -->
<section>
  <div class="wrap">
    <h2 class="sec-h ${rv(mode)}">Run of Night</h2>

    <div class="table-wrap ${rv(mode)}">
      <table>
        <thead><tr><th>Time</th><th>Item</th><th>Details</th></tr></thead>
        <tbody>
          ${out.join("\n          ")}
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

function numberedSectionHtml(title: string, subtitle: string, items: string[], tint: boolean, mode: RenderMode, comment: string): string {
  const sub = subtitle.trim();
  return `<!-- ====== ${comment} ====== -->
<section${tint ? ' class="tint"' : ""}>
  <div class="wrap">
    <h2 class="sec-h${sub ? "" : " solo"} ${rv(mode)}">${e(title)}</h2>
    ${sub ? `<p class="sec-sub ${rv(mode)}">${inlineHtml(sub)}</p>\n` : ""}
    <ol class="rules ${rv(mode)}">
      ${items.map((i) => `<li>${inlineHtml(i)}</li>`).join("\n      ")}
    </ol>
  </div>
</section>`;
}

export function renderGuideBody(v: GuideView, opts: GuideRenderOptions): string {
  const { mode } = opts;
  const parts: string[] = [];

  if (opts.draftNotice) parts.push(noticeHtml(opts.draftNotice, "draft"));
  if (opts.pastWeek) {
    parts.push(
      noticeHtml(
        `<span>You are viewing a past week: <b>${e(v.seriesName)} &bull; Week ${e(String(v.weekNumber))}</b>, ${e(dateShort(v.serviceDate))}</span><a href="${e(opts.pastWeek.currentHref)}">Go to this week's guide</a>`,
      ),
    );
  }

  const when = [e(dateLong(v.serviceDate)), e(v.heroTagline.trim())].filter(Boolean).join(" <em>&bull;</em> ");
  parts.push(heroHtml(`${e(v.seriesName)} &bull; Week ${e(String(v.weekNumber))}`, "Leader's<br>Guide", when || null));

  const welcome = welcomeHtml(v, mode);
  const glance = glanceHtml(v, mode);
  if (welcome || glance) {
    parts.push(`<!-- ====== WELCOME + AT A GLANCE ====== -->
<section>
  <div class="wrap top-grid">

    ${welcome}

    ${glance}

  </div>
</section>`);
  }

  const verse = verseHtml(v);
  if (verse) parts.push(verse);

  const schedule = scheduleHtml(v, mode);
  if (schedule) parts.push(schedule);

  // Optional sections, then Small Group Questions (always tinted). Backgrounds alternate backwards
  // from the questions so two neighbouring sections never share a tint.
  const hasQuestions = v.smallGroupQuestions.length > 0;
  v.sections.forEach((s, i) => {
    const fromEnd = v.sections.length - i; // 1 = directly above the questions
    const tint = hasQuestions ? fromEnd % 2 === 0 : fromEnd % 2 === 1;
    parts.push(numberedSectionHtml(s.title, s.subtitle, s.items, tint, mode, s.title.toUpperCase() || "SECTION"));
  });

  if (hasQuestions) {
    parts.push(numberedSectionHtml("Small Group Questions", v.smallGroupNote, v.smallGroupQuestions, true, mode, "SMALL GROUP QUESTIONS"));
  }

  parts.push(footerHtml(v.footer, `Nexus Student Ministry &bull; ${e(v.seriesName)} &bull; Week ${e(String(v.weekNumber))}`, opts.archiveHref ?? null));

  return parts.join("\n\n");
}

export function guideTitle(v: Pick<GuideView, "seriesName" | "weekNumber">): string {
  return `Nexus ${v.seriesName} Week ${v.weekNumber} | Leader's Guide`;
}

export function renderGuideDocument(v: GuideView, opts: GuideRenderOptions): string {
  return documentShell({
    title: guideTitle(v),
    description: `Leader's Guide for Nexus, ${v.seriesName} Week ${v.weekNumber}.`,
    body: renderGuideBody(v, opts),
    mode: opts.mode,
  });
}
