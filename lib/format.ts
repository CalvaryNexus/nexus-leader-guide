// Formatting helpers shared by the web renderer, the PDFs and the admin.

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse YYYY-MM-DD as a calendar date (no time zone drift). */
export function parseDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function ordinal(n: number): string {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "Sunday, September 27" (hero line, PDF headers). */
export function dateLong(iso: string): string {
  const d = parseDate(iso);
  if (!d) return "";
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Sep 27, 2026" (archive, admin lists). */
export function dateShort(iso: string): string {
  const d = parseDate(iso);
  if (!d) return "";
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Sunday, Sep. 27th" (PDF footers, matching the Fall Kickoff run of night). */
export function dateFooter(iso: string): string {
  const d = parseDate(iso);
  if (!d) return "";
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS_SHORT[d.getUTCMonth()]}. ${ordinal(d.getUTCDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso) ?? new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in Muscatine. */
export function todayCentral(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape for text content (quotes are fine there, and the reference leaves them as-is). */
export function escapeText(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type InlineSpan = { text: string; bold: boolean };

/** The only markup the editor supports: **bold**. */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const re = /\*\*([^*]+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index), bold: false });
    spans.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last), bold: false });
  return spans;
}

/** Escaped HTML with **bold** as <b>/<strong> and line breaks as <br>. */
export function inlineHtml(text: string, boldTag: "b" | "strong" = "b"): string {
  return parseInline(text ?? "")
    .map((s) => (s.bold ? `<${boldTag}>${escapeText(s.text)}</${boldTag}>` : escapeText(s.text)))
    .join("")
    .replace(/\n/g, "<br>\n");
}

/** Split body text into paragraphs on blank lines. */
export function paragraphs(text: string): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "John 15:9 (ESV)" -> "John 15:9" (the half-sheet footer drops the translation). */
export function stripTranslation(ref: string): string {
  return (ref ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function plainText(text: string): string {
  return (text ?? "").replace(/\*\*([^*]+?)\*\*/g, "$1");
}
