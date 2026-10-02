"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Weeks", match: (p: string) => p === "/admin" || p.startsWith("/admin/weeks") },
  { href: "/admin/series", label: "Series", match: (p: string) => p.startsWith("/admin/series") },
  { href: "/admin/settings", label: "Settings", match: (p: string) => p.startsWith("/admin/settings") },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="topnav" aria-label="Admin">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
