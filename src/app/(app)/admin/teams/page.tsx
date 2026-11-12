import { and, asc, eq, inArray } from "drizzle-orm";
import { Plus } from "lucide-react";
import { TeamDialog } from "@/components/admin/team-dialog";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { teamMembers, teams, users } from "@/db/schema";

export default async function TeamsPage() {
  const [teamRows, members, staff] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db
      .select({ teamId: teamMembers.teamId, userId: users.id, name: users.name })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .orderBy(asc(users.name)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(inArray(users.role, ["agent", "admin"]), eq(users.active, true)))
      .orderBy(asc(users.name)),
  ]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Teams are queues. Point a category at a team and its new tickets land there; new-ticket emails go to that
          team&apos;s members.
        </p>
        <TeamDialog staff={staff}>
          <Button>
            <Plus /> New team
          </Button>
        </TeamDialog>
      </div>
      <Card className="divide-y overflow-hidden">
        {teamRows.length === 0 ? (
          <EmptyState title="No teams yet">
            Without teams, every agent sees every ticket and is emailed about new ones.
          </EmptyState>
        ) : (
          teamRows.map((team) => {
            const mine = members.filter((m) => m.teamId === team.id);
            return (
              <div key={team.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium">{team.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {mine.length ? mine.map((m) => m.name).join(", ") : "No members"}
                  </p>
                </div>
                <TeamDialog staff={staff} team={{ id: team.id, name: team.name, memberIds: mine.map((m) => m.userId) }}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </TeamDialog>
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
