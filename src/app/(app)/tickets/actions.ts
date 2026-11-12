"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  comments,
  teams,
  ticketEvents,
  tickets,
  users,
  type Ticket,
  type TicketStatus,
  type User,
} from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth/guards";
import { isPriority, isStatus, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { notifyAssigned, notifyReply, notifyStatusChanged, notifyTicketCreated } from "@/lib/notify";
import { slaDueDates } from "@/lib/sla-server";
import { checkFiles, filesFrom, saveAttachments } from "@/lib/uploads";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

/** Columns to change when a ticket moves to `to`. */
function statusPatch(ticket: Ticket, to: TicketStatus) {
  const now = new Date();
  if (to === "resolved") return { status: to, resolvedAt: ticket.resolvedAt ?? now, closedAt: null };
  if (to === "closed") return { status: to, resolvedAt: ticket.resolvedAt ?? now, closedAt: now };
  return { status: to, resolvedAt: null, closedAt: null };
}

async function logEvent(ticketId: string, actor: User, type: string, from: string | null, to: string | null) {
  await db.insert(ticketEvents).values({ ticketId, actorId: actor.id, type, fromValue: from, toValue: to });
}

async function loadForUser(user: User, ticketId: string) {
  if (!isUuid(ticketId)) return null;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return null;
  if (!isStaff(user) && ticket.requesterId !== user.id) return null;
  return ticket;
}

export async function createTicket(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const subject = text(form, "subject");
  const description = text(form, "description");
  const priority = text(form, "priority") || "normal";
  const categoryId = text(form, "categoryId");
  const onBehalfOf = text(form, "requesterEmail").toLowerCase();
  const files = filesFrom(form);
  const values = { subject, description, priority, categoryId, requesterEmail: onBehalfOf };

  if (subject.length < 3) return { error: "Add a short subject that describes the problem.", values };
  if (subject.length > 200) return { error: "Keep the subject under 200 characters.", values };
  if (description.length < 5) return { error: "Describe what's happening so the IT team can help.", values };
  if (!isPriority(priority)) return { error: "Choose a priority.", values };
  const fileError = checkFiles(files);
  if (fileError) return { error: fileError, values };

  let category = null;
  if (isUuid(categoryId)) {
    [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
  }

  let requesterId = user.id;
  if (isStaff(user) && onBehalfOf && onBehalfOf !== user.email.toLowerCase()) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(onBehalfOf)) return { error: "Enter a valid email address for the requester.", values };
    let [person] = await db.select().from(users).where(sql`lower(${users.email}) = ${onBehalfOf}`);
    if (!person) {
      // Placeholder account; it links up when this person first signs in.
      [person] = await db
        .insert(users)
        .values({ email: onBehalfOf, name: onBehalfOf.split("@")[0] })
        .returning();
    }
    requesterId = person.id;
  }

  const createdAt = new Date();
  const [ticket] = await db
    .insert(tickets)
    .values({
      subject,
      description,
      priority,
      categoryId: category?.id ?? null,
      teamId: category?.teamId ?? null,
      requesterId,
      createdAt,
      updatedAt: createdAt,
      ...(await slaDueDates(priority, createdAt)),
    })
    .returning();
  await logEvent(ticket.id, user, "created", null, null);
  await saveAttachments(files, { ticketId: ticket.id, uploaderId: user.id });

  after(() => notifyTicketCreated(ticket, user));
  revalidatePath("/", "layout");
  redirect(`/tickets/${ticket.number}`);
}

export async function addComment(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const ticket = await loadForUser(user, text(form, "ticketId"));
  if (!ticket) return { error: "This ticket is no longer available." };

  const staff = isStaff(user);
  const body = text(form, "body");
  const internal = staff && form.get("internal") === "on";
  const nextStatus = staff ? text(form, "nextStatus") : "";
  const files = filesFrom(form);

  if (!body && files.length === 0) return { error: "Write a reply before sending." };
  const fileError = checkFiles(files);
  if (fileError) return { error: fileError, values: { body } };
  if (!staff && ticket.status === "closed") {
    return { error: "This ticket is closed. Open a new ticket if you still need help." };
  }

  const [comment] = await db
    .insert(comments)
    .values({ ticketId: ticket.id, authorId: user.id, body: body || "(attachment)", internal })
    .returning();
  await saveAttachments(files, { ticketId: ticket.id, commentId: comment.id, uploaderId: user.id });

  const patch: Partial<Ticket> = { updatedAt: new Date() };
  let newStatus: TicketStatus | null = null;
  if (staff && !internal && user.id !== ticket.requesterId && !ticket.firstRespondedAt) {
    patch.firstRespondedAt = new Date();
  }
  if (staff && isStatus(nextStatus) && nextStatus !== ticket.status) {
    newStatus = nextStatus;
  } else if (!staff && (ticket.status === "pending" || ticket.status === "resolved")) {
    newStatus = "open"; // a reply from the requester puts the ticket back in the queue
  }
  if (newStatus) {
    Object.assign(patch, statusPatch(ticket, newStatus));
    await logEvent(ticket.id, user, "status", STATUS_LABEL[ticket.status], STATUS_LABEL[newStatus]);
  }
  await db.update(tickets).set(patch).where(eq(tickets.id, ticket.id));

  after(async () => {
    if (!internal) await notifyReply(ticket, user, body || "(attachment)");
    // A reply already tells the other side; only announce a status the reply doesn't imply.
    if (newStatus && staff && internal) await notifyStatusChanged(ticket, user, newStatus);
  });
  revalidatePath(`/tickets/${ticket.number}`);
  return undefined;
}

/** Staff: change one property of a ticket from the side panel. */
export async function updateTicket(
  ticketId: string,
  field: "status" | "priority" | "assignee" | "team" | "category",
  value: string,
): Promise<FormState> {
  const user = await requireUser();
  if (!isStaff(user)) return { error: "Only agents can change this." };
  const ticket = await loadForUser(user, ticketId);
  if (!ticket) return { error: "This ticket is no longer available." };
  const idOrNull = value === "none" ? null : value;
  const patch: Partial<Ticket> = { updatedAt: new Date() };
  let notify: (() => Promise<void>) | null = null;

  if (field === "status") {
    if (!isStatus(value) || value === ticket.status) return undefined;
    Object.assign(patch, statusPatch(ticket, value));
    await logEvent(ticket.id, user, "status", STATUS_LABEL[ticket.status], STATUS_LABEL[value]);
    notify = () => notifyStatusChanged(ticket, user, value);
  } else if (field === "priority") {
    if (!isPriority(value) || value === ticket.priority) return undefined;
    Object.assign(patch, { priority: value }, await slaDueDates(value, ticket.createdAt));
    await logEvent(ticket.id, user, "priority", PRIORITY_LABEL[ticket.priority], PRIORITY_LABEL[value]);
  } else if (field === "assignee") {
    if (idOrNull === ticket.assigneeId) return undefined;
    let name: string | null = null;
    if (idOrNull) {
      if (!isUuid(idOrNull)) return { error: "Choose an agent." };
      const [agent] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, idOrNull), inArray(users.role, ["agent", "admin"]), eq(users.active, true)));
      if (!agent) return { error: "That person can't be assigned tickets." };
      name = agent.name;
    }
    patch.assigneeId = idOrNull;
    await logEvent(ticket.id, user, "assignee", null, name);
    if (idOrNull) notify = () => notifyAssigned(ticket, user);
  } else if (field === "team") {
    if (idOrNull === ticket.teamId) return undefined;
    let name: string | null = null;
    if (idOrNull) {
      const [team] = isUuid(idOrNull) ? await db.select().from(teams).where(eq(teams.id, idOrNull)) : [];
      if (!team) return { error: "Choose a team." };
      name = team.name;
    }
    patch.teamId = idOrNull;
    await logEvent(ticket.id, user, "team", null, name);
  } else if (field === "category") {
    if (idOrNull === ticket.categoryId) return undefined;
    let name: string | null = null;
    if (idOrNull) {
      const [cat] = isUuid(idOrNull) ? await db.select().from(categories).where(eq(categories.id, idOrNull)) : [];
      if (!cat) return { error: "Choose a category." };
      name = cat.name;
    }
    patch.categoryId = idOrNull;
    await logEvent(ticket.id, user, "category", null, name);
  } else {
    return { error: "Unknown field." };
  }

  await db.update(tickets).set(patch).where(eq(tickets.id, ticket.id));
  if (notify) after(notify);
  revalidatePath(`/tickets/${ticket.number}`);
  return undefined;
}

/** Requester: mark their own ticket as fixed. */
export async function markResolved(form: FormData) {
  const user = await requireUser();
  const ticket = await loadForUser(user, text(form, "ticketId"));
  if (!ticket || ticket.status === "resolved" || ticket.status === "closed") return;
  await db
    .update(tickets)
    .set({ ...statusPatch(ticket, "resolved"), updatedAt: new Date() })
    .where(eq(tickets.id, ticket.id));
  await logEvent(ticket.id, user, "status", STATUS_LABEL[ticket.status], STATUS_LABEL.resolved);
  after(() => notifyStatusChanged(ticket, user, "resolved"));
  revalidatePath(`/tickets/${ticket.number}`);
}
