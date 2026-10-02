# Nexus Leader Guide

Replaces the hand-edited weekly HTML file with:

1. **Admin** (`/admin`): the week's content in plain form fields, with a live preview.
2. **Leader guide** (`/`): rendered from that content, matching the Abide Week 3 reference.
3. **Archive** (`/archive`): every published week, plus printable PDFs.

Built from `reference/NEXUS-LEADER-GUIDE-APP-BLUEPRINT.md`. The reference files it was checked against are in `reference/`.

## The weekly workflow

1. Admin → **Duplicate last week**. This keeps the schedule, welcome blocks and at a glance. It clears the verse, main idea, Question of the Day, meal and questions.
2. Fill in the empty fields. The preview on the right shows the leader guide exactly as leaders will see it, at phone or desktop width.
3. **Publish**. If something looks left over from last week, a list of warnings comes up first. Each one can be overridden.
4. **Half-sheet** prints the small group cards (two per Letter page, cut at 5.5in).

## Decisions (blueprint section 11)

| # | Question | Answer |
|---|---|---|
| 1 | Public access | **Shared code.** Leaders type it once per phone and it's remembered for 400 days. Set or change it in Admin → Settings. Leave it blank to make the guide open. |
| 2 | Admin access | One shared password (`ADMIN_PASSWORD`). Per-user accounts can come later. |
| 3 | Weekday in hero | **Yes.** The hero reads "Sunday, September 27 • Leaders arrive 5:30 PM", with the date taken from the service date. |
| 4 | Sign-ups | Kept separate from this app. |
| 5 | Print scope | **Both:** the small group half-sheet and the full guide PDF. |
| 6 | Archive depth | Keep everything. |

## Deploying to Vercel

1. Push this folder to a GitHub repo. To keep the URL leaders already have, replace the contents of the current guide's repo with this folder.
2. In Vercel, import the repo (or open the existing project). Framework: Next.js. No other build settings are needed.
3. **Storage** tab → **Create Database** → **Neon (Postgres)** → connect it to the project. This sets `DATABASE_URL`.
4. **Settings → Environment Variables**: add `ADMIN_PASSWORD`.
5. Deploy. The tables and the Abide Week 3 seed are created on the first request.
6. Go to `/admin`, sign in, and check the leader code under **Settings**.

Publishing a week takes effect immediately, with no redeploy. The existing Upstash Redis store is not used.

## Running locally

Requires Node 20+. Without `DATABASE_URL`, an embedded Postgres is created in `.data/`.

```bash
npm install
npm run dev
```

`.env.local` holds the local admin password. `npm test` runs the checks, including one that compares the rendered Week 3 against the reference HTML element by element.

## How it's built

- **Next.js 16** on Vercel, **Postgres** (Neon) for content.
- `lib/render/guide.ts` builds the leader guide HTML. The same function runs on the server for leaders and in the browser for the editor's live preview, so the preview can't drift from what leaders see. Public pages ship no JavaScript beyond the reference's scroll-reveal script, and are about 22 KB (the old file was 119 KB because of the embedded logo).
- `lib/render/reference-css.ts` is the reference stylesheet, copied verbatim.
- `lib/schedule.ts`: the schedule is a template on the series. Each week stores only its differences, and `{meal}` fills in the meal. When the template changes, weeks whose date has passed keep the schedule they had.
- `lib/sanitize.ts` enforces no em/en dashes, no emoji and straight quotes. Fixes are applied when you leave a field (and said out loud) and again on save.
- `lib/checks.ts` holds the pre-publish checks for stale content.
- `lib/pdf/` holds the half-sheet and full guide PDFs (real text). Question type on the half-sheet scales between 10pt and 9pt so the card always fits.

## Notes

- The brief's example date for Week 3 (2026-09-28) is a Monday. The seed uses Sunday 9/27.
- The seeded main idea uses the wording from the published guide, which is the longer one. The half-sheet PDF used the shorter wording.
- The series reference ("John 15") appears beside the series name in the archive. The reference guide doesn't show it anywhere, so it isn't added to the guide.
- The one visual addition to the guide is a "Past weeks and printables" link in the footer, so leaders can reach the archive.
- Fonts in `assets/fonts/` (Poppins, Archivo Black) are SIL Open Font License, used for the PDFs. The web pages load them from Google Fonts as specified.
