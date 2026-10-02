import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminPassword } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="center-page" style={{ background: "var(--navy)" }}>
      <div className="panel narrow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-logo" src="/nexus-logo-navy.png" width={900} height={223} alt="Nexus" />
        <h1 className="page-title" style={{ textAlign: "center", fontSize: 22 }}>
          Leader Guide Admin
        </h1>
        <p className="muted" style={{ textAlign: "center", margin: "6px 0 20px", fontSize: 14 }}>
          Sign in with the admin password.
        </p>
        {!adminPassword() && (
          <p className="alert warn" style={{ marginBottom: 14 }}>
            ADMIN_PASSWORD is not set on the server yet. Add it as an environment variable, then redeploy.
          </p>
        )}
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}
