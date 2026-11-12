import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { ArticleForm } from "@/components/kb/article-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  await requireStaff();
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
  return (
    <div className="max-w-3xl">
      <PageHeader title="New article" />
      <Card>
        <CardContent>
          <ArticleForm categories={cats} />
        </CardContent>
      </Card>
    </div>
  );
}
