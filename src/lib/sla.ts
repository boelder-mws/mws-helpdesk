export type BusinessHours = {
  /** false = the SLA clock runs 24/7 */
  enabled: boolean;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  /** "HH:MM" in the helpdesk timezone */
  start: string;
  end: string;
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  start: "08:00",
  end: "17:00",
};

type Parts = { y: number; m: number; d: number; weekday: number; minutes: number };

const formatters = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
    });
    formatters.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function zonedParts(date: Date, tz: string): Parts {
  const p: Record<string, string> = {};
  for (const part of fmt(tz).formatToParts(date)) p[part.type] = part.value;
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    weekday: WEEKDAYS.indexOf(p.weekday),
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** UTC instant for a wall-clock time in `tz`. Day/minute overflow is allowed. */
function zonedToUtc(y: number, m: number, d: number, minutes: number, tz: string): Date {
  const wall = Date.UTC(y, m - 1, d, 0, minutes);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(guess), tz);
    const shown = Date.UTC(p.y, p.m - 1, p.d, 0, p.minutes);
    if (shown === wall) break;
    guess += wall - shown;
  }
  return new Date(guess);
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Adds working minutes to `start`, skipping time outside business hours. */
export function addWorkingMinutes(start: Date, minutes: number, hours: BusinessHours, tz: string): Date {
  const open = toMinutes(hours.start);
  const close = toMinutes(hours.end);
  if (!hours.enabled || hours.days.length === 0 || close <= open) {
    return new Date(start.getTime() + minutes * 60_000);
  }
  let remaining = minutes;
  let cursor = start;
  for (let i = 0; i < 3660; i++) {
    const p = zonedParts(cursor, tz);
    if (hours.days.includes(p.weekday)) {
      const opens = zonedToUtc(p.y, p.m, p.d, open, tz).getTime();
      const closes = zonedToUtc(p.y, p.m, p.d, close, tz).getTime();
      const from = Math.max(cursor.getTime(), opens);
      if (from < closes) {
        const available = (closes - from) / 60_000;
        if (remaining <= available) return new Date(from + remaining * 60_000);
        remaining -= available;
      }
    }
    cursor = zonedToUtc(p.y, p.m, p.d + 1, 0, tz);
  }
  return new Date(start.getTime() + minutes * 60_000);
}

export type SlaInput = {
  status: string;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
};

export type SlaState = {
  kind: "response" | "resolution";
  due: Date;
  /** done = target already met or missed (ticket answered / resolved) */
  done: boolean;
  overdue: boolean;
};

/** The target that matters right now for a ticket, if it has one. */
export function currentSla(t: SlaInput, now = new Date()): SlaState | null {
  const finished = t.status === "resolved" || t.status === "closed";
  if (!finished && !t.firstRespondedAt && t.firstResponseDueAt) {
    return { kind: "response", due: t.firstResponseDueAt, done: false, overdue: t.firstResponseDueAt < now };
  }
  if (!t.resolutionDueAt) return null;
  if (finished) {
    const at = t.resolvedAt ?? now;
    return { kind: "resolution", due: t.resolutionDueAt, done: true, overdue: at > t.resolutionDueAt };
  }
  return { kind: "resolution", due: t.resolutionDueAt, done: false, overdue: t.resolutionDueAt < now };
}
