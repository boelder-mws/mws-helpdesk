import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/page-header";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { isStaff, requireUser } from "@/lib/auth/guards";
import { listTickets, queueCounts } from "@/lib/tickets";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  if (!isStaff(user)) redirect("/tickets");

  const [counts, mine, unassigned] = await Promise.all([
    queueCounts(user),
    listTickets(user, { view: "mine", sort: "due" }),
    listTickets(user, { view: "unassigned", sort: "due" }),
  ]);
  const now = new Date();
  const tiles = [
    { label: "Unassigned", value: counts.unassigned, href: "/tickets?view=unassigned", hint: "Waiting for someone to pick up" },
    { label: "Assigned to me", value: counts.mine, href: "/tickets?view=mine", hint: "Open tickets you own" },
    { label: "Overdue", value: counts.overdue, href: "/tickets?view=overdue", hint: "Past a reply or fix target", alert: counts.overdue > 0 },
    { label: "All open", value: counts.open, href: "/tickets", hint: "Across every team" },
  ];

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} description="Here's what needs attention." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <span className="text-sm text-muted-foreground">{t.label}</span>
            <span className={cn("mt-1 block text-3xl leading-none font-semibold", t.alert && "text-danger")}>
              {t.value}
            </span>
            <span className="mt-2 block text-[0.8125rem] text-muted-foreground">{t.hint}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6">
        {[
          { title: "Assigned to me", data: mine, href: "/tickets?view=mine", empty: "Nothing assigned to you right now." },
          { title: "Unassigned", data: unassigned, href: "/tickets?view=unassigned", empty: "Every open ticket has an owner." },
        ].map((section) => (
          <Card key={section.title} className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>{section.title}</CardTitle>
              {section.data.total > 8 && (
                <Link href={section.href} className="text-sm font-medium text-primary hover:underline">
                  View all {section.data.total}
                </Link>
              )}
            </CardHeader>
            {section.data.rows.length > 0 ? (
              <TicketTable rows={section.data.rows.slice(0, 8)} staff now={now} />
            ) : (
              <EmptyState title={section.empty} />
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
