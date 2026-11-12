import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "New ticket" };

export default async function NewTicketPage() {
  const user = await requireUser();
  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.name));
  return (
    <div className="max-w-2xl">
      <PageHeader title="New ticket" description="The more detail you give, the faster IT can fix it." />
      <Card>
        <CardContent>
          <NewTicketForm categories={cats} staff={isStaff(user)} />
        </CardContent>
      </Card>
    </div>
  );
}
