import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", version: process.env.NEXT_PUBLIC_APP_VERSION });
  } catch {
    return Response.json({ status: "database_unreachable" }, { status: 503 });
  }
}
