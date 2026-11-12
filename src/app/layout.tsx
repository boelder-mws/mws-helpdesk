import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: { default: env.orgName, template: `%s · ${env.orgName}` },
    description: "Report IT problems and follow them through to a fix.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
