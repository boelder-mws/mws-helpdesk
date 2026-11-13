import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_ACCENT, DEFAULT_PANEL, HEX, themeCss } from "./color";
import { env } from "./env";

export type BrandingSettings = {
  /** Empty means "use ORG_NAME from .env". */
  name: string;
  accent: string;
  panel: string;
  logoKey: string | null;
  logoMime: string | null;
  /** Show the logo on a white tile (for logos drawn for light backgrounds). */
  lightTile: boolean;
  /** Show the name beside the logo. */
  showName: boolean;
  /** Changes on every save; busts browser caches of the logo. */
  version: number;
};

export const BRANDING_DEFAULTS: BrandingSettings = {
  name: "",
  accent: DEFAULT_ACCENT,
  panel: DEFAULT_PANEL,
  logoKey: null,
  logoMime: null,
  lightTile: false,
  showName: true,
  version: 0,
};

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

export async function readBrandingSettings(): Promise<BrandingSettings> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "branding"));
    const v = (row?.value ?? {}) as Partial<BrandingSettings>;
    return {
      name: typeof v.name === "string" ? v.name : "",
      accent: typeof v.accent === "string" && HEX.test(v.accent) ? v.accent : DEFAULT_ACCENT,
      panel: typeof v.panel === "string" && HEX.test(v.panel) ? v.panel : DEFAULT_PANEL,
      logoKey: typeof v.logoKey === "string" ? v.logoKey : null,
      logoMime: typeof v.logoMime === "string" && (LOGO_TYPES as readonly string[]).includes(v.logoMime) ? v.logoMime : null,
      lightTile: v.lightTile === true,
      showName: v.showName !== false,
      version: typeof v.version === "number" ? v.version : 0,
    };
  } catch {
    return BRANDING_DEFAULTS; // never stop a page from rendering over a theme lookup
  }
}

/** Resolved branding for the current request. */
export const getBranding = cache(async () => {
  const s = await readBrandingSettings();
  const hasLogo = Boolean(s.logoKey && s.logoMime);
  return {
    ...s,
    name: s.name || env.orgName,
    logoUrl: hasLogo ? `/branding/logo?v=${s.version}` : null,
    css: themeCss(s.accent, s.panel),
  };
});

export type Brand = Awaited<ReturnType<typeof getBranding>>;

/** Identifies an image by its first bytes, never by its file name or declared type. */
export function sniffImage(buf: Buffer): LogoType | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  const head = buf.subarray(0, 6).toString("latin1");
  if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  if (buf.length > 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  const text = buf.subarray(0, 4096).toString("utf8").replace(/^﻿/, "").trimStart();
  if (text.startsWith("<") && /<svg[\s>]/i.test(text)) return "image/svg+xml";
  return null;
}
