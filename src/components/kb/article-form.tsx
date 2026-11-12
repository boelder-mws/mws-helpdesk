"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert } from "lucide-react";
import { saveArticle } from "@/app/(app)/kb/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Article = { id: string; slug: string; title: string; summary: string; body: string; categoryId: string | null; published: boolean };

export function ArticleForm({
  article,
  categories,
}: {
  article?: Article;
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveArticle, undefined);
  const v = state?.values;

  return (
    <form action={action} className="grid gap-5">
      {article && <input type="hidden" name="id" value={article.id} />}
      {state?.error && (
        <p role="alert" className="flex gap-2 rounded-md bg-danger-bg px-3 py-2.5 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={v?.title ?? article?.title} placeholder="Connect to the staff Wi-Fi" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="summary">Summary</Label>
        <Input
          id="summary"
          name="summary"
          maxLength={300}
          defaultValue={v?.summary ?? article?.summary}
          placeholder="One line shown in the article list"
        />
      </div>
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="categoryId">Category</Label>
        <Select name="categoryId" defaultValue={(v?.categoryId ?? article?.categoryId) || "none"}>
          <SelectTrigger id="categoryId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">General</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="body">Article</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={18}
          defaultValue={v?.body ?? article?.body}
          className="font-mono text-[0.8125rem]"
          placeholder={"## Before you start\n\nWrite in Markdown: headings, lists, **bold**, links and tables all work."}
        />
        <p className="text-[0.8125rem] text-muted-foreground">Formatted with Markdown.</p>
      </div>
      <Label className="font-normal">
        <Switch name="published" defaultChecked={v ? v.published === "on" : (article?.published ?? false)} />
        Published — visible to everyone who can sign in
      </Label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save article"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={article ? `/kb/${article.slug}` : "/kb"}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
