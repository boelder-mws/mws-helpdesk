import { CircleCheck } from "lucide-react";
import { saveSla } from "../actions";
import { PriorityLabel } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { db } from "@/db";
import { slaPolicies } from "@/db/schema";
import { env } from "@/lib/env";
import { PRIORITIES } from "@/lib/labels";
import { getBusinessHours } from "@/lib/sla-server";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours = (minutes: number) => String(Math.round((minutes / 60) * 100) / 100);

export default async function SlaPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [policies, business, sp] = await Promise.all([db.select().from(slaPolicies), getBusinessHours(), searchParams]);

  return (
    <form action={saveSla} className="grid max-w-3xl gap-6">
      {sp.saved && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-ok-bg px-3 py-2.5 text-sm text-ok">
          <CircleCheck className="size-4" /> Saved. New tickets use these targets; existing tickets keep theirs.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Targets by priority</CardTitle>
          <CardDescription>How long IT has to send a first reply, and to resolve the ticket, in working hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[minmax(5rem,1fr)_minmax(0,8rem)_minmax(0,8rem)] items-center gap-x-4 gap-y-3">
            <span />
            <span className="text-sm font-medium text-muted-foreground">First reply</span>
            <span className="text-sm font-medium text-muted-foreground">Fix</span>
            {PRIORITIES.map((p) => {
              const policy = policies.find((x) => x.priority === p);
              return (
                <div key={p} className="contents">
                  <PriorityLabel priority={p} className="text-sm" />
                  <Input
                    name={`${p}-response`}
                    type="number"
                    min="0.25"
                    step="0.25"
                    required
                    defaultValue={policy ? hours(policy.firstResponseMinutes) : ""}
                    aria-label={`${p} first reply target in hours`}
                  />
                  <Input
                    name={`${p}-resolution`}
                    type="number"
                    min="0.25"
                    step="0.25"
                    required
                    defaultValue={policy ? hours(policy.resolutionMinutes) : ""}
                    aria-label={`${p} fix target in hours`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business hours</CardTitle>
          <CardDescription>
            Targets only count time inside these hours, so a ticket opened Friday evening isn&apos;t overdue by Monday
            morning. Times are in {env.timezone}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Label className="font-normal">
            <Switch name="enabled" defaultChecked={business.enabled} />
            Count business hours only (off = the clock runs 24/7)
          </Label>
          <fieldset>
            <legend className="mb-2.5 text-sm font-medium">Working days</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {DAYS.map((day, i) => (
                <Label key={day} className="font-normal">
                  <Checkbox name={`day-${i}`} defaultChecked={business.days.includes(i)} />
                  {day}
                </Label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-5">
            <div className="grid gap-2">
              <Label htmlFor="start">Opens</Label>
              <Input id="start" name="start" type="time" required defaultValue={business.start} className="w-36" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">Closes</Label>
              <Input id="end" name="end" type="time" required defaultValue={business.end} className="w-36" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">Save targets and hours</Button>
      </div>
    </form>
  );
}
