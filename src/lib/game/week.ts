// src/lib/game/week.ts
// Weeks run Monday 00:00 UTC → Sunday 23:59 UTC.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
// 1970-01-01 was a Thursday; the first Monday 00:00 UTC is 1970-01-05.
const FIRST_MONDAY_MS = 4 * DAY_MS;

/** Weeks since the first Monday of 1970, used to rotate the roster. */
export function weekIndex(date: Date = new Date()): number {
  return Math.floor((date.getTime() - FIRST_MONDAY_MS) / WEEK_MS);
}

export function weekStart(index: number): Date {
  return new Date(FIRST_MONDAY_MS + index * WEEK_MS);
}

/** ISO 8601 week id, e.g. '2026-W40'. */
export function isoWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function weekIdForIndex(index: number): string {
  return isoWeekId(weekStart(index));
}
