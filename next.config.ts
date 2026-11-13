import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// Single source of truth for the app version: package.json.
const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (.next/standalone).
  output: "standalone",
  // Every screen is per-user and read live from PostgreSQL, so the
  // prerender-first Cache Components model is switched off.
  cacheComponents: false,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_VERSION: version },
  serverExternalPackages: ["pg", "nodemailer"],
  experimental: {
    serverActions: {
      // Ticket forms carry file attachments.
      bodySizeLimit: "30mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
