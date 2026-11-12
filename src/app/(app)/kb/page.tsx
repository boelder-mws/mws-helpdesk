import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { Plus, Search } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { categories, kbArticles } from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Knowledge base" };

export default async function KbPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const staff = isStaff(user);
  const q = ((await searchParams).q ?? "").trim();
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  const articles = await db
    .select({
      id: kbArticles.id,
      slug: kbArticles.slug,
      title: kbArticles.title,
      summary: kbArticles.summary,
      published: kbArticles.published,
      category: categories.name,
    })
    .from(kbArticles)
    .leftJoin(categories, eq(categories.id, kbArticles.categoryId))
    .where(
      and(
        staff ? undefined : eq(kbArticles.published, true),
        q ? or(ilike(kbArticles.title, like), ilike(kbArticles.summary, like), ilike(kbArticles.body, like)) : undefined,
      ),
    )
    .orderBy(asc(kbArticles.title));

  const groups = new Map<string, typeof articles>();
  for (const a of articles) {
    const key = a.category ?? "General";
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => (a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b)));

  return (
    <>
      <PageHeader title="Knowledge base" description="Answers to common questions. Check here before opening a ticket.">
        {staff && (
          <Button asChild>
            <Link href="/kb/new">
              <Plus /> New article
            </Link>
          </Button>
        )}
      </PageHeader>

      <form className="relative mb-6 max-w-xl" action="/kb">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" type="search" defaultValue={q} placeholder="Search articles" aria-label="Search articles" className="h-10 pl-9" />
      </form>

      {articles.length === 0 ? (
        <Card>
          {q ? (
            <EmptyState
              title={`No articles match “${q}”`}
              action={
                <Button asChild variant="outline">
                  <Link href="/tickets/new">Open a ticket instead</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState title="No articles yet">
              {staff ? "Write the first one — password resets and Wi-Fi setup are good places to start." : "IT hasn't published any articles yet."}
            </EmptyState>
          )}
        </Card>
      ) : (
        <div className="grid gap-8">
          {sorted.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h2>
              <Card className="divide-y overflow-hidden">
                {items.map((a) => (
                  <Link key={a.id} href={`/kb/${a.slug}`} className="block px-5 py-3.5 transition-colors hover:bg-muted/50">
                    <span className="flex items-center gap-2 font-medium">
                      {a.title}
                      {!a.published && <Badge variant="warn">Draft</Badge>}
                    </span>
                    {a.summary && <span className="mt-0.5 block text-sm text-muted-foreground">{a.summary}</span>}
                  </Link>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
