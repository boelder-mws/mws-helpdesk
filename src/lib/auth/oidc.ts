import "server-only";
import * as client from "openid-client";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role, type User } from "@/db/schema";
import { env } from "@/lib/env";

export const OIDC_COOKIE = "hd_oidc";

let configPromise: Promise<client.Configuration> | null = null;

export function oidcConfigured() {
  return Boolean(env.oidcIssuer && env.oidcClientId);
}

/** Discovers the provider once and reuses the result. */
export function getOidcConfig() {
  if (!configPromise) {
    configPromise = client
      .discovery(
        new URL(env.oidcIssuer),
        env.oidcClientId,
        env.oidcClientSecret || undefined,
        env.oidcClientSecret ? undefined : client.None(),
        env.oidcAllowInsecure ? { execute: [client.allowInsecureRequests] } : undefined,
      )
      .catch((err) => {
        configPromise = null;
        throw err;
      });
  }
  return configPromise;
}

export const redirectUri = () => `${env.appUrl}/auth/callback`;

/** `code` is shown on the sign-in page as a fixed message (see login/page.tsx). */
export class SignInError extends Error {
  constructor(public code: "no_email" | "domain" | "conflict" | "inactive") {
    super(code);
  }
}

type Claims = Record<string, unknown>;

function emailFrom(claims: Claims): string | null {
  for (const key of ["email", "preferred_username", "upn"]) {
    const v = claims[key];
    if (typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return v.toLowerCase();
  }
  return null;
}

function groupsFrom(claims: Claims): string[] | null {
  if (!env.oidcGroupsClaim) return null;
  const v = claims[env.oidcGroupsClaim];
  if (Array.isArray(v)) return v.map((g) => String(g).toLowerCase());
  if (typeof v === "string") return v.split(/[\s,]+/).map((g) => g.toLowerCase());
  return [];
}

/** Role from identity-provider groups, when group mapping is configured. */
function roleFromGroups(groups: string[] | null): Role | null {
  if (!groups || (env.oidcAdminGroups.length === 0 && env.oidcAgentGroups.length === 0)) return null;
  if (groups.some((g) => env.oidcAdminGroups.includes(g))) return "admin";
  if (groups.some((g) => env.oidcAgentGroups.includes(g))) return "agent";
  return "requester";
}

/** Finds or creates the local account for a verified sign-in. */
export async function upsertUserFromClaims(claims: Claims): Promise<User> {
  const sub = typeof claims.sub === "string" ? claims.sub : null;
  const email = emailFrom(claims);
  if (!sub) throw new Error("ID token has no sub claim");
  if (!email) throw new SignInError("no_email");

  const domain = email.split("@")[1];
  if (env.oidcAllowedDomains.length > 0 && !env.oidcAllowedDomains.includes(domain)) {
    throw new SignInError("domain");
  }

  const name =
    (typeof claims.name === "string" && claims.name.trim()) ||
    [claims.given_name, claims.family_name].filter((p) => typeof p === "string").join(" ").trim() ||
    email.split("@")[0];

  const mapped = roleFromGroups(groupsFrom(claims));
  const bootstrapAdmin = env.adminEmails.includes(email);

  let [user] = await db.select().from(users).where(eq(users.oidcSub, sub));
  if (!user) {
    // Link an account that was added by email before this person ever signed in.
    const [byEmail] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`);
    if (byEmail && !byEmail.oidcSub && claims.email_verified !== false) {
      user = byEmail;
    } else if (byEmail) {
      throw new SignInError("conflict");
    }
  }

  if (user && !user.active) throw new SignInError("inactive");

  if (user) {
    const role: Role = bootstrapAdmin ? "admin" : (mapped ?? user.role);
    [user] = await db
      .update(users)
      .set({ oidcSub: sub, email, name, role, lastLoginAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
  } else {
    const role: Role = bootstrapAdmin ? "admin" : (mapped ?? "requester");
    [user] = await db
      .insert(users)
      .values({ oidcSub: sub, email, name, role, lastLoginAt: new Date() })
      .returning();
  }
  return user;
}

export { client };
