"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Daily = { day: string; created: number; resolved: number };

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

function shortDay(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
}

function TipBox({ title, rows }: { title: string; rows: { label: string; value: number; color?: string }[] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-[0.8125rem] shadow-lg">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden />}
          <span className="text-muted-foreground">{r.label}</span>
          <span className="num ml-auto pl-4 font-medium">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function DailyChart({ data }: { data: Daily[] }) {
  return (
    <div>
      <ul className="mb-3 flex gap-5 text-[0.8125rem] text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-(--chart-1)" aria-hidden /> Created
        </li>
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-(--chart-2)" aria-hidden /> Resolved
        </li>
      </ul>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="day"
              tickFormatter={shortDay}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              minTickGap={32}
            />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TipBox
                    title={shortDay(String(label))}
                    rows={[
                      { label: "Created", value: Number(payload[0]?.payload.created), color: "var(--chart-1)" },
                      { label: "Resolved", value: Number(payload[0]?.payload.resolved), color: "var(--chart-2)" },
                    ]}
                  />
                ) : null
              }
            />
            <Line type="linear" dataKey="created" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
            <Line type="linear" dataKey="resolved" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div style={{ height: Math.max(120, data.length * 36 + 16) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fill: "var(--foreground)", fontSize: 13 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-axis)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox
                  title={String(payload[0].payload.name)}
                  rows={[{ label: "Tickets created", value: Number(payload[0].payload.count) }]}
                />
              ) : null
            }
          />
          <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
            <LabelList dataKey="count" position="right" fill="var(--foreground)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
