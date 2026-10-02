// Typography hygiene (blueprint 8.1): no em/en dashes, no emoji, straight quotes only.
// Applied on save (server, authoritative) and on field blur (editor, so the fix is visible).

const DASH = "‒–—―"; // figure dash, en dash, em dash, horizontal bar
const DASH_RE = new RegExp(`[${DASH}]`);
const CURLY_SINGLE = /[‘’‚‛′]/g;
const CURLY_DOUBLE = /[“”„‟″]/g;
const CURLY_ANY = /[‘’‚‛′“”„‟″]/;
// Pictographs plus the joiners and modifiers emoji are built from. (c), (r) and TM are left alone.
const EMOJI_RE = /(?![©®™])[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{20E3}]/gu;
const EMOJI_TEST = /(?![©®™])[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;
const ZERO_WIDTH = /[​‌‍⁠﻿]/g;

export type ViolationKind = "dash" | "emoji" | "curly";

export function findViolations(s: string): ViolationKind[] {
  const out: ViolationKind[] = [];
  if (DASH_RE.test(s)) out.push("dash");
  if (EMOJI_TEST.test(s)) out.push("emoji");
  if (CURLY_ANY.test(s)) out.push("curly");
  return out;
}

const TIME_TOKEN = /^\d{1,2}:\d{2}$/;

/** Replace dashes with what the guides use instead: "6:15 to 7:30", "5-7 mins", or a comma in prose. */
function fixDashes(s: string): string {
  // Numeric ranges. Two clock times (or a trailing AM/PM) read as "to"; anything else is a hyphen
  // so verse ranges like John 15:1-8 stay intact.
  s = s.replace(
    new RegExp(`(\\d[\\d:]*)\\s*[${DASH}]\\s*(\\d[\\d:]*)(\\s*[AaPp]\\.?[Mm]\\b\\.?)?`, "g"),
    (_m, a: string, b: string, ampm?: string) => {
      const isTime = (TIME_TOKEN.test(a) && TIME_TOKEN.test(b)) || Boolean(ampm);
      return `${a}${isTime ? " to " : "-"}${b}${ampm ?? ""}`;
    },
  );
  // Dash after existing punctuation: just drop it.
  s = s.replace(new RegExp(`([.,;:!?])[ \\t]*[${DASH}]+[ \\t]*`, "g"), "$1 ");
  // Dash at the start or end of a line.
  s = s.replace(new RegExp(`^[ \\t]*[${DASH}]+[ \\t]*`, "gm"), "");
  s = s.replace(new RegExp(`[ \\t]*[${DASH}]+[ \\t]*$`, "gm"), "");
  // Spaced dash in prose reads as a pause: comma.
  s = s.replace(new RegExp(`[ \\t]+[${DASH}]+[ \\t]+`, "g"), ", ");
  // Unspaced en dash between words is a hyphen (Mon-Fri); unspaced em dash is a pause.
  s = s.replace(/([\p{L}\p{N}])[‒–]([\p{L}\p{N}])/gu, "$1-$2");
  s = s.replace(/([\p{L}\p{N}])[—―]+([\p{L}\p{N}])/gu, "$1, $2");
  // Anything left.
  s = s.replace(/[‒–]/g, "-").replace(/[—―]+/g, ", ");
  return s;
}

export type SanitizeResult = { text: string; changes: string[] };

export function sanitizeText(input: string): SanitizeResult {
  let s = input ?? "";
  const changes: string[] = [];

  s = s.replace(/\r\n?/g, "\n").replace(/ /g, " ").replace(ZERO_WIDTH, "");

  if (CURLY_ANY.test(s)) {
    s = s.replace(CURLY_SINGLE, "'").replace(CURLY_DOUBLE, '"');
    changes.push("straightened curly quotes");
  }
  if (DASH_RE.test(s)) {
    s = fixDashes(s);
    changes.push("replaced dashes");
  }
  if (EMOJI_TEST.test(s)) {
    s = s.replace(EMOJI_RE, "").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/gm, "");
    changes.push("removed emoji");
  }
  s = s.trim();
  return { text: s, changes };
}

/** Sanitize every string inside a value (objects, arrays). Returns the cleaned value and a change summary. */
export function sanitizeDeep<T>(value: T): { value: T; changes: string[] } {
  const all = new Set<string>();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const r = sanitizeText(v);
      r.changes.forEach((c) => all.add(c));
      return r.text;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = walk(x);
      return o;
    }
    return v;
  };
  return { value: walk(value) as T, changes: [...all] };
}
