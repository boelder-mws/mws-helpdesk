import "server-only";
import path from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";
import { categories, settings, slaPolicies } from "./schema";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/sla";

/** Runs on server start: applies pending migrations, then fills in defaults. */
export async function bootstrapDatabase() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  await db
    .insert(slaPolicies)
    .values([
      { priority: "urgent", firstResponseMinutes: 60, resolutionMinutes: 4 * 60 },
      { priority: "high", firstResponseMinutes: 4 * 60, resolutionMinutes: 8 * 60 },
      { priority: "normal", firstResponseMinutes: 8 * 60, resolutionMinutes: 3 * 8 * 60 },
      { priority: "low", firstResponseMinutes: 16 * 60, resolutionMinutes: 5 * 8 * 60 },
    ])
    .onConflictDoNothing();

  await db
    .insert(settings)
    .values({ key: "business_hours", value: DEFAULT_BUSINESS_HOURS })
    .onConflictDoNothing();

  const [seeded] = await db.select().from(settings).where(eq(settings.key, "seeded_categories"));
  if (!seeded) {
    await db
      .insert(categories)
      .values(
        ["Accounts & passwords", "Hardware", "Software", "Network & Wi-Fi", "Printing", "Email", "Other"].map(
          (name) => ({ name }),
        ),
      )
      .onConflictDoNothing();
    await db.insert(settings).values({ key: "seeded_categories", value: true }).onConflictDoNothing();
  }
}
