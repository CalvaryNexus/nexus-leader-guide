# Nexus Leader Guide App
## Build Blueprint

**Prepared for:** the developer building this
**Prepared by:** Tanner Jordan, Youth Pastor, Calvary Church
**Reference implementation:** the attached `index.html` (Abide Week 3). Every color, font, spacing value, and layout decision in this document is pulled from that file. It is the source of truth for anything this document does not cover.

---

## 1. What this is and why

Right now each week's leader guide is a hand-edited HTML file pushed to GitHub and deployed on Vercel. It works, but every week means editing raw HTML, which means only one person can do it and small mistakes (a stale time, a leftover section from last week) are easy to miss.

This app replaces that with three things:

1. **An admin interface** where the week's content is entered in plain form fields.
2. **A public leader guide** that renders from that content, always on-brand, with no HTML editing.
3. **An archive** so leaders can pull up any past week.

**The non-negotiable:** output must be visually identical to the current hand-built guide. This is not a redesign. The brand system in Section 5 is fixed.

---

## 2. Users and access

| Role | Who | Can do |
|---|---|---|
| **Admin** | Tanner, plus 1 to 2 other staff later | Create and edit weeks, edit the schedule template, publish and unpublish, edit series settings |
| **Leader** | ~15 to 20 volunteer small group leaders | View the current week and any past week. No login friction. |

### Access model

Leaders get a link and open it on a phone, usually in a parking lot, sometimes minutes before doors. **Any login step that takes more than a few seconds will kill adoption.**

Recommendation: the public guide is **unauthenticated at an unguessable URL**. It contains no student data, no personal information beyond Tanner's own contact info, and no financial data. The risk of a stranger reading the schedule is near zero. The cost of friction is high.

Admin is the only authenticated surface. A single shared admin password is acceptable for launch; per-user accounts can come later if more staff need access.

**Decision needed from Tanner:** confirm the public guide can be open, or say it needs a shared code.

---

## 3. Content model

This is the core of the build. Fields are grouped by how often they change, because that drives the admin UX.

### 3.1 Series (changes every 4 to 6 weeks)

| Field | Type | Example | Notes |
|---|---|---|---|
| `series_name` | short text | `Abide` | Appears in hero subtitle and footer |
| `series_reference` | short text | `John 15` | Appears beside series name |
| `series_active` | boolean | true | Only one series active at a time |

### 3.2 Week (changes every week)

| Field | Type | Example | Notes |
|---|---|---|---|
| `week_number` | integer | `3` | Drives "Week 3" labels throughout |
| `service_date` | date | `2026-09-28` | Used for archive sorting and display |
| `theme_verse_text` | long text | `As the Father has loved me, so have I loved you. Abide in my love.` | Rendered in display type, uppercase |
| `theme_verse_reference` | short text | `John 15:9 (ESV)` | Rendered below the verse |
| `main_idea` | long text | `Obedience is our response to abiding in Jesus.` | Prefixed with a bold "Main idea:" label |
| `question_of_the_day` | long text | `What is one way you have abided the last two weeks?` | Rendered in a blue callout card |
| `meal` | short text | `Cereal bar` | Rendered in a blue callout card AND injected into the 6:03 schedule row |
| `small_group_questions` | ordered list of long text | 7 items this week, 5 the week before | **Variable count.** Must support add, remove, and reorder |
| `published` | boolean | true | Unpublished weeks are admin-only |

### 3.3 Optional per-week sections

Some weeks have a large group game with rules; some do not. Week 2 had MatBall, Week 3 had nothing. **These must be togglable, not hardcoded.**

| Field | Type | Notes |
|---|---|---|
| `game_enabled` | boolean | When false, the whole section disappears from the page |
| `game_name` | short text | e.g. `MatBall` |
| `game_time_label` | short text | e.g. `6:35 PM in the Gym` |
| `game_rules` | ordered list of long text | Same numbered-card treatment as small group questions |

Build this as a **repeatable optional-section pattern**, not a one-off. Over a year there will be other section types (a testimony, a special guest, a serve project). The cleanest version of this is a generic "extra section" with a title, an optional subtitle, and a list of items rendered as numbered cards.

### 3.4 Welcome blocks (rarely change, occasionally edited)

Two short blocks in the left column. Currently:

- **Block 1 heading:** `Direct Students to C2`
  **Body:** `Doors open at 5:45. Direct students to C2. Placemats for drawing and card games are out, and the registration and sign-in tables are set.`
- **Block 2 heading:** `Intentional Connection Time`
  (body is replaced by the Question of the Day and Meal callout cards)

Model as an ordered list of `{heading, body}` pairs that defaults to the previous week's values. Editable but not required weekly.

### 3.5 At a glance (rarely changes, hard cap of 4)

Four rows, each `{label, time, detail}`:

| Label | Time | Detail |
|---|---|---|
| Leaders Arrive | 5:30 PM | Kitchen |
| Night Starts | 6:00 PM | Welcome and prayer |
| Small Group | 7:45 PM | Questions listed below |
| Night Ends | 8:30 PM | Nexus SERVES! cleanup until 8:45 |

**Enforce a maximum of 4 rows in the admin UI.** This panel exists because the full schedule sits directly below it. Every time it grows past four items it stops being a glance and becomes a duplicate schedule. The admin should physically prevent a fifth row.

### 3.6 Schedule (a persistent template with per-week overrides)

This is the most important data-modeling decision in the build.

The schedule is **90% identical week to week**. Times shift occasionally (Week 2 to Week 3 moved worship from 7:20 to 7:10). Detail text changes occasionally (the meal name). Everything else stays.

**Model it as a template, not as per-week data.**

- A `schedule_template` belongs to the series and holds the default rows.
- Each week stores only its **diffs** from that template.
- The admin week editor shows the full schedule with inherited values in a muted style, and any overridden row clearly marked with a "reset to template" control.

If you store a full copy of the schedule on every week, Tanner will be re-entering ten rows every Sunday and the app will have failed at its main job.

**Row structure:**

| Field | Example |
|---|---|
| `band` | `Setup` / `Program` / `Close` (section header rows) |
| `time` | `6:03 PM` |
| `item` | `Dinner Served` |
| `item_note` | `C2` (small grey text under the item) |
| `detail` | `Cereal bar. Focus on intentional connection time (buffer).` |
| `highlight` | boolean, applies the pale blue background to key rows |

Current default rows, for seeding:

```
BAND: Setup
5:30 PM | Nexus Leaders Arrive    | 15 min           | Food prep in the kitchen. Pray. Quick overview and Question of the Day. Break!   [highlight]
5:45 PM | Doors Open              |                  | Direct students to C2 (placemats for drawing, card games out). Registration table and sign-in table set. Small group leaders: intentional connection time.

BAND: Program
6:00 PM | Welcome / Prayer        |                  | Welcome, brief overview and announcements, opening prayer.   [highlight]
6:03 PM | Dinner Served           | C2               | {meal}. Focus on intentional connection time (buffer).
6:35 PM | Large Group Game        | Gym, until 7:05  | Small group rotation for dinner cleanup.
7:10 PM | Worship                 |                  | 2 to 3 songs, alternating between video and live worship each week (flexible).
7:25 PM | Message                 |                  | 15 to 20 mins (flexible).   [highlight]
7:45 PM | Small Group / Questions |                  | 15 to 30 mins. Release groups to open gym once finished (flexible). Questions are listed below.   [highlight]
8:00 PM | Open Gym Until Close    |                  | Some small groups might go longer (buffer).

BAND: Close
8:30 PM | Nexus SERVES!           |                  | Team helps with cleanup and closing down.
```

Note the `{meal}` token in the 6:03 row. Support simple token substitution so the meal field flows into the schedule automatically rather than being typed twice.

### 3.7 Footer (effectively static)

```
499 West US 61 Bypass, Muscatine, IA 52761
Questions? Contact Tanner
tanner@calvaryonline.org
(563) 316-2919

Nexus Student Ministry • {series_name} • Week {week_number}
Calvary Church, Muscatine
```

---

## 4. Screens

### 4.1 Public: current week (the main event)

Sections in this exact order. This order was arrived at through several rounds of revision and should not be changed.

1. **Hero**: navy rounded block, diagonal stripes, Nexus logo left with series name beneath, "LEADER'S GUIDE" right in display type, schedule line below
2. **Welcome + At a Glance**: two columns on desktop, stacked on mobile. Left: welcome blocks plus Question of the Day card plus Meal card. Right: the blue At a Glance panel
3. **Theme Verse band**: full-bleed navy, verse in large display caps, reference below, main idea below that
4. **Run of Night**: the schedule table
5. **Optional sections**: game rules etc., only if enabled
6. **Small Group Questions**: numbered cards
7. **Footer**

### 4.2 Public: archive

A simple reverse-chronological list. Each entry shows series name, week number, date, and theme verse reference. Clicking opens that week's guide rendered identically to the current week, with a small banner noting it is a past week.

Do not over-build this. A list and a link is enough.

### 4.3 Admin: week list

All weeks, newest first, with published status. Actions: create new week, duplicate last week, edit, publish/unpublish.

**"Duplicate last week" is the most important button in the app.** It should carry over the schedule, welcome blocks, and at-a-glance, and clear the verse, main idea, question of the day, meal, and small group questions. That is exactly the weekly workflow.

### 4.4 Admin: week editor

Single scrolling form, grouped to match the public page order so there is no mental translation between editing and result. Groups:

1. Week basics (number, date)
2. Theme verse and main idea
3. Question of the Day and meal
4. Welcome blocks
5. At a glance (max 4)
6. Schedule (template values shown muted, overrides marked)
7. Optional sections (toggle plus repeatable items)
8. Small group questions (repeatable, reorderable)

**Live preview is worth the effort.** A side-by-side or toggle preview showing the rendered guide as fields change removes the publish-check-fix loop entirely. If that is too much for v1, a "Preview" button that opens the unpublished guide in a new tab is the minimum.

### 4.5 Admin: series settings

Series name, reference, and the schedule template editor.

---

## 5. Brand system

**These values are exact. Pull them from the reference file, do not eyeball them.**

### 5.1 Color tokens

```css
--navy:        #1C326A;   /* hero, verse band, footer bands, buttons */
--navy-text:   #152864;   /* all headings, footer background */
--navy-stripe: #3154BE;   /* diagonal accent stripes, eyebrow labels, numbers */
--card:        #E7F2FE;   /* light blue panels, highlighted table rows */
--card-line:   #B2CDEB;   /* dividers inside blue panels */
--ink:         #121625;   /* body text */
--ink-soft:    #55607A;   /* secondary text, table detail column */
--paper:       #FFFFFF;   /* page background */
--paper-2:     #F6F9FD;   /* alternating sections */
--rule:        #DDE5F0;   /* table borders, card borders */

--ok:   #2F7D4F;
--warn: #B8801E;
--need: #B8341F;
```

The navy family was sampled directly from Calvary's own Prayer Week Leader's Guide page, so it matches the main church site. Do not substitute approximations.

### 5.2 Typography

```css
--f-display: "Archivo Black", Impact, sans-serif;   /* hero H1 and theme verse ONLY */
--f-head:    "Poppins", Helvetica, sans-serif;      /* headings, labels, table headers */
--f-body:    "Poppins", Helvetica, sans-serif;      /* everything else */
```

Load via:
```
https://fonts.googleapis.com/css2?family=Archivo+Black&family=Poppins:wght@400;500;600;700&display=swap
```

**Archivo Black is used in exactly two places:** the hero "LEADER'S GUIDE" headline and the theme verse blockquote. Both are uppercase. Using it anywhere else breaks the hierarchy.

Base body: `17px / 1.62`, color `--ink`.
Headings: Poppins 700, `line-height: 1.18`, color `--navy-text`.

### 5.3 Type scale (all fluid, copy exactly)

| Element | Size |
|---|---|
| Hero H1 | `clamp(46px, 9.5vw, 92px)`, line-height `.94`, letter-spacing `-.015em`, uppercase |
| Hero date line | `clamp(14px, 2.2vw, 19px)`, weight 600 |
| Verse blockquote | `clamp(34px, 6.6vw, 64px)`, line-height `.98`, letter-spacing `-.015em`, uppercase |
| Verse reference | `15px`, weight 600, letter-spacing `.14em`, uppercase, `rgba(255,255,255,.62)` |
| Verse eyebrow label | `11.5px`, weight 600, letter-spacing `.26em`, uppercase, `rgba(255,255,255,.6)` |
| Section heading | `clamp(28px, 4.4vw, 40px)`, centered |
| Section subhead | `16.5px`, `--ink-soft`, centered, `max-width: 60ch` |
| Welcome block H2 | `clamp(25px, 3.4vw, 32px)` |
| Glance panel H2 | `clamp(23px, 3vw, 29px)`, centered |
| Glance row label | `12px`, weight 600, letter-spacing `.13em`, uppercase, `--navy-text` |
| Glance row value | `16.5px` |
| Table header | `11.5px`, weight 600, letter-spacing `.15em`, uppercase |
| Table band row | `11px`, weight 600, letter-spacing `.2em`, uppercase |
| Table item | `16.5px`, weight 600, `--navy-text` |
| Card eyebrow (`.n`) | `11px`, weight 600, letter-spacing `.16em`, uppercase, `--navy-stripe` |
| Card H3 | `20px` |
| Numbered list item | `15px`, `--ink-soft` |

### 5.4 Layout and spacing

```css
--radius: 12px;
--maxw:   1140px;
--pad:    clamp(20px, 5vw, 40px);
```

- Content wrapper: `max-width: 1140px`, centered, horizontal padding `--pad`
- Section vertical padding: `clamp(46px, 6.5vw, 76px)`
- Hero inner padding: `clamp(38px, 5.5vw, 64px)` vertical, `clamp(24px, 4vw, 56px)` horizontal
- Verse band vertical padding: `clamp(52px, 7vw, 84px)`
- Glance panel padding: `clamp(24px, 3.4vw, 34px)`
- Card padding: `24px`
- Table cell padding: `15px 18px`; header `14px 18px`; band row `9px 18px`

### 5.5 Breakpoints

| Width | Change |
|---|---|
| `860px` | Hero goes two-column (logo left, headline right) |
| `900px` | Welcome + At a Glance goes two-column at `1fr .82fr` |
| `760px` | Below this, schedule table drops its header row and each row stacks as a block |
| `820px` | Numbered question cards go two-column |

**Mobile-first is not optional.** The large majority of views are phones.

### 5.6 The diagonal stripes

Both the hero and verse band carry two diagonal accent bars in `--navy-stripe`, one entering top-left and one bottom-right, at `rotate(-45deg)`, clipped by the parent's `overflow: hidden`.

Hero: `640px × 34px`, top `34px` / left `-300px`, and the mirror bottom-right. Opacity `.95`.
Verse band: `700px × 30px`, opacity `.9`.

These are the single most recognizable element of the brand. They must appear on both bands.

### 5.7 Logo

Two files are provided in `blueprint-assets/`:

- `nexus-logo-white.png`: 900×223, transparent, for navy backgrounds (hero, footer)
- `nexus-logo-navy.png`: same dimensions, for light backgrounds (admin UI, favicons)

The original artwork is black on white; the white version was produced by inverting to white with an alpha channel. If a vector version ever surfaces, prefer SVG.

Hero sizing: `width: min(340px, 76vw)`, auto height, centered.
Footer sizing: `150px` wide, `opacity: .9`.

### 5.8 Motion

One effect only: a scroll reveal. Elements carrying `.reveal` start at `opacity: 0; translateY(14px)` and transition to neutral over `.55s` on `cubic-bezier(.2,.8,.2,1)`, triggered by an IntersectionObserver at roughly 4% threshold with a `-6%` bottom margin, staggered by `min(i % 5 * 50, 240)ms`.

Wrap everything in `@media (prefers-reduced-motion: reduce)` that collapses durations to `.001ms`.

No other animation. No parallax, no counters, no carousels.

---

## 6. Component inventory

These are the reusable pieces. Everything on the page is one of these.

| Component | Where used | Description |
|---|---|---|
| **Navy band** | Hero, verse | Navy background, diagonal stripes, white text, `--radius` on hero, full-bleed on verse |
| **Blue callout card** | Question of the Day, Meal | `--card` background, no border, eyebrow label in `--navy-stripe`, H3 below |
| **Glance panel** | At a glance | `--card` background, `--radius`, centered rows separated by `--card-line` dividers |
| **Schedule table** | Run of Night | Navy header, `--navy-text` band rows, alternating `--paper-2`, `--card` on highlighted rows, collapses to stacked blocks under 760px |
| **Numbered card list** | Small group questions, game rules | White card, `--rule` border, `10px` radius, counter in `--navy-stripe` positioned absolutely at left, `54px` left padding |
| **Footer** | Every page | `--navy-text` background, two columns above 740px |

Build these as components once. Every future section type is a recombination of them.

---

## 7. Print outputs

Two print pieces are already in use and should be generated by the app rather than hand-built.

### 7.1 Small group half-sheet (priority)

**Reference:** attached `Abide-Wk3-Small-Group.pdf`

- US Letter, portrait, two identical cards stacked, dashed cut line at exactly 5.5in
- Each card: 8.5 × 5.5in, `8mm 11mm 7mm` padding
- Navy header band with logo left, "SMALL GROUP" in Archivo Black right, series and week beneath
- Main idea in a `--card` panel, centered, 13pt bold `--navy-text`
- Questions numbered, 9.9pt, line-height 1.36, number in `--navy-stripe`
- Footer: `Nexus Student Ministry • {theme_verse_reference}`

**Sizing note:** at 7 questions this fills the half sheet almost exactly. Type was tested at 10.3pt and overflowed to a second page. Either cap questions at 7 for the print version, or auto-scale type between roughly 9pt and 10pt based on total character count. Auto-scaling is the better answer since question counts vary.

Generate as a real PDF with selectable text, not a screenshot.

### 7.2 Full leader guide PDF (lower priority)

**Reference:** attached `Nexus-Fall-Kickoff-Run-of-Night.pdf`

Schedule plus any rules sections, two pages, same brand. Useful for leaders who want paper. Build after the half-sheet.

---

## 8. Content rules the app must enforce

These came out of many rounds of revision and they matter more than they look.

### 8.1 Typography hygiene

- **No em dashes or en dashes anywhere.** Use "6:15 to 7:30" or "5-7 mins". Sanitize on save: replace `—` and `–` with appropriate alternatives, or reject with a clear message.
- **No emoji anywhere.**
- **Straight quotes and apostrophes only.** Curly characters pasted from Word or Google Docs must be normalized on save. This bites on nearly every paste.

### 8.2 Voice

These guides go out to volunteer leaders and must read as coming from Tanner. Any AI-assist feature in the admin (if you build one) must not rewrite his text. Fixing a typo is fine. Rewriting a sentence is not.

Concretely: no auto-generated filler, no motivational closing lines, no "this is your window to pour into students" style padding. If a field is empty, leave it empty and let him fill it.

### 8.3 Structural

- At a glance is capped at 4 rows, enforced in the UI
- Never duplicate information between the welcome column and the at-a-glance panel
- Optional sections disappear completely when disabled, leaving no empty heading

### 8.4 Stale content

The most common failure in the manual workflow is content from last week surviving into this week. Build a **pre-publish check** that flags:

- Week number appearing anywhere in body text that does not match `week_number`
- A theme verse reference that matches the previous week's
- Small group questions identical to the previous week's
- Any of the em dash / emoji / curly quote violations above

Show these as warnings with an override, not hard blocks. Tanner sometimes repeats a question deliberately.

---

## 9. Technical constraints

Not prescribing a stack, but these are the facts on the ground:

- **Hosting is Vercel.** Already in use, already connected to GitHub, already working. Stay there.
- **An Upstash Redis instance already exists** on the Vercel project from a previous sign-up feature. Available if useful, but a relational store is probably a better fit for this content model. Dealer's choice.
- **Deploys currently happen via GitHub commit.** The app should decouple content from deploys: publishing a week must not require a redeploy.
- **The current guide is a single self-contained HTML file** with the logo embedded as base64. That was the right call for a static file and is the wrong call for an app. Serve the logo as a real asset.
- **Mobile performance matters more than desktop.** Leaders open this on cellular in a church parking lot.

---

## 10. Suggested build order

**Phase 1: replaces the current manual workflow**
Content model, admin week editor, public current-week guide, schedule template with overrides. At this point the hand-editing stops.

**Phase 2: the reason leaders will use it**
Archive and past-week views. Small group half-sheet PDF generation.

**Phase 3: quality of life**
Live preview in the editor, pre-publish stale-content checks, duplicate-last-week, optional-section builder.

**Phase 4: if it earns its keep**
Full guide PDF, multiple admin accounts, series-level views.

---

## 11. Decisions needed from Tanner

The developer should get answers to these before starting Phase 1.

1. **Public access:** open URL, or shared code? (Recommendation: open.)
2. **Who else needs admin access,** now and in six months?
3. **Does the day of the week belong in the hero?** The current guide says "NEXUS Schedule • Leaders arrive 5:30 PM" with no weekday. Sunday is implied but never stated.
4. **Sign-ups:** a previous week had a food sign-up with a live counter. There is a separate meal sign-up effort in flight. Decide whether sign-ups live in this app or stay separate, because that choice changes the data model significantly. (Recommendation: keep them separate for now and revisit once both are working.)
5. **Print scope for v1:** half-sheet only, or full guide too?
6. **Archive depth:** keep everything forever, or roll off after a year?

---

## Appendix: files provided

| File | What it is |
|---|---|
| `index.html` | The reference implementation, Abide Week 3. Complete brand system in the `<style>` block. |
| `Abide-Wk3-Small-Group.pdf` | The half-sheet print reference |
| `Nexus-Fall-Kickoff-Run-of-Night.pdf` | The full guide print reference |
| `blueprint-assets/nexus-logo-white.png` | Logo for navy backgrounds, 900×223, transparent |
| `blueprint-assets/nexus-logo-navy.png` | Logo for light backgrounds |

**Contact:** Tanner Jordan, tanner@calvaryonline.org, (563) 316-2919
