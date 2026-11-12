"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from "@/lib/labels";

type Option = { id: string; name: string };

export function TicketFilters({
  categories,
  staff,
  showAssignee,
}: {
  categories: Option[];
  staff: Option[];
  showAssignee: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "any") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    startTransition(() => router.replace(`/tickets?${next}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <form
        className="relative min-w-48 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          set("q", String(new FormData(e.currentTarget).get("q") ?? "").trim());
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search subject, number or requester"
          aria-label="Search tickets"
          className="pl-9"
        />
      </form>
      <Select value={params.get("status") ?? "any"} onValueChange={(v) => set("status", v)}>
        <SelectTrigger className="w-auto min-w-36" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any status</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("priority") ?? "any"} onValueChange={(v) => set("priority", v)}>
        <SelectTrigger className="w-auto min-w-32" aria-label="Priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any priority</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("category") ?? "any"} onValueChange={(v) => set("category", v)}>
        <SelectTrigger className="w-auto min-w-36" aria-label="Category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any category</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showAssignee && (
        <Select value={params.get("assignee") ?? "any"} onValueChange={(v) => set("assignee", v)}>
          <SelectTrigger className="w-auto min-w-36" aria-label="Assigned to">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Anyone</SelectItem>
            {staff.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={params.get("sort") ?? "recent"} onValueChange={(v) => set("sort", v === "recent" ? "" : v)}>
        <SelectTrigger className="w-auto min-w-40" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Recently updated</SelectItem>
          <SelectItem value="due">Due soonest</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
