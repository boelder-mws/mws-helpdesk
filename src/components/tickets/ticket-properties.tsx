"use client";

import { useState, useTransition } from "react";
import { updateTicket } from "@/app/(app)/tickets/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TicketPriority, TicketStatus } from "@/db/schema";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from "@/lib/labels";

type Option = { id: string; name: string };
type Field = Parameters<typeof updateTicket>[1];

export function TicketProperties({
  ticket,
  me,
  staff,
  teams,
  categories,
}: {
  ticket: {
    id: string;
    status: TicketStatus;
    priority: TicketPriority;
    assigneeId: string | null;
    teamId: string | null;
    categoryId: string | null;
  };
  me: string;
  staff: Option[];
  teams: Option[];
  categories: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(field: Field, value: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateTicket(ticket.id, field, value);
      if (result?.error) setError(result.error);
    });
  }

  const row = "grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2";
  const label = "text-sm text-muted-foreground";

  return (
    <div className="grid gap-2.5" aria-busy={pending}>
      {error && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className={row}>
        <span className={label}>Status</span>
        <Select value={ticket.status} onValueChange={(v) => change("status", v)} disabled={pending}>
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={row}>
        <span className={label}>Priority</span>
        <Select value={ticket.priority} onValueChange={(v) => change("priority", v)} disabled={pending}>
          <SelectTrigger aria-label="Priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={row}>
        <span className={label}>Assigned to</span>
        <Select value={ticket.assigneeId ?? "none"} onValueChange={(v) => change("assignee", v)} disabled={pending}>
          <SelectTrigger aria-label="Assigned to">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            <SelectSeparator />
            {staff.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
                {u.id === me ? " (you)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {ticket.assigneeId !== me && (
        <div className={row}>
          <span />
          <Button variant="link" size="sm" className="h-auto justify-start p-0" disabled={pending} onClick={() => change("assignee", me)}>
            Assign to me
          </Button>
        </div>
      )}
      <div className={row}>
        <span className={label}>Team</span>
        <Select value={ticket.teamId ?? "none"} onValueChange={(v) => change("team", v)} disabled={pending}>
          <SelectTrigger aria-label="Team">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No team</SelectItem>
            {teams.length > 0 && <SelectSeparator />}
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={row}>
        <span className={label}>Category</span>
        <Select value={ticket.categoryId ?? "none"} onValueChange={(v) => change("category", v)} disabled={pending}>
          <SelectTrigger aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            <SelectSeparator />
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
