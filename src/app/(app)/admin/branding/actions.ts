"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { readBrandingSettings, sniffImage, type BrandingSettings } from "@/lib/branding";
import { contrast, HEX, MIN_ACCENT_CONTRAST } from "@/lib/color";
import { env } from "@/lib/env";
import { deleteStoredFiles, uploadPath } from "@/lib/uploads";

export type BrandingState = { error?: string } | undefined;

const MAX_LOGO_BYTES = 1024 * 1024;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveBranding(_prev: BrandingState, form: FormData): Promise<BrandingState> {
  const admin = await requireAdmin();

  const name = text(form, "name");
  const accent = text(form, "accent").toLowerCase();
  const panel = text(form, "panel").toLowerCase();

  if (name.length > 60) return { error: "Keep the name under 60 characters." };
  if (!HEX.test(accent) || !HEX.test(panel)) {
    return { error: "Enter colours as six-digit hex codes, like #0b5a6b." };
  }
  const ratio = contrast(accent, "#ffffff");
  if (ratio < MIN_ACCENT_CONTRAST) {
    return {
      error: `That accent colour is too light. Buttons and links need at least ${MIN_ACCENT_CONTRAST}:1 contrast with white, and this has ${ratio.toFixed(1)}:1. Pick a darker shade.`,
    };
  }

  const current = await readBrandingSettings();
  let { logoKey, logoMime } = current;
  let replacedKey: string | null = null;

  const upload = form.get("logo");
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > MAX_LOGO_BYTES) return { error: "The logo is larger than 1 MB. Use a smaller file." };
    const bytes = Buffer.from(await upload.arrayBuffer());
    const mime = sniffImage(bytes);
    if (!mime) return { error: "The logo must be a PNG, JPEG, GIF, WebP or SVG image." };
    if (mime === "image/svg+xml" && /<script|javascript:/i.test(bytes.toString("utf8"))) {
      return { error: "SVG logos can't contain scripts. Export a plain SVG and try again." };
    }
    await mkdir(path.resolve(env.uploadDir), { recursive: true });
    const key = `brand-${randomUUID()}`;
    await writeFile(uploadPath(key), bytes);
    replacedKey = logoKey;
    logoKey = key;
    logoMime = mime;
  } else if (form.get("removeLogo") === "on" && logoKey) {
    replacedKey = logoKey;
    logoKey = null;
    logoMime = null;
  }

  const next: BrandingSettings = {
    name,
    accent,
    panel,
    logoKey,
    logoMime,
    lightTile: form.get("lightTile") === "on",
    showName: form.get("showName") === "on",
    version: Date.now(),
  };
  await db
    .insert(settings)
    .values({ key: "branding", value: next })
    .onConflictDoUpdate({ target: settings.key, set: { value: next } });
  if (replacedKey) await deleteStoredFiles([replacedKey]);

  console.log(`[audit] branding changed by ${admin.email}`);
  revalidatePath("/", "layout");
  redirect("/admin/branding?saved=1");
}

export async function resetBranding() {
  const admin = await requireAdmin();
  const current = await readBrandingSettings();
  await db.delete(settings).where(eq(settings.key, "branding"));
  if (current.logoKey) await deleteStoredFiles([current.logoKey]);
  console.log(`[audit] branding reset to defaults by ${admin.email}`);
  revalidatePath("/", "layout");
  redirect("/admin/branding?saved=reset");
}
