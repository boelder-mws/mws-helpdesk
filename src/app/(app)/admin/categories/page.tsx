import { asc } from "drizzle-orm";
import { CategoryRow } from "@/components/admin/category-row";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { categories, teams } from "@/db/schema";

export default async function CategoriesPage() {
  const [cats, teamRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
  ]);
  return (
    <>
      <p className="mb-4 max-w-xl text-sm text-muted-foreground">
        People pick a category when they open a ticket. Turn one off to hide it from the form without changing old
        tickets.
      </p>
      <Card className="divide-y overflow-hidden">
        {cats.map((c) => (
          <CategoryRow key={c.id} category={c} teams={teamRows} />
        ))}
        <div className="bg-muted/40">
          <CategoryRow teams={teamRows} />
        </div>
      </Card>
    </>
  );
}
