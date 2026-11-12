import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        neutral: "bg-secondary text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        info: "bg-info-bg text-info",
        ok: "bg-ok-bg text-ok",
        warn: "bg-warn-bg text-warn",
        serious: "bg-serious-bg text-serious",
        danger: "bg-danger-bg text-danger",
        accent: "bg-accent text-accent-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
