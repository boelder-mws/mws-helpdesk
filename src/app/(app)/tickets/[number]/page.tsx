import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, Lock, Paperclip } from "lucide-react";
import { markResolved } from "../actions";
import { PriorityLabel, SlaChip, StatusBadge } from "@/components/badges";
import { Initials } from "@/components/page-header";
import { ReplyForm } from "@/components/tickets/reply-form";
import { TicketProperties } from "@/components/tickets/ticket-properties";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isStaff, requireUser } from "@/lib/auth/guards";
import { formatBytes, formatDateTime, timeAgo } from "@/lib/format";
import { getTicket, ticketFormOptions } from "@/lib/tickets";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Ticket #${(await params).number}` };
}

type Loaded = NonNullable<Awaited<ReturnType<typeof getTicket>>>;

function Files({ files }: { files: Loaded["attachments"] }) {
  if (files.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {files.map((f) => (
        <li key={f.id}>
          <a
            href={`/files/${f.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-64 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-[0.8125rem] hover:bg-muted"
          >
            <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{f.filename}</span>
            <span className="shrink-0 text-muted-foreground">{formatBytes(f.size)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function eventText(e: Loaded["events"][number]) {
  switch (e.type) {
    case "status":
      return `changed the status from ${e.fromValue} to ${e.toValue}`;
    case "priority":
      return `changed the priority from ${e.fromValue} to ${e.toValue}`;
    case "assignee":
      return e.toValue ? `assigned this to ${e.toValue}` : "removed the assignee";
    case "team":
      return e.toValue ? `moved this to the ${e.toValue} team` : "removed the team";
    case "category":
      return e.toValue ? `set the category to ${e.toValue}` : "removed the category";
    default:
      return "updated the ticket";
  }
}

export default async function TicketPage({ params }: Props) {
  const user = await requireUser();
  const number = Number((await params).number);
  if (!Number.isInteger(number) || number < 1) notFound();
  const data = await getTicket(user, number);
  if (!data) notFound();

  const staff = isStaff(user);
  const { ticket, requester, assignee } = data;
  const options = staff ? await ticketFormOptions() : null;
  const now = new Date();
  const finished = ticket.status === "resolved" || ticket.status === "closed";

  const timeline = [
    ...data.comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, c })),
    ...data.events.filter((e) => e.type !== "created").map((e) => ({ kind: "event" as const, at: e.createdAt, e })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const fact = "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm";

  return (
    <>
      <Link href="/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Tickets
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="num text-sm font-medium text-muted-foreground">#{ticket.number}</span>
          <StatusBadge status={ticket.status} />
          <PriorityLabel priority={ticket.priority} />
          <SlaChip ticket={ticket} now={now} />
        </div>
        <h1 className="mt-2 text-2xl leading-tight font-semibold">{ticket.subject}</h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 gap-4">
          <Card>
            <CardContent>
              <div className="mb-3 flex items-center gap-2.5">
                <Initials name={requester.name} />
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{requester.name}</span>{" "}
                  <span className="text-muted-foreground">opened this · {formatDateTime(ticket.createdAt)}</span>
                </div>
              </div>
              <p className="break-words whitespace-pre-wrap">{ticket.description}</p>
              <Files files={data.attachments.filter((a) => !a.commentId)} />
            </CardContent>
          </Card>

          {timeline.map((item) =>
            item.kind === "event" ? (
              <p key={item.e.id} className="px-5 text-[0.8125rem] text-muted-foreground">
                <span className="font-medium text-foreground">{item.e.actorName ?? "Someone"}</span> {eventText(item.e)}
                <span className="whitespace-nowrap"> · {timeAgo(item.at, now)}</span>
              </p>
            ) : (
              <Card key={item.c.id} className={cn(item.c.internal && "border-warn/40 bg-warn-bg/40")}>
                <CardContent>
                  <div className="mb-3 flex items-center gap-2.5">
                    <Initials name={item.c.authorName} />
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium">{item.c.authorName}</span>
                      {item.c.authorRole !== "requester" && item.c.authorId !== ticket.requesterId && (
                        <Badge variant="accent">IT</Badge>
                      )}
                      {item.c.internal && (
                        <Badge variant="warn">
                          <Lock /> Internal note
                        </Badge>
                      )}
                      <span className="text-muted-foreground" title={formatDateTime(item.at)}>
                        {timeAgo(item.at, now)}
                      </span>
                    </div>
                  </div>
                  <p className="break-words whitespace-pre-wrap">{item.c.body}</p>
                  <Files files={data.attachments.filter((a) => a.commentId === item.c.id)} />
                </CardContent>
              </Card>
            ),
          )}

          {!staff && ticket.status === "closed" ? (
            <p className="rounded-lg border border-dashed px-5 py-4 text-sm text-muted-foreground">
              This ticket is closed.{" "}
              <Link href="/tickets/new" className="font-medium text-primary hover:underline">
                Open a new ticket
              </Link>{" "}
              if you still need help.
            </p>
          ) : (
            <ReplyForm ticketId={ticket.id} status={ticket.status} staff={staff} />
          )}
        </div>

        <aside className="grid gap-4">
          {staff && options ? (
            <Card>
              <CardContent>
                <TicketProperties
                  ticket={{
                    id: ticket.id,
                    status: ticket.status,
                    priority: ticket.priority,
                    assigneeId: ticket.assigneeId,
                    teamId: ticket.teamId,
                    categoryId: ticket.categoryId,
                  }}
                  me={user.id}
                  staff={options.staff}
                  teams={options.teams}
                  categories={options.categories}
                />
              </CardContent>
            </Card>
          ) : (
            !finished && (
              <form action={markResolved}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <Button type="submit" variant="outline" className="w-full">
                  <CircleCheck /> It&apos;s fixed — mark as resolved
                </Button>
              </form>
            )
          )}

          <Card>
            <CardContent className="grid gap-2.5">
              <div className={fact}>
                <span className="text-muted-foreground">Requester</span>
                <span className="min-w-0">
                  <span className="block truncate">{requester.name}</span>
                  {staff && (
                    <a href={`mailto:${requester.email}`} className="block truncate text-[0.8125rem] text-primary hover:underline">
                      {requester.email}
                    </a>
                  )}
                </span>
              </div>
              {!staff && (
                <>
                  <div className={fact}>
                    <span className="text-muted-foreground">Handled by</span>
                    <span>{assignee?.name ?? "Not assigned yet"}</span>
                  </div>
                  <div className={fact}>
                    <span className="text-muted-foreground">Category</span>
                    <span>{data.categoryName ?? "—"}</span>
                  </div>
                </>
              )}
              <div className={fact}>
                <span className="text-muted-foreground">Opened</span>
                <span>{formatDateTime(ticket.createdAt)}</span>
              </div>
              {staff && ticket.firstResponseDueAt && (
                <div className={fact}>
                  <span className="text-muted-foreground">First reply</span>
                  <span>
                    {ticket.firstRespondedAt ? (
                      <>
                        {formatDateTime(ticket.firstRespondedAt)}
                        <span className={cn("block text-[0.8125rem]", ticket.firstRespondedAt > ticket.firstResponseDueAt ? "text-danger" : "text-muted-foreground")}>
                          {ticket.firstRespondedAt > ticket.firstResponseDueAt ? "After" : "Within"} target of{" "}
                          {formatDateTime(ticket.firstResponseDueAt)}
                        </span>
                      </>
                    ) : (
                      <>Due {formatDateTime(ticket.firstResponseDueAt)}</>
                    )}
                  </span>
                </div>
              )}
              {staff && ticket.resolutionDueAt && (
                <div className={fact}>
                  <span className="text-muted-foreground">Fix due</span>
                  <span>{formatDateTime(ticket.resolutionDueAt)}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className={fact}>
                  <span className="text-muted-foreground">Resolved</span>
                  <span>{formatDateTime(ticket.resolvedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
