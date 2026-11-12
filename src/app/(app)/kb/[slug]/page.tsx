import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Pencil } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { categories, kbArticles } from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [row] = await db
    .select({ article: kbArticles, category: categories.name })
    .from(kbArticles)
    .leftJoin(categories, eq(categories.id, kbArticles.categoryId))
    .where(eq(kbArticles.slug, slug));
  return row;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser();
  const row = await load((await params).slug);
  return { title: row && (row.article.published || isStaff(user)) ? row.article.title : "Knowledge base" };
}

export default async function ArticlePage({ params }: Props) {
  const user = await requireUser();
  const staff = isStaff(user);
  const row = await load((await params).slug);
  if (!row || (!row.article.published && !staff)) notFound();
  const { article } = row;

  return (
    <div className="max-w-3xl">
      <Link href="/kb" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Knowledge base
      </Link>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl leading-tight font-semibold">{article.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {row.category ?? "General"} · Updated {formatDate(article.updatedAt)}
            {!article.published && <Badge variant="warn">Draft</Badge>}
          </p>
        </div>
        {staff && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/kb/${article.slug}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
        )}
      </header>
      <Card>
        <CardContent className="article">
          <Markdown remarkPlugins={[remarkGfm]}>{article.body}</Markdown>
        </CardContent>
      </Card>
      <p className="mt-5 text-sm text-muted-foreground">
        Didn&apos;t solve it?{" "}
        <Link href="/tickets/new" className="font-medium text-primary hover:underline">
          Open a ticket
        </Link>
        .
      </p>
    </div>
  );
}
