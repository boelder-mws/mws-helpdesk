"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Lock } from "lucide-react";
import { addComment } from "@/app/(app)/tickets/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TicketStatus } from "@/db/schema";
import { STATUSES, STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function ReplyForm({
  ticketId,
  status,
  staff,
}: {
  ticketId: string;
  status: TicketStatus;
  staff: boolean;
}) {
  const [state, action, pending] = useActionState(addComment, undefined);
  const [internal, setInternal] = useState(false);

  return (
    <form
      action={action}
      className={cn("grid gap-3 rounded-lg border bg-card p-4", internal && "border-warn/40 bg-warn-bg/40")}
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      {state?.error && (
        <p role="alert" className="flex gap-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}
      <Label htmlFor="body" className="sr-only">
        {internal ? "Internal note" : "Reply"}
      </Label>
      <Textarea
        id="body"
        name="body"
        rows={4}
        defaultValue={state?.values?.body}
        placeholder={
          internal
            ? "Note for other agents. The requester won't see this."
            : staff
              ? "Reply to the requester…"
              : "Add more detail or reply to IT…"
        }
      />
      <Input name="files" type="file" multiple aria-label="Attach files" className="max-w-sm" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {staff && (
            <>
              <Label className="font-normal">
                <Checkbox name="internal" checked={internal} onCheckedChange={(v) => setInternal(v === true)} />
                <Lock className="size-3.5 text-muted-foreground" />
                Internal note
              </Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="nextStatus" className="font-normal text-muted-foreground">
                  then set
                </Label>
                <Select name="nextStatus" defaultValue={status} key={status}>
                  <SelectTrigger id="nextStatus" className="h-8 w-auto min-w-40">
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
            </>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : internal ? "Add note" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
