"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartColumn, Inbox, LayoutDashboard, LogOut, Menu, Plus, Settings, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Initials } from "@/components/page-header";
import { cn } from "@/lib/utils";

const ICONS = { dashboard: LayoutDashboard, tickets: Inbox, kb: BookOpen, reports: ChartColumn, admin: Settings };

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };
type Props = { items: NavItem[]; orgName: string; user: { name: string; email: string; role: string } };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The form lives outside the menu, which unmounts as soon as an item is chosen. */
function SignOut() {
  return (
    <DropdownMenuItem onSelect={() => document.querySelector<HTMLFormElement>("#sign-out")?.submit()}>
      <LogOut /> Sign out
    </DropdownMenuItem>
  );
}

export function SignOutForm() {
  return <form id="sign-out" action="/auth/logout" method="post" hidden />;
}

function Brand({ orgName }: { orgName: string }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold text-white">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Ticket className="size-4" />
      </span>
      <span className="truncate">{orgName}</span>
    </Link>
  );
}

export function Sidebar({ items, orgName, user }: Props) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="px-4 pt-5 pb-4">
        <Brand orgName={orgName} />
      </div>
      <div className="px-3 pb-3">
        <Button asChild className="w-full justify-start">
          <Link href="/tickets/new">
            <Plus /> New ticket
          </Link>
        </Button>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-sidebar-accent/60">
            <Initials name={user.name} className="bg-sidebar-accent text-white" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{user.name}</span>
              <span className="block truncate text-xs text-sidebar-muted">{user.role}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>
              <span className="block font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SignOut />
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Version {process.env.NEXT_PUBLIC_APP_VERSION}
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

export function MobileBar({ items, orgName, user }: Props) {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-sidebar px-4 lg:hidden">
      <Brand orgName={orgName} />
      <div className="flex items-center gap-1.5">
        <Button asChild size="sm">
          <Link href="/tickets/new">
            <Plus /> New ticket
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Menu"
            className="flex size-9 items-center justify-center rounded-md text-white hover:bg-sidebar-accent"
          >
            <Menu className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {items.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className={cn(isActive(pathname, item.href) && "font-semibold")}>
                    <Icon /> {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              <span className="block font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <SignOut />
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Version {process.env.NEXT_PUBLIC_APP_VERSION}
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
