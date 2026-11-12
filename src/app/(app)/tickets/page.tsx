import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isStaff, requireUser } from "@/lib/auth/guards";
import { listTickets, queueCounts, ticketFormOptions } from "@/lib/tickets";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tickets" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TicketsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const staff = isStaff(user);
  const sp = await searchParams;
  const view = one(sp.view) ?? "open";
  const filters = {
    view,
    status: one(sp.status),
    priority: one(sp.priority),
    category: one(sp.category),
    assignee: one(sp.assignee),
    q: one(sp.q),
    sort: one(sp.sort),
    page: Number(one(sp.page)) || 1,
  };

  const [result, options, counts] = await Promise.all([
    listTickets(user, filters),
    ticketFormOptions(),
    staff ? queueCounts(user) : null,
  ]);
  const now = new Date();

  const tabs: { view: string; label: string; count?: number }[] = counts
    ? [
        { view: "open", label: "All open", count: counts.open },
        { view: "mine", label: "Assigned to me", count: counts.mine },
        { view: "unassigned", label: "Unassigned", count: counts.unassigned },
        { view: "team", label: "My teams", count: counts.team },
        { view: "overdue", label: "Overdue", count: counts.overdue },
        { view: "all", label: "Everything" },
      ]
    : [
        { view: "open", label: "Open" },
        { view: "all", label: "All my tickets" },
      ];

  const link = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) {
      const value = one(v);
      if (value) next.set(k, value);
    }
    const qs = next.toString();
    return qs ? `/tickets?${qs}` : "/tickets";
  };
  const filtered = Boolean(filters.status || filters.priority || filters.category || filters.assignee || filters.q);

  return (
    <>
      <PageHeader
        title={staff ? "Tickets" : "My tickets"}
        description={staff ? undefined : "Everything you've asked IT for, and where it stands."}
      >
        <Button asChild>
          <Link href="/tickets/new">
            <Plus /> New ticket
          </Link>
        </Button>
      </PageHeader>

      <nav aria-label="Ticket views" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => {
          const active = tab.view === view;
          return (
            <Link
              key={tab.view}
              href={link({ view: tab.view === "open" ? undefined : tab.view, page: undefined })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "num text-xs",
                    !active && tab.view === "overdue" && tab.count > 0 && "font-semibold text-danger",
                    active && "opacity-75",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mb-4">
        <TicketFilters categories={options.categories} staff={options.staff} showAssignee={staff} />
      </div>

      <Card className="overflow-hidden">
        {result.rows.length > 0 ? (
          <TicketTable rows={result.rows} staff={staff} now={now} />
        ) : filtered ? (
          <EmptyState
            title="No tickets match these filters"
            action={
              <Button asChild variant="outline">
                <Link href={link({ status: undefined, priority: undefined, category: undefined, assignee: undefined, q: undefined, page: undefined })}>
                  Clear filters
                </Link>
              </Button>
            }
          />
        ) : staff ? (
          <EmptyState title="Nothing in this view">Tickets show up here as they come in.</EmptyState>
        ) : (
          <EmptyState
            title="You have no open tickets"
            action={
              <Button asChild>
                <Link href="/tickets/new">
                  <Plus /> New ticket
                </Link>
              </Button>
            }
          >
            When something isn&apos;t working, open a ticket and IT will pick it up.
          </EmptyState>
        )}
      </Card>

      {result.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span className="num">
            Page {result.page} of {result.pages} · {result.total} tickets
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className={cn(result.page <= 1 && "pointer-events-none opacity-50")}>
              <Link href={link({ page: String(result.page - 1) })} aria-disabled={result.page <= 1}>
                Previous
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(result.page >= result.pages && "pointer-events-none opacity-50")}
            >
              <Link href={link({ page: String(result.page + 1) })} aria-disabled={result.page >= result.pages}>
                Next
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
