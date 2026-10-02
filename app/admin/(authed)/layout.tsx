import { connection } from "next/server";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  // Admin pages always read live data; never prerender them at build time.
  await connection();
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/admin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nexus-logo-white.png" width={900} height={223} alt="Nexus" />
          <span>Admin</span>
        </a>
        <AdminNav />
        <span className="spacer" />
        <div className="right">
          <a href="/" target="_blank" rel="noopener">
            View guide<span className="hide-sm"> &#8599;</span>
          </a>
          <form action={logoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
