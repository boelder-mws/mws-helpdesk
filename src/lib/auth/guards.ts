import "server-only";
import { notFound, redirect } from "next/navigation";
import type { User } from "@/db/schema";
import { getCurrentUser } from "./session";

export const isStaff = (u: Pick<User, "role">) => u.role === "agent" || u.role === "admin";

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Agents and admins. Everyone else gets a 404 rather than a hint the page exists. */
export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (!isStaff(user)) notFound();
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
