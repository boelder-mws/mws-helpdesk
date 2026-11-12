import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers, tickets, users, type TicketStatus, type User } from "@/db/schema";
import { env } from "./env";
import { STATUS_LABEL } from "./labels";
import { mailConfigured, sendMail } from "./mail";

type TicketRef = { id: string };

async function load(ticketId: string) {
  const [t] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!t) return null;
  const people = await db
    .select()
    .from(users)
    .where(inArray(users.id, [t.requesterId, ...(t.assigneeId ? [t.assigneeId] : [])]));
  return {
    ticket: t,
    requester: people.find((p) => p.id === t.requesterId)!,
    assignee: people.find((p) => p.id === t.assigneeId) ?? null,
    link: { label: "Open ticket", href: `${env.appUrl}/tickets/${t.number}` },
    tag: `[#${t.number}]`,
  };
}

/** Who watches a ticket nobody owns yet: its team, or all staff if it has none. */
async function queueWatchers(teamId: string | null): Promise<string[]> {
  if (teamId) {
    const rows = await db
      .select({ email: users.email })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(and(eq(teamMembers.teamId, teamId), eq(users.active, true)));
    if (rows.length > 0) return rows.map((r) => r.email);
  }
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.role, ["agent", "admin"]), eq(users.active, true)));
  return rows.map((r) => r.email);
}

const without = (emails: string[], actor: User) =>
  emails.filter((e) => e.toLowerCase() !== actor.email.toLowerCase());

export async function notifyTicketCreated(ref: TicketRef, actor: User) {
  if (!mailConfigured()) return;
  const ctx = await load(ref.id);
  if (!ctx) return;
  const { ticket, requester, tag, link } = ctx;
  await Promise.all([
    sendMail({
      to: [requester.email],
      subject: `${tag} We received your request: ${ticket.subject}`,
      heading: `Your request is ticket #${ticket.number}`,
      lines: [
        actor.id === requester.id
          ? "Thanks — the IT team has your request and will reply here."
          : `${actor.name} opened this ticket for you. The IT team will reply here.`,
        `Subject: ${ticket.subject}`,
      ],
      link,
    }),
    sendMail({
      to: without(await queueWatchers(ticket.teamId), actor).filter((e) => e !== requester.email),
      subject: `${tag} New ticket: ${ticket.subject}`,
      heading: `New ticket from ${requester.name}`,
      lines: [`Subject: ${ticket.subject}`, `Priority: ${ticket.priority}`],
      quote: ticket.description.slice(0, 1200),
      link,
    }),
  ]);
}

export async function notifyReply(ref: TicketRef, actor: User, body: string) {
  if (!mailConfigured()) return;
  const ctx = await load(ref.id);
  if (!ctx) return;
  const { ticket, requester, assignee, tag, link } = ctx;
  const fromRequester = actor.id === requester.id;
  const to = fromRequester
    ? assignee
      ? [assignee.email]
      : await queueWatchers(ticket.teamId)
    : [requester.email];
  await sendMail({
    to: without(to, actor),
    subject: `${tag} ${actor.name} replied: ${ticket.subject}`,
    heading: `${actor.name} replied to ticket #${ticket.number}`,
    lines: [`Subject: ${ticket.subject}`],
    quote: body.slice(0, 4000),
    link: { ...link, label: "View and reply" },
  });
}

export async function notifyStatusChanged(ref: TicketRef, actor: User, to: TicketStatus) {
  if (!mailConfigured()) return;
  const ctx = await load(ref.id);
  if (!ctx) return;
  const { ticket, requester, assignee, tag, link } = ctx;
  const recipients = actor.id === requester.id ? (assignee ? [assignee.email] : []) : [requester.email];
  const lines =
    to === "resolved"
      ? ["If the problem isn't fixed, reply on the ticket and it will reopen."]
      : to === "pending"
        ? ["The IT team needs something from you before they can continue. Please reply on the ticket."]
        : [];
  await sendMail({
    to: without(recipients, actor),
    subject: `${tag} ${STATUS_LABEL[to]}: ${ticket.subject}`,
    heading: `Ticket #${ticket.number} is now “${STATUS_LABEL[to]}”`,
    lines: [`Subject: ${ticket.subject}`, ...lines],
    link,
  });
}

export async function notifyAssigned(ref: TicketRef, actor: User) {
  if (!mailConfigured()) return;
  const ctx = await load(ref.id);
  if (!ctx?.assignee) return;
  const { ticket, requester, assignee, tag, link } = ctx;
  await sendMail({
    to: without([assignee.email], actor),
    subject: `${tag} Assigned to you: ${ticket.subject}`,
    heading: `${actor.name} assigned ticket #${ticket.number} to you`,
    lines: [`Subject: ${ticket.subject}`, `Requester: ${requester.name}`, `Priority: ${ticket.priority}`],
    link,
  });
}
