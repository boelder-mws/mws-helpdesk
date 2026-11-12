import { bootstrapDatabase } from "@/db/bootstrap";

// Runs once when the server starts: apply migrations and default settings.
try {
  await bootstrapDatabase();
  console.log("[helpdesk] database ready");
} catch (err) {
  console.error("[helpdesk] database setup failed", err);
  // Fail fast so Docker restarts the container instead of serving errors.
  process.exit(1);
}
