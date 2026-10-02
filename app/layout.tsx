import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./admin.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Nexus Admin", template: "%s | Nexus Admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1C326A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
