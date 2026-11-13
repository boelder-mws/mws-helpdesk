import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBranding();
  return {
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: "Report IT problems and follow them through to a fix.",
    icons: { icon: brand.logoUrl ?? "/icon.svg" },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBranding();
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Colours chosen under Settings > Branding, layered over the defaults in globals.css. */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: brand.css }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
