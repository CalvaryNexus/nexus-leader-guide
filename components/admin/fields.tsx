"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { sanitizeText } from "@/lib/sanitize";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type TextFieldProps = {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  inputClassName?: string;
  ariaLabel?: string;
  big?: boolean;
  autoFocus?: boolean;
  /** Skip the typography clean-up (only for things like codes). */
  raw?: boolean;
};

/**
 * Text input that applies the typography rules (no dashes, no emoji, straight quotes) when you
 * leave the field, and says what it fixed, so the change is visible rather than silent.
 */
export function TextField(p: TextFieldProps) {
  const [note, setNote] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow textareas with their content (fallback for browsers without field-sizing).
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 3}px`;
  }, [p.value, p.multiline]);

  const onBlur = () => {
    if (p.raw) return;
    const r = sanitizeText(p.value);
    if (r.text !== p.value) {
      p.onChange(r.text);
      if (r.changes.length) {
        setNote(`${capitalize(r.changes.join(", "))}.`);
        window.setTimeout(() => setNote(null), 5000);
      }
    }
  };

  const cls = `${p.multiline ? "textarea" : "input"}${p.big ? " big" : ""}${p.inputClassName ? ` ${p.inputClassName}` : ""}`;
  const control = p.multiline ? (
    <textarea
      ref={ref}
      className={cls}
      rows={1}
      value={p.value}
      placeholder={p.placeholder}
      aria-label={p.ariaLabel}
      autoFocus={p.autoFocus}
      onChange={(e) => p.onChange(e.target.value)}
      onBlur={onBlur}
    />
  ) : (
    <input
      className={cls}
      type="text"
      value={p.value}
      placeholder={p.placeholder}
      aria-label={p.ariaLabel}
      autoFocus={p.autoFocus}
      onChange={(e) => p.onChange(e.target.value)}
      onBlur={onBlur}
    />
  );

  if (!p.label) {
    return (
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        {control}
        {note && <span className="fixnote">{note}</span>}
      </div>
    );
  }
  return (
    <label className="field">
      <span className="label">{p.label}</span>
      {control}
      {note ? <span className="fixnote">{note}</span> : p.hint ? <span className="hint">{p.hint}</span> : null}
    </label>
  );
}

let idCounter = 0;
const nextId = () => `i${++idCounter}`;

/** Strip list markers that come along when pasting from a doc: "1.", "1)", "-", bullets. */
export function splitPastedList(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:\d{1,2}\s*[.)]|[-*•●◦])\s*/, "").trim())
    .filter(Boolean)
    .map((l) => sanitizeText(l).text);
}

type ItemListProps = {
  items: string[];
  onChange: (items: string[]) => void;
  noun: string; // "question", "rule"
  numberStyle?: "01" | "1";
  placeholder?: string;
};

/** Variable-length ordered list: add, remove, reorder, or paste a whole list at once. */
export function ItemList({ items, onChange, noun, numberStyle = "01", placeholder }: ItemListProps) {
  const [ids, setIds] = useState<string[]>(() => items.map(nextId));
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState("");

  // Keep ids aligned if the list was replaced from outside (e.g. after save).
  const keys = ids.length === items.length ? ids : items.map((_, i) => ids[i] ?? nextId());
  useEffect(() => {
    if (keys !== ids) setIds(keys);
  }, [keys, ids]);

  const update = (next: string[], nextIds: string[]) => {
    setIds(nextIds);
    onChange(next);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = [...items];
    const k = [...keys];
    [a[i], a[j]] = [a[j], a[i]];
    [k[i], k[j]] = [k[j], k[i]];
    update(a, k);
  };
  const remove = (i: number) => update(items.filter((_, x) => x !== i), keys.filter((_, x) => x !== i));
  const add = () => {
    const id = nextId();
    setFocusId(id);
    update([...items, ""], [...keys, id]);
  };
  const addPasted = () => {
    const lines = splitPastedList(paste);
    if (!lines.length) return;
    update([...items.filter((s) => s.trim()), ...lines], [...keys.filter((_, i) => items[i].trim()), ...lines.map(nextId)]);
    setPaste("");
    setPasteOpen(false);
  };
  const num = (i: number) => (numberStyle === "01" ? String(i + 1).padStart(2, "0") : String(i + 1));

  return (
    <div>
      {items.length > 0 && (
        <ol className="items">
          {items.map((it, i) => (
            <li className="item" key={keys[i]}>
              <span className="num" aria-hidden>
                {num(i)}
              </span>
              <TextField
                multiline
                value={it}
                onChange={(v) => onChange(items.map((x, xi) => (xi === i ? v : x)))}
                ariaLabel={`${capitalize(noun)} ${i + 1}`}
                placeholder={placeholder}
                autoFocus={focusId === keys[i]}
              />
              <span className="tools">
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${noun} ${i + 1} up`}>
                  &uarr;
                </button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${noun} ${i + 1} down`}>
                  &darr;
                </button>
                <button type="button" className="icon-btn danger" onClick={() => remove(i)} aria-label={`Remove ${noun} ${i + 1}`}>
                  &times;
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="list-foot">
        <button type="button" className="btn ghost sm" onClick={add}>
          + Add {noun}
        </button>
        <button type="button" className="btn quiet sm" onClick={() => setPasteOpen((o) => !o)} aria-expanded={pasteOpen}>
          Paste a list
        </button>
        <span className="hint">Use **double asterisks** for bold.</span>
      </div>
      {pasteOpen && (
        <div className="paste-box">
          <textarea
            className="textarea"
            rows={5}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={`Paste ${noun}s here, one per line. Numbers and bullets are removed.`}
            autoFocus
          />
          <div className="btn-row">
            <button type="button" className="btn sm" onClick={addPasted} disabled={!paste.trim()}>
              Add {splitPastedList(paste).length || ""} {noun}
              {splitPastedList(paste).length === 1 ? "" : "s"}
            </button>
            <button type="button" className="btn quiet sm" onClick={() => setPasteOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Group({ n, title, hint, carry, children, id }: { n: number; title: string; hint?: ReactNode; carry?: boolean; children: ReactNode; id: string }) {
  return (
    <section className="panel group" id={id}>
      <div className="group-head">
        <span className="group-num">{n}</span>
        <h2>{title}</h2>
        {carry && <span className="carry">Carries over weekly</span>}
        {hint && <p className="hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
