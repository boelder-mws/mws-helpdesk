"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, sessions, settings, slaPolicies, teamMembers, teams, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { isRole, PRIORITIES } from "@/lib/labels";
import type { BusinessHours } from "@/lib/sla";

type Result = { error?: string } | undefined;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const isUnique = (err: unknown) =>
  [err, (err as { cause?: unknown })?.cause].some((e) => (e as { code?: string })?.code === "23505");

export async function setUserRole(userId: string, role: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!isUuid(userId) || !isRole(role)) return { error: "Choose a role." };
  if (userId === admin.id) return { error: "You can't change your own role." };
  await db.update(users).set({ role }).where(eq(users.id, userId));
  if (role === "requester") await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
  revalidatePath("/admin", "layout");
}

export async function setUserActive(userId: string, active: boolean): Promise<Result> {
  const admin = await requireAdmin();
  if (!isUuid(userId)) return { error: "Unknown user." };
  if (userId === admin.id) return { error: "You can't deactivate your own account." };
  await db.update(users).set({ active }).where(eq(users.id, userId));
  if (!active) await db.delete(sessions).where(eq(sessions.userId, userId));
  revalidatePath("/admin", "layout");
}

export async function saveTeam(form: FormData): Promise<Result> {
  await requireAdmin();
  const id = text(form, "id");
  const name = text(form, "name");
  if (name.length < 2) return { error: "Give the team a name." };
  const memberIds = form.getAll("members").map(String).filter(isUuid);
  try {
    let teamId = id;
    if (isUuid(id)) {
      await db.update(teams).set({ name }).where(eq(teams.id, id));
    } else {
      const [team] = await db.insert(teams).values({ name }).returning();
      teamId = team.id;
    }
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (memberIds.length > 0) {
      const staff = await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, memberIds), inArray(users.role, ["agent", "admin"])));
      if (staff.length > 0) {
        await db.insert(teamMembers).values(staff.map((s) => ({ teamId, userId: s.id })));
      }
    }
  } catch (err) {
    if (isUnique(err)) return { error: "Another team already has that name." };
    throw err;
  }
  revalidatePath("/admin", "layout");
}

export async function deleteTeam(form: FormData) {
  await requireAdmin();
  const id = text(form, "id");
  if (isUuid(id)) await db.delete(teams).where(eq(teams.id, id));
  revalidatePath("/admin", "layout");
}

export async function saveCategory(form: FormData): Promise<Result> {
  await requireAdmin();
  const id = text(form, "id");
  const name = text(form, "name");
  const teamId = text(form, "teamId");
  if (name.length < 2) return { error: "Give the category a name." };
  const data = { name, teamId: isUuid(teamId) ? teamId : null, active: form.get("active") === "on" };
  try {
    if (isUuid(id)) await db.update(categories).set(data).where(eq(categories.id, id));
    else await db.insert(categories).values({ ...data, active: true });
  } catch (err) {
    if (isUnique(err)) return { error: "Another category already has that name." };
    throw err;
  }
  revalidatePath("/admin", "layout");
}

export async function saveSla(form: FormData) {
  await requireAdmin();
  for (const priority of PRIORITIES) {
    const response = Number(form.get(`${priority}-response`));
    const resolution = Number(form.get(`${priority}-resolution`));
    if (!(response > 0) || !(resolution > 0)) continue;
    const values = {
      firstResponseMinutes: Math.round(response * 60),
      resolutionMinutes: Math.round(resolution * 60),
    };
    await db
      .insert(slaPolicies)
      .values({ priority, ...values })
      .onConflictDoUpdate({ target: slaPolicies.priority, set: values });
  }
  const time = (key: string, fallback: string) => (/^\d{2}:\d{2}$/.test(text(form, key)) ? text(form, key) : fallback);
  const hours: BusinessHours = {
    enabled: form.get("enabled") === "on",
    days: [0, 1, 2, 3, 4, 5, 6].filter((d) => form.get(`day-${d}`) === "on"),
    start: time("start", "08:00"),
    end: time("end", "17:00"),
  };
  await db
    .insert(settings)
    .values({ key: "business_hours", value: hours })
    .onConflictDoUpdate({ target: settings.key, set: { value: hours } });
  revalidatePath("/admin", "layout");
  redirect("/admin/sla?saved=1");
}
