import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;
const g = globalThis as unknown as { __hdDb?: Db };

function connect(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return drizzle(new Pool({ connectionString, max: 10 }), { schema });
}

// Connects on first use, so `next build` never needs a database.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    g.__hdDb ??= connect();
    const value = Reflect.get(g.__hdDb, prop);
    return typeof value === "function" ? value.bind(g.__hdDb) : value;
  },
});

export { schema };
