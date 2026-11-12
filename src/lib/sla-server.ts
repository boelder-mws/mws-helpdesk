import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, slaPolicies, type TicketPriority } from "@/db/schema";
import { env } from "./env";
import { addWorkingMinutes, DEFAULT_BUSINESS_HOURS, type BusinessHours } from "./sla";

export async function getBusinessHours(): Promise<BusinessHours> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "business_hours"));
  return { ...DEFAULT_BUSINESS_HOURS, ...((row?.value as Partial<BusinessHours>) ?? {}) };
}

/** Response and resolution deadlines for a ticket created at `from`. */
export async function slaDueDates(priority: TicketPriority, from: Date) {
  const [policy] = await db.select().from(slaPolicies).where(eq(slaPolicies.priority, priority));
  if (!policy) return { firstResponseDueAt: null, resolutionDueAt: null };
  const hours = await getBusinessHours();
  return {
    firstResponseDueAt: addWorkingMinutes(from, policy.firstResponseMinutes, hours, env.timezone),
    resolutionDueAt: addWorkingMinutes(from, policy.resolutionMinutes, hours, env.timezone),
  };
}
