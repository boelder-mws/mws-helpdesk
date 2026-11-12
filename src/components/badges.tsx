import { ArrowDown, ArrowUp, CircleCheck, Clock, Flame, Minus, TriangleAlert } from "lucide-react";
import type { TicketPriority, TicketStatus } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { currentSla, type SlaInput } from "@/lib/sla";
import { cn } from "@/lib/utils";

const STATUS_VARIANT = {
  open: "info",
  in_progress: "accent",
  pending: "warn",
  resolved: "ok",
  closed: "neutral",
} as const;

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const PRIORITY_STYLE = {
  urgent: { icon: Flame, className: "text-danger" },
  high: { icon: ArrowUp, className: "text-serious" },
  normal: { icon: Minus, className: "text-muted-foreground" },
  low: { icon: ArrowDown, className: "text-muted-foreground" },
} as const;

export function PriorityLabel({ priority, className }: { priority: TicketPriority; className?: string }) {
  const { icon: Icon, className: tone } = PRIORITY_STYLE[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[0.8125rem] font-medium whitespace-nowrap", tone, className)}>
      <Icon className="size-3.5" aria-hidden />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function span(ms: number) {
  const mins = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  if (mins < 60) return `${mins}m`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

/** The SLA target that matters now: time left, overdue, met or missed. */
export function SlaChip({ ticket, now }: { ticket: SlaInput; now: Date }) {
  const sla = currentSla(ticket, now);
  if (!sla) return <span className="text-muted-foreground">—</span>;
  const what = sla.kind === "response" ? "Reply" : "Fix";
  if (sla.done) {
    return sla.overdue ? (
      <Badge variant="outline">
        <TriangleAlert /> Missed target
      </Badge>
    ) : (
      <Badge variant="outline">
        <CircleCheck /> Met target
      </Badge>
    );
  }
  const left = sla.due.getTime() - now.getTime();
  if (sla.overdue) {
    return (
      <Badge variant="danger">
        <TriangleAlert /> {what} overdue {span(left)}
      </Badge>
    );
  }
  const soon = left < 2 * 3600_000;
  return (
    <Badge variant={soon ? "warn" : "neutral"}>
      <Clock /> {what} due in {span(left)}
    </Badge>
  );
}
