import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { CategoryChart, DailyChart } from "@/components/reports/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/guards";
import { formatSpan } from "@/lib/format";
import { getReport } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const RANGES = [7, 30, 90];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff();
  const requested = Number((await searchParams).days);
  const days = RANGES.includes(requested) ? requested : 30;
  const { daily, summary: s, byCategory, byAgent } = await getReport(days);

  const span = (secs: number | null) => (secs === null ? "—" : formatSpan(secs * 1000));
  const pct = (met: number, total: number) => (total === 0 ? "—" : `${Math.round((met / total) * 100)}%`);
  const tiles = [
    { label: "Created", value: String(s.created), hint: `in the last ${days} days` },
    { label: "Resolved", value: String(s.resolved), hint: `in the last ${days} days` },
    { label: "Open now", value: String(s.open_now), hint: "not yet resolved" },
    { label: "Median first reply", value: span(s.median_response), hint: "from opened to first reply" },
    { label: "Median time to fix", value: span(s.median_resolution), hint: "from opened to resolved" },
    {
      label: "Fixed within target",
      value: pct(s.resolution_met, s.resolution_total),
      hint: s.resolution_total ? `${s.resolution_met} of ${s.resolution_total} resolved tickets` : "no resolved tickets yet",
    },
  ];

  return (
    <>
      <PageHeader title="Reports" description="Ticket volume and how quickly IT is responding.">
        <nav aria-label="Date range" className="flex rounded-md border bg-card p-0.5">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/reports" : `/reports?days=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={cn(
                "rounded px-3 py-1 text-sm font-medium",
                r === days ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </PageHeader>

      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{t.label}</dt>
            <dd className="mt-1 text-2xl leading-tight font-semibold">{t.value}</dd>
            <dd className="mt-1 text-[0.8125rem] text-muted-foreground">{t.hint}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tickets created and resolved per day</CardTitle>
            <CardDescription>When resolved keeps pace with created, the queue isn&apos;t growing.</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyChart data={daily} />
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as a table</summary>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      <TableHead className="text-right">Resolved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daily.map((d) => (
                      <TableRow key={d.day}>
                        <TableCell className="num">{d.day}</TableCell>
                        <TableCell className="num text-right">{d.created}</TableCell>
                        <TableCell className="num text-right">{d.resolved}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          </CardContent>
        </Card>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tickets created by category</CardTitle>
              <CardDescription>Last {days} days.</CardDescription>
            </CardHeader>
            <CardContent>
              {byCategory.length > 0 ? <CategoryChart data={byCategory} /> : <EmptyState title="No tickets in this period" />}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle>By agent</CardTitle>
              <CardDescription>Resolved in the last {days} days, and what each person still has open.</CardDescription>
            </CardHeader>
            {byAgent.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Agent</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="pr-5 text-right">Median time to fix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byAgent.map((a) => (
                    <TableRow key={a.name}>
                      <TableCell className="pl-5 font-medium">{a.name}</TableCell>
                      <TableCell className="num text-right">{a.resolved}</TableCell>
                      <TableCell className="num text-right">{a.open}</TableCell>
                      <TableCell className="num pr-5 text-right">{span(a.median_resolution)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No assigned tickets yet" />
            )}
          </Card>
        </div>
      </div>

      <p className="mt-6 text-[0.8125rem] text-muted-foreground">
        Reply and fix times are measured in clock time; targets follow the business hours set under Settings.
        {s.response_total > 0 && ` First reply within target: ${pct(s.response_met, s.response_total)} (${s.response_met} of ${s.response_total}).`}
      </p>
    </>
  );
}
