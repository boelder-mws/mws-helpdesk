"use client";

import { useState, useTransition } from "react";
import { deleteTeam, saveTeam } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Person = { id: string; name: string };

export function TeamDialog({
  team,
  staff,
  children,
}: {
  team?: { id: string; name: string; memberIds: string[] };
  staff: Person[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), setError(null))}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Edit team" : "New team"}</DialogTitle>
          <DialogDescription>Tickets routed to a team show up in its members&apos; “My teams” view.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          action={(form) =>
            startTransition(async () => {
              const result = await saveTeam(form);
              if (result?.error) setError(result.error);
              else setOpen(false);
            })
          }
        >
          {team && <input type="hidden" name="id" value={team.id} />}
          {error && (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="team-name">Name</Label>
            <Input id="team-name" name="name" required defaultValue={team?.name} placeholder="Network team" />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Members</legend>
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">Make someone an agent under People first.</p>
            ) : (
              <div className="grid max-h-56 gap-2 overflow-y-auto">
                {staff.map((p) => (
                  <Label key={p.id} className="font-normal">
                    <Checkbox name="members" value={p.id} defaultChecked={team?.memberIds.includes(p.id)} />
                    {p.name}
                  </Label>
                ))}
              </div>
            )}
          </fieldset>
          <DialogFooter className="sm:justify-between">
            {team ? (
              <Button type="submit" variant="ghost" className="text-danger" formAction={(form) => startTransition(async () => (await deleteTeam(form), setOpen(false)))}>
                Delete team
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
