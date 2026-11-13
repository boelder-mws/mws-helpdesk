"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert } from "lucide-react";
import { createTicket } from "@/app/(app)/tickets/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/labels";

const PRIORITY_HELP: Record<string, string> = {
  urgent: "Many people blocked, or a class or event can't go ahead",
  high: "You can't do your work",
  normal: "Something is broken but you can work around it",
  low: "A question or a nice-to-have",
};

export function NewTicketForm({
  categories,
  staff,
}: {
  categories: { id: string; name: string }[];
  staff: boolean;
}) {
  const [state, action, pending] = useActionState(createTicket, undefined);
  const v = state?.values ?? {};

  return (
    <form action={action} className="grid grid-cols-1 gap-5">
      {state?.error && (
        <p role="alert" className="flex gap-2 rounded-md bg-danger-bg px-3 py-2.5 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          maxLength={200}
          defaultValue={v.subject}
          placeholder="Projector in room 204 won't turn on"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">What&apos;s happening?</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={7}
          defaultValue={v.description}
          placeholder="What you were trying to do, what happened instead, and any error message you saw."
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5">
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="categoryId">Category</Label>
          <Select name="categoryId" defaultValue={v.categoryId || undefined}>
            <SelectTrigger id="categoryId">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="priority">How much is this affecting you?</Label>
          <Select name="priority" defaultValue={v.priority || "normal"}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} textValue={PRIORITY_LABEL[p]}>
                  <span className="font-medium">{PRIORITY_LABEL[p]}</span>
                  <span className="text-muted-foreground"> — {PRIORITY_HELP[p]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="files">Screenshots or files</Label>
        <Input id="files" name="files" type="file" multiple />
        <p className="text-[0.8125rem] text-muted-foreground">Up to 5 files, 10 MB each.</p>
      </div>

      {staff && (
        <div className="grid gap-2 border-t pt-5">
          <Label htmlFor="requesterEmail">Opening this for someone else?</Label>
          <Input
            id="requesterEmail"
            name="requesterEmail"
            type="email"
            defaultValue={v.requesterEmail}
            placeholder="their.name@example.org"
          />
          <p className="text-[0.8125rem] text-muted-foreground">
            Leave empty to open it as yourself. They&apos;ll get the updates and can reply once they sign in.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create ticket"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/tickets">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
