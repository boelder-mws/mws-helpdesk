import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { env } from "./env";

export type Daily = { day: string; created: number; resolved: number };

export async function getReport(days: number) {
  const tz = env.timezone;
  const since = sql`(now() - make_interval(days => ${days}))`;

  const [daily, summary, byCategory, byAgent] = await Promise.all([
    db.execute<Daily>(sql`
      with d as (
        select generate_series(
          (now() at time zone ${tz})::date - ${days - 1}::int,
          (now() at time zone ${tz})::date,
          interval '1 day')::date as day
      )
      select to_char(d.day, 'YYYY-MM-DD') as day,
        (select count(*) from tickets t where (t.created_at at time zone ${tz})::date = d.day)::int as created,
        (select count(*) from tickets t where t.resolved_at is not null
           and (t.resolved_at at time zone ${tz})::date = d.day)::int as resolved
      from d order by d.day`),
    db.execute<{
      created: number;
      resolved: number;
      open_now: number;
      median_response: number | null;
      median_resolution: number | null;
      response_met: number;
      response_total: number;
      resolution_met: number;
      resolution_total: number;
    }>(sql`
      select
        count(*) filter (where created_at >= ${since})::int as created,
        count(*) filter (where resolved_at >= ${since})::int as resolved,
        count(*) filter (where status in ('open','in_progress','pending'))::int as open_now,
        (percentile_cont(0.5) within group (order by extract(epoch from first_responded_at - created_at))
           filter (where first_responded_at >= ${since}))::float as median_response,
        (percentile_cont(0.5) within group (order by extract(epoch from resolved_at - created_at))
           filter (where resolved_at >= ${since}))::float as median_resolution,
        count(*) filter (where first_responded_at >= ${since} and first_response_due_at is not null
           and first_responded_at <= first_response_due_at)::int as response_met,
        count(*) filter (where first_responded_at >= ${since} and first_response_due_at is not null)::int as response_total,
        count(*) filter (where resolved_at >= ${since} and resolution_due_at is not null
           and resolved_at <= resolution_due_at)::int as resolution_met,
        count(*) filter (where resolved_at >= ${since} and resolution_due_at is not null)::int as resolution_total
      from tickets`),
    db.execute<{ name: string; count: number }>(sql`
      select coalesce(c.name, 'No category') as name, count(*)::int as count
      from tickets t left join categories c on c.id = t.category_id
      where t.created_at >= ${since}
      group by 1 order by count desc, name limit 8`),
    db.execute<{ name: string; resolved: number; open: number; median_resolution: number | null }>(sql`
      select u.name,
        count(*) filter (where t.resolved_at >= ${since})::int as resolved,
        count(*) filter (where t.status in ('open','in_progress','pending'))::int as open,
        (percentile_cont(0.5) within group (order by extract(epoch from t.resolved_at - t.created_at))
           filter (where t.resolved_at >= ${since}))::float as median_resolution
      from tickets t join users u on u.id = t.assignee_id
      group by u.id, u.name
      having count(*) filter (where t.resolved_at >= ${since}) > 0
          or count(*) filter (where t.status in ('open','in_progress','pending')) > 0
      order by resolved desc, u.name`),
  ]);

  return { daily: daily.rows, summary: summary.rows[0], byCategory: byCategory.rows, byAgent: byAgent.rows };
}
