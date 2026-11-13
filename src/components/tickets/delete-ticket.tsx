"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteTicket } from "@/app/(app)/tickets/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="w-full">
      {pending ? "Deleting…" : "Delete ticket"}
    </Button>
  );
}

export function DeleteTicket({ ticketId, number }: { ticketId: string; number: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-danger hover:text-danger">
          <Trash2 /> Delete ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete ticket #{number}?</DialogTitle>
          <DialogDescription>
            The ticket, its replies, internal notes, history and attachments are removed for everyone. This can&apos;t be
            undone. To take a ticket out of the queue but keep the record, set it to Closed instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep ticket</Button>
          </DialogClose>
          <form action={deleteTicket}>
            <input type="hidden" name="ticketId" value={ticketId} />
            <ConfirmButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
