import "server-only";
import { env } from "./env";

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: env.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: env.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatSpan(ms: number) {
  const mins = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.floor(hours)}h${mins % 60 >= 1 && hours < 10 ? ` ${mins % 60}m` : ""}`;
  const days = Math.floor(hours / 24);
  const rem = Math.floor(hours % 24);
  return rem && days < 7 ? `${days}d ${rem}h` : `${days}d`;
}

export function timeAgo(d: Date, now = new Date()) {
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff > 30 * 86_400_000) return formatDate(d);
  return `${formatSpan(diff)} ago`;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
