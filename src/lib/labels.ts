import type { Role, TicketPriority, TicketStatus } from "@/db/schema";

export const STATUSES: TicketStatus[] = ["open", "in_progress", "pending", "resolved", "closed"];
export const PRIORITIES: TicketPriority[] = ["urgent", "high", "normal", "low"];
export const ROLES: Role[] = ["requester", "agent", "admin"];

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  pending: "Waiting on requester",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const ROLE_LABEL: Record<Role, string> = {
  requester: "Requester",
  agent: "Agent",
  admin: "Admin",
};

export const ACTIVE_STATUSES: TicketStatus[] = ["open", "in_progress", "pending"];

export function isStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && (STATUSES as string[]).includes(v);
}
export function isPriority(v: unknown): v is TicketPriority {
  return typeof v === "string" && (PRIORITIES as string[]).includes(v);
}
export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}
