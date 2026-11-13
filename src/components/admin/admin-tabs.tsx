"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/users", label: "People" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/sla", label: "Targets and hours" },
  { href: "/admin/branding", label: "Branding" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="mb-6 flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
