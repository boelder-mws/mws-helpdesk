import { CircleCheck } from "lucide-react";
import { BrandingForm } from "@/components/admin/branding-form";
import { getBranding, readBrandingSettings } from "@/lib/branding";
import { env } from "@/lib/env";

export default async function BrandingPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [brand, saved, sp] = await Promise.all([getBranding(), readBrandingSettings(), searchParams]);
  return (
    <div className="grid max-w-5xl gap-6">
      {sp.saved && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-ok-bg px-3 py-2.5 text-sm text-ok">
          <CircleCheck className="size-4" />
          {sp.saved === "reset" ? "Branding is back to the defaults." : "Saved. The new look is live for everyone."}
        </p>
      )}
      <BrandingForm
        initial={{
          name: saved.name, // empty = use the default name
          defaultName: env.orgName,
          accent: brand.accent,
          panel: brand.panel,
          logoUrl: brand.logoUrl,
          lightTile: brand.lightTile,
          showName: brand.showName,
        }}
      />
    </div>
  );
}
