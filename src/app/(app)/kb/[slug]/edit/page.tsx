import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { deleteArticle } from "../../actions";
import { ArticleForm } from "@/components/kb/article-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { db } from "@/db";
import { categories, kbArticles } from "@/db/schema";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff();
  const [article] = await db.select().from(kbArticles).where(eq(kbArticles.slug, (await params).slug));
  if (!article) notFound();
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Edit article">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash2 /> Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this article?</DialogTitle>
              <DialogDescription>
                “{article.title}” will be removed for everyone. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Keep article</Button>
              </DialogClose>
              <form action={deleteArticle}>
                <input type="hidden" name="id" value={article.id} />
                <Button type="submit" variant="destructive" className="w-full">
                  Delete article
                </Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardContent>
          <ArticleForm article={article} categories={cats} />
        </CardContent>
      </Card>
    </div>
  );
}
