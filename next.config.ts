import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Embedded Postgres for local development only; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The PDF routes read fonts and the logo from disk.
  outputFileTracingIncludes: {
    "/weeks/**": ["./assets/fonts/*.ttf", "./public/nexus-logo-white.png"],
  },
  async headers() {
    return [
      {
        source: "/nexus-logo-:variant.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
