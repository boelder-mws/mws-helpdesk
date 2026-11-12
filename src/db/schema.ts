import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["requester", "agent", "admin"]);
export const statusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
]);
export const priorityEnum = pgEnum("ticket_priority", ["low", "normal", "high", "urgent"]);

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Subject identifier from the identity provider. Null until first sign-in
  // for people added by email (e.g. a ticket opened on their behalf).
  oidcSub: text("oidc_sub").unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("requester"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastLoginAt: ts("last_login_at"),
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token; the token itself is never stored.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })],
);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  // New tickets in this category are routed to this team.
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
});

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull().unique(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: statusEnum("status").notNull().default("open"),
    priority: priorityEnum("priority").notNull().default("normal"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    firstResponseDueAt: ts("first_response_due_at"),
    resolutionDueAt: ts("resolution_due_at"),
    firstRespondedAt: ts("first_responded_at"),
    resolvedAt: ts("resolved_at"),
    closedAt: ts("closed_at"),
  },
  (t) => [
    index("tickets_status_idx").on(t.status),
    index("tickets_requester_idx").on(t.requesterId),
    index("tickets_assignee_idx").on(t.assigneeId),
    index("tickets_team_idx").on(t.teamId),
    index("tickets_created_idx").on(t.createdAt),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    // Internal notes are visible to agents and admins only.
    internal: boolean("internal").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_ticket_idx").on(t.ticketId)],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    // created | status | priority | assignee | team | category
    type: text("type").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("ticket_events_ticket_idx").on(t.ticketId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("attachments_ticket_idx").on(t.ticketId)],
);

export const slaPolicies = pgTable("sla_policies", {
  priority: priorityEnum("priority").primaryKey(),
  firstResponseMinutes: integer("first_response_minutes").notNull(),
  resolutionMinutes: integer("resolution_minutes").notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const kbArticles = pgTable(
  "kb_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    published: boolean("published").notNull().default(false),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("kb_published_idx").on(t.published)],
);

export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Role = User["role"];
export type TicketStatus = Ticket["status"];
export type TicketPriority = Ticket["priority"];
