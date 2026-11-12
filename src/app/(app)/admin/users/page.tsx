import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { Search } from "lucide-react";
import { UserControls } from "@/components/admin/user-row";
import { EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { teamMembers, teams, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";

const LIMIT = 100;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const q = ((await searchParams).q ?? "").trim();
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  const [people, memberships, [{ total }]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(q ? or(ilike(users.name, like), ilike(users.email, like)) : undefined)
      .orderBy(sql`case ${users.role} when 'admin' then 0 when 'agent' then 1 else 2 end`, asc(users.name))
      .limit(LIMIT),
    db
      .select({ userId: teamMembers.userId, team: teams.name })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId)),
    db.select({ total: sql<number>`count(*)::int` }).from(users).where(and(q ? or(ilike(users.name, like), ilike(users.email, like)) : undefined)),
  ]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="relative w-full max-w-sm" action="/admin/users">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={q} placeholder="Search by name or email" aria-label="Search people" className="pl-9" />
        </form>
        <p className="text-sm text-muted-foreground">
          People appear here after they first sign in. Agents work tickets; admins can also change settings.
        </p>
      </div>
      <Card className="overflow-hidden">
        {people.length === 0 ? (
          <EmptyState title="No one matches that search" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Person</TableHead>
                <TableHead className="hidden md:table-cell">Teams</TableHead>
                <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
                <TableHead className="pr-5 text-right">Role · Can sign in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5">
                    <span className="block font-medium">
                      {p.name}
                      {p.id === admin.id && <span className="font-normal text-muted-foreground"> (you)</span>}
                    </span>
                    <span className="block text-[0.8125rem] text-muted-foreground">{p.email}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {memberships
                        .filter((m) => m.userId === p.id)
                        .map((m) => (
                          <Badge key={m.team}>{m.team}</Badge>
                        ))}
                    </span>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                    {p.lastLoginAt ? formatDate(p.lastLoginAt) : "Never"}
                  </TableCell>
                  <TableCell className="pr-5">
                    <UserControls id={p.id} role={p.role} active={p.active} self={p.id === admin.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {total > LIMIT && (
        <p className="mt-3 text-sm text-muted-foreground">
          Showing the first {LIMIT} of {total}. Search to find someone specific.
        </p>
      )}
    </>
  );
}
