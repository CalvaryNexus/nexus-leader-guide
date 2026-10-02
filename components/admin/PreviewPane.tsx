"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const DEVICES = { phone: 390, desktop: 1280 } as const;
type Device = keyof typeof DEVICES;

/**
 * Live preview. The iframe gets the exact HTML the public guide serves (same render function),
 * so the page's own breakpoints apply at phone or desktop width. After the first load only the
 * body is swapped, which keeps the scroll position while typing.
 */
export function PreviewPane({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  const [device, setDevice] = useState<Device>("phone");
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    const doc = f.contentDocument;
    if (loaded.current && doc?.body) {
      const next = new DOMParser().parseFromString(html, "text/html");
      doc.body.innerHTML = next.body.innerHTML;
    } else {
      f.srcdoc = html;
    }
  }, [html]);

  const width = DEVICES[device];
  const scale = size.w ? Math.min(1, size.w / width) : 1;
  const height = size.h ? size.h / scale : 600;

  return (
    <>
      <div className="pv-head">
        <span className="label">Live preview</span>
        <div className="seg" role="group" aria-label="Preview width">
          {(Object.keys(DEVICES) as Device[]).map((d) => (
            <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>
              {d === "phone" ? "Phone" : "Desktop"}
            </button>
          ))}
        </div>
      </div>
      <div className="pv-stage">
        <div ref={stage} style={{ position: "absolute", inset: 14 }} aria-hidden />
        <div className="pv-frame-wrap" style={{ width, height, transform: `scale(${scale})` }}>
          <iframe
            ref={frame}
            title="Guide preview"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => {
              loaded.current = true;
            }}
          />
        </div>
      </div>
    </>
  );
}
