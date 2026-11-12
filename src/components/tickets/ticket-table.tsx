import Link from "next/link";
import { PriorityLabel, SlaChip, StatusBadge } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timeAgo } from "@/lib/format";
import type { TicketRow } from "@/lib/tickets";
import { cn } from "@/lib/utils";

const EDGE = {
  urgent: "bg-danger",
  high: "bg-serious",
  normal: "bg-transparent",
  low: "bg-transparent",
} as const;

export function TicketTable({ rows, staff, now }: { rows: TicketRow[]; staff: boolean; now: Date }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-16 pl-5">No.</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Priority</TableHead>
          {staff && <TableHead className="hidden md:table-cell">Assigned to</TableHead>}
          <TableHead className="hidden md:table-cell">Target</TableHead>
          <TableHead className="hidden pr-5 text-right lg:table-cell">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="num relative pl-5 text-muted-foreground">
              {/* Left edge marks urgent and high priority so they stand out when scanning. */}
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", EDGE[t.priority])} />
              <Link href={`/tickets/${t.number}`} tabIndex={-1}>
                #{t.number}
              </Link>
            </TableCell>
            <TableCell className="max-w-0 min-w-52 w-full">
              <Link href={`/tickets/${t.number}`} className="block truncate font-medium hover:underline">
                {t.subject}
              </Link>
              <span className="block truncate text-[0.8125rem] text-muted-foreground">
                {[staff ? t.requesterName : null, t.categoryName, staff ? t.teamName : null].filter(Boolean).join(" · ") ||
                  "No category"}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge status={t.status} />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <PriorityLabel priority={t.priority} />
            </TableCell>
            {staff && (
              <TableCell className="hidden whitespace-nowrap md:table-cell">
                {t.assigneeName ?? <span className="text-muted-foreground">Unassigned</span>}
              </TableCell>
            )}
            <TableCell className="hidden md:table-cell">
              <SlaChip ticket={t} now={now} />
            </TableCell>
            <TableCell className="hidden pr-5 text-right whitespace-nowrap text-muted-foreground lg:table-cell">
              {timeAgo(t.updatedAt, now)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
