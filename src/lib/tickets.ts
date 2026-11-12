import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  attachments,
  categories,
  comments,
  teamMembers,
  teams,
  ticketEvents,
  tickets,
  users,
  type User,
} from "@/db/schema";
import { isStaff } from "./auth/guards";
import { ACTIVE_STATUSES, isPriority, isStatus } from "./labels";

export const PAGE_SIZE = 25;

const requester = alias(users, "requester");
const assignee = alias(users, "assignee");

export const overdue = sql`(${tickets.status} in ('open','in_progress','pending') and ((${tickets.firstRespondedAt} is null and ${tickets.firstResponseDueAt} < now()) or ${tickets.resolutionDueAt} < now()))`;

const active = inArray(tickets.status, ACTIVE_STATUSES);

export type TicketFilters = {
  view?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignee?: string;
  q?: string;
  sort?: string;
  page?: number;
};

const isUuid = (v: string | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

async function myTeamIds(userId: string) {
  const rows = await db.select({ id: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, userId));
  return rows.map((r) => r.id);
}

async function viewCondition(user: User, view: string): Promise<SQL | undefined> {
  if (!isStaff(user)) {
    const mine = eq(tickets.requesterId, user.id);
    return view === "all" ? mine : and(mine, active);
  }
  switch (view) {
    case "mine":
      return and(eq(tickets.assigneeId, user.id), active);
    case "unassigned":
      return and(isNull(tickets.assigneeId), active);
    case "team": {
      const ids = await myTeamIds(user.id);
      return ids.length ? and(inArray(tickets.teamId, ids), active) : sql`false`;
    }
    case "overdue":
      return overdue;
    case "all":
      return undefined;
    default:
      return active;
  }
}

export async function listTickets(user: User, f: TicketFilters) {
  const where: (SQL | undefined)[] = [await viewCondition(user, f.view ?? "open")];
  if (isStatus(f.status)) where.push(eq(tickets.status, f.status));
  if (isPriority(f.priority)) where.push(eq(tickets.priority, f.priority));
  if (isUuid(f.category)) where.push(eq(tickets.categoryId, f.category));
  if (isStaff(user) && isUuid(f.assignee)) where.push(eq(tickets.assigneeId, f.assignee));
  const q = f.q?.trim();
  if (q) {
    const num = Number(q.replace(/^#/, ""));
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(
      or(
        ilike(tickets.subject, like),
        ilike(tickets.description, like),
        Number.isInteger(num) && num > 0 ? eq(tickets.number, num) : undefined,
        isStaff(user) ? ilike(requester.name, like) : undefined,
        isStaff(user) ? ilike(requester.email, like) : undefined,
      ),
    );
  }
  const cond = and(...where);
  const page = Math.max(1, f.page ?? 1);

  const base = () =>
    db
      .select({
        id: tickets.id,
        number: tickets.number,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        firstResponseDueAt: tickets.firstResponseDueAt,
        resolutionDueAt: tickets.resolutionDueAt,
        firstRespondedAt: tickets.firstRespondedAt,
        resolvedAt: tickets.resolvedAt,
        requesterName: requester.name,
        assigneeName: assignee.name,
        categoryName: categories.name,
        teamName: teams.name,
      })
      .from(tickets)
      .innerJoin(requester, eq(requester.id, tickets.requesterId))
      .leftJoin(assignee, eq(assignee.id, tickets.assigneeId))
      .leftJoin(categories, eq(categories.id, tickets.categoryId))
      .leftJoin(teams, eq(teams.id, tickets.teamId));

  const order =
    f.sort === "due"
      ? [
          sql`case when ${tickets.status} in ('resolved','closed') then 1 else 0 end`,
          sql`coalesce(case when ${tickets.firstRespondedAt} is null then ${tickets.firstResponseDueAt} end, ${tickets.resolutionDueAt}) asc nulls last`,
        ]
      : f.sort === "oldest"
        ? [asc(tickets.createdAt)]
        : [desc(tickets.updatedAt)];

  const [rows, [{ total }]] = await Promise.all([
    base()
      .where(cond)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(tickets)
      .innerJoin(requester, eq(requester.id, tickets.requesterId))
      .where(cond),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type TicketRow = Awaited<ReturnType<typeof listTickets>>["rows"][number];

/** Ticket counts for the staff queue tabs and dashboard. */
export async function queueCounts(user: User) {
  const ids = await myTeamIds(user.id);
  const teamCond = ids.length ? sql`${tickets.teamId} in ${ids}` : sql`false`;
  const [row] = await db
    .select({
      open: sql<number>`count(*) filter (where ${active})::int`,
      mine: sql<number>`count(*) filter (where ${active} and ${tickets.assigneeId} = ${user.id})::int`,
      unassigned: sql<number>`count(*) filter (where ${active} and ${tickets.assigneeId} is null)::int`,
      team: sql<number>`count(*) filter (where ${active} and ${teamCond})::int`,
      overdue: sql<number>`count(*) filter (where ${overdue})::int`,
    })
    .from(tickets);
  return row;
}

export async function getTicket(user: User, number: number) {
  const [row] = await db
    .select({
      ticket: tickets,
      requester: { id: requester.id, name: requester.name, email: requester.email },
      assignee: { id: assignee.id, name: assignee.name },
      categoryName: categories.name,
      teamName: teams.name,
    })
    .from(tickets)
    .innerJoin(requester, eq(requester.id, tickets.requesterId))
    .leftJoin(assignee, eq(assignee.id, tickets.assigneeId))
    .leftJoin(categories, eq(categories.id, tickets.categoryId))
    .leftJoin(teams, eq(teams.id, tickets.teamId))
    .where(eq(tickets.number, number));
  if (!row) return null;
  const staff = isStaff(user);
  if (!staff && row.ticket.requesterId !== user.id) return null;

  const [thread, events, files] = await Promise.all([
    db
      .select({
        id: comments.id,
        body: comments.body,
        internal: comments.internal,
        createdAt: comments.createdAt,
        authorId: comments.authorId,
        authorName: users.name,
        authorRole: users.role,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(and(eq(comments.ticketId, row.ticket.id), staff ? undefined : eq(comments.internal, false)))
      .orderBy(asc(comments.createdAt)),
    db
      .select({
        id: ticketEvents.id,
        type: ticketEvents.type,
        fromValue: ticketEvents.fromValue,
        toValue: ticketEvents.toValue,
        createdAt: ticketEvents.createdAt,
        actorName: users.name,
      })
      .from(ticketEvents)
      .leftJoin(users, eq(users.id, ticketEvents.actorId))
      .where(eq(ticketEvents.ticketId, row.ticket.id))
      .orderBy(asc(ticketEvents.createdAt)),
    db.select().from(attachments).where(eq(attachments.ticketId, row.ticket.id)).orderBy(asc(attachments.createdAt)),
  ]);
  const visible = new Set(thread.map((c) => c.id));
  return {
    ...row,
    comments: thread,
    events: staff ? events : events.filter((e) => e.type === "status" || e.type === "created"),
    attachments: files.filter((a) => !a.commentId || visible.has(a.commentId)),
  };
}

export async function ticketFormOptions() {
  const [cats, teamRows, staff] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(inArray(users.role, ["agent", "admin"]), eq(users.active, true)))
      .orderBy(asc(users.name)),
  ]);
  return { categories: cats, teams: teamRows, staff };
}
