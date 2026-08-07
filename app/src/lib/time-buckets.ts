/**
 * Interval bucket math for suggestion cadence (PROJECT.md §7.2).
 *
 * A bucket key identifies the window a suggestion counts against:
 *   daily   → "2026-08-07"
 *   weekly  → "2026-W32"   (ISO 8601 week, Monday-based)
 *   monthly → "2026-08"
 *
 * All math is UTC so webhook servers, cron, and the DB agree on boundaries.
 */

export type SuggestionInterval = "daily" | "weekly" | "monthly";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** ISO 8601 week number (1-53) and its ISO year, UTC. */
export function isoWeek(date: Date): { year: number; week: number } {
  // Thursday of the current week decides the ISO year.
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayOfWeek = d.getUTCDay() || 7; // Sunday → 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return { year: isoYear, week };
}

/** The bucket key `date` falls into for the given interval. */
export function intervalBucket(
  date: Date,
  interval: SuggestionInterval,
): string {
  switch (interval) {
    case "daily":
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    case "weekly": {
      const { year, week } = isoWeek(date);
      return `${year}-W${pad(week)}`;
    }
    case "monthly":
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
  }
}
