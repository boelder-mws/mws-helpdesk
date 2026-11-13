import { readFile } from "node:fs/promises";
import { LOGO_TYPES, readBrandingSettings } from "@/lib/branding";
import { uploadPath } from "@/lib/uploads";

// Public on purpose: the sign-in page shows the logo before anyone is signed in.
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readBrandingSettings();
  if (!s.logoKey || !s.logoMime || !(LOGO_TYPES as readonly string[]).includes(s.logoMime)) {
    return new Response("Not found", { status: 404 });
  }
  let data: Buffer;
  try {
    data = await readFile(uploadPath(s.logoKey));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": s.logoMime,
      "X-Content-Type-Options": "nosniff",
      // An SVG opened directly can't run scripts or reach the app's cookies.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
