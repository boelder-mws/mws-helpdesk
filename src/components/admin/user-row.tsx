"use client";

import { useState, useTransition } from "react";
import { setUserActive, setUserRole } from "@/app/(app)/admin/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Role } from "@/db/schema";
import { ROLES, ROLE_LABEL } from "@/lib/labels";

export function UserControls({ id, role, active, self }: { id: string; role: Role; active: boolean; self: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string } | undefined>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-4">
        <Select value={role} onValueChange={(v) => run(() => setUserRole(id, v))} disabled={pending || self}>
          <SelectTrigger className="h-8 w-32" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Switch
          checked={active}
          onCheckedChange={(v) => run(() => setUserActive(id, v))}
          disabled={pending || self}
          aria-label={active ? "Can sign in" : "Sign-in blocked"}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
