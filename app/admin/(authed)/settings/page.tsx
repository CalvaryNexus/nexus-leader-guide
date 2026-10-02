import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <main className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div>
          <span className="eyebrow">Leader Guide</span>
          <h1 className="page-title">Settings</h1>
        </div>
      </div>
      <SettingsForm settings={settings} />
      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Admin password</h2>
        <p className="lede" style={{ margin: 0 }}>
          Set with the <code>ADMIN_PASSWORD</code> environment variable in Vercel (Project Settings, Environment Variables), then redeploy.
          Changing it signs out every admin session.
        </p>
      </section>
    </main>
  );
}
