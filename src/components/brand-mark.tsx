import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrandProps = {
  name: string;
  logoUrl: string | null;
  lightTile: boolean;
  showName: boolean;
};

/** The logo and/or name shown at the top of the sidebar and on the sign-in page. */
export function BrandMark({ name, logoUrl, lightTile, showName, className }: BrandProps & { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5 font-semibold text-sidebar-strong", className)}>
      {logoUrl ? (
        <span className={cn("flex shrink-0 items-center", lightTile && "rounded-md bg-white p-1.5")}>
          {/* A plain img: the logo is an uploaded file served by this app. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={showName ? "" : name} className="h-8 w-auto max-w-40 object-contain" />
        </span>
      ) : (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Ticket className="size-4" />
        </span>
      )}
      {(showName || !logoUrl) && <span className="truncate">{name}</span>}
    </span>
  );
}
