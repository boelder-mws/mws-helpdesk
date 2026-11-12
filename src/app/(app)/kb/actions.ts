"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { kbArticles } from "@/db/schema";
import { requireStaff } from "@/lib/auth/guards";

export type ArticleState = { error?: string; values?: Record<string, string> } | undefined;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "article"
  );
}

async function uniqueSlug(title: string, exceptId?: string) {
  const base = slugify(title);
  for (let i = 1; i < 100; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [taken] = await db
      .select({ id: kbArticles.id })
      .from(kbArticles)
      .where(and(eq(kbArticles.slug, slug), exceptId ? ne(kbArticles.id, exceptId) : undefined));
    if (!taken) return slug;
  }
  return `${base}-${Date.now()}`;
}

export async function saveArticle(_prev: ArticleState, form: FormData): Promise<ArticleState> {
  const user = await requireStaff();
  const id = text(form, "id");
  const title = text(form, "title");
  const summary = text(form, "summary");
  const body = text(form, "body");
  const categoryId = text(form, "categoryId");
  const published = form.get("published") === "on";
  const values = { title, summary, body, categoryId, published: published ? "on" : "" };

  if (title.length < 3) return { error: "Give the article a title.", values };
  if (body.length < 10) return { error: "Write the article before saving.", values };

  const data = {
    title,
    summary: summary.slice(0, 300),
    body,
    categoryId: isUuid(categoryId) ? categoryId : null,
    published,
    updatedAt: new Date(),
  };

  let slug: string;
  if (id && isUuid(id)) {
    const [existing] = await db.select().from(kbArticles).where(eq(kbArticles.id, id));
    if (!existing) return { error: "This article no longer exists.", values };
    slug = existing.slug; // keep links stable when the title changes
    await db.update(kbArticles).set(data).where(eq(kbArticles.id, id));
  } else {
    slug = await uniqueSlug(title);
    await db.insert(kbArticles).values({ ...data, slug, authorId: user.id });
  }
  revalidatePath("/kb", "layout");
  redirect(`/kb/${slug}`);
}

export async function deleteArticle(form: FormData) {
  await requireStaff();
  const id = text(form, "id");
  if (isUuid(id)) await db.delete(kbArticles).where(eq(kbArticles.id, id));
  revalidatePath("/kb", "layout");
  redirect("/kb");
}
