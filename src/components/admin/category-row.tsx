"use client";

import { useState, useTransition } from "react";
import { saveCategory } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Team = { id: string; name: string };

export function CategoryRow({
  category,
  teams,
}: {
  category?: { id: string; name: string; teamId: string | null; active: boolean };
  teams: Team[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <form
      key={formKey}
      className="flex flex-wrap items-center gap-3 px-5 py-3"
      onChange={() => setMessage(null)}
      action={(form) =>
        startTransition(async () => {
          const result = await saveCategory(form);
          if (result?.error) return setMessage({ error: result.error });
          setMessage({ ok: true });
          if (!category) setFormKey((k) => k + 1);
        })
      }
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <Input
        name="name"
        required
        defaultValue={category?.name}
        placeholder="New category name"
        aria-label="Category name"
        className="min-w-44 flex-1"
      />
      <Select name="teamId" defaultValue={category?.teamId ?? "none"}>
        <SelectTrigger className="w-44" aria-label="Team that handles it">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No team</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {category ? (
        <label className="flex w-28 items-center gap-2 text-sm text-muted-foreground">
          <Switch name="active" defaultChecked={category.active} />
          In use
        </label>
      ) : (
        <span className="w-28" />
      )}
      <Button type="submit" variant={category ? "outline" : "default"} size="sm" disabled={pending} className="w-20">
        {pending ? "Saving…" : category ? "Save" : "Add"}
      </Button>
      {message?.error && (
        <p role="alert" className="w-full text-sm text-danger">
          {message.error}
        </p>
      )}
      {message?.ok && category && (
        <p role="status" className="w-full text-sm text-ok">
          Saved
        </p>
      )}
    </form>
  );
}
