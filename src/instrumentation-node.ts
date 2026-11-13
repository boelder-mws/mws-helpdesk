import { bootstrapDatabase } from "@/db/bootstrap";
import { verifyMail } from "@/lib/mail";

// Runs once when the server starts: apply migrations and default settings.
try {
  await bootstrapDatabase();
  console.log("[helpdesk] database ready");
  void verifyMail(); // reports in the log; never blocks or stops start-up
} catch (err) {
  console.error("[helpdesk] database setup failed", err);
  // Fail fast so Docker restarts the container instead of serving errors.
  process.exit(1);
}
