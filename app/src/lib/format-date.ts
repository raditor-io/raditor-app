/**
 * Org-aware date & time formatting on native Intl.DateTimeFormat (no date
 * library). Dashboard pages render timestamps through these helpers using the
 * organization's timezone / date_format / time_format settings; API and
 * webhook payloads keep raw ISO strings and must not go through here.
 *
 * The explicit patterns (DD/MM/YYYY etc.) are assembled from formatToParts so
 * order and separator never depend on the runtime locale while the values
 * stay correct for the configured timezone.
 */

export const DATE_FORMAT_IDS = [
  "mdy_slash",
  "dmy_slash",
  "dmy_dot",
  "ymd_dash",
  "long",
] as const;
export type DateFormatId = (typeof DATE_FORMAT_IDS)[number];

export const TIME_FORMAT_IDS = ["12h", "24h", "none"] as const;
export type TimeFormatId = (typeof TIME_FORMAT_IDS)[number];

export interface DateTimeSettings {
  /** IANA timezone id, e.g. "UTC" or "Europe/Berlin". */
  timezone: string;
  dateFormat: DateFormatId;
  timeFormat: TimeFormatId;
}

export const DEFAULT_DATE_TIME_SETTINGS: DateTimeSettings = {
  timezone: "UTC",
  dateFormat: "mdy_slash",
  timeFormat: "12h",
};

/** The UI is English-only; the formatting locale is fixed accordingly. */
const LOCALE = "en-US";

export function isValidTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat(LOCALE, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Narrow an organization row's raw setting columns to a usable settings
 * object, falling back per field so a bad stored value never breaks a render.
 */
export function dateTimeSettingsOf(org: {
  timezone: string;
  date_format: string;
  time_format: string;
}): DateTimeSettings {
  return {
    timezone: isValidTimezone(org.timezone)
      ? org.timezone
      : DEFAULT_DATE_TIME_SETTINGS.timezone,
    dateFormat: (DATE_FORMAT_IDS as readonly string[]).includes(org.date_format)
      ? (org.date_format as DateFormatId)
      : DEFAULT_DATE_TIME_SETTINGS.dateFormat,
    timeFormat: (TIME_FORMAT_IDS as readonly string[]).includes(org.time_format)
      ? (org.time_format as TimeFormatId)
      : DEFAULT_DATE_TIME_SETTINGS.timeFormat,
  };
}

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const EXPLICIT_PATTERNS: Record<
  Exclude<DateFormatId, "long">,
  (p: { day: string; month: string; year: string }) => string
> = {
  mdy_slash: (p) => `${p.month}/${p.day}/${p.year}`,
  dmy_slash: (p) => `${p.day}/${p.month}/${p.year}`,
  dmy_dot: (p) => `${p.day}.${p.month}.${p.year}`,
  ymd_dash: (p) => `${p.year}-${p.month}-${p.day}`,
};

/** Fixed-width day/month/year digits in the given zone. */
function dateParts(
  date: Date,
  timeZone: string,
): { day: string; month: string; year: string } {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { day: get("day"), month: get("month"), year: get("year") };
}

function datePortion(date: Date, settings: DateTimeSettings): string {
  if (settings.dateFormat === "long") {
    return new Intl.DateTimeFormat(LOCALE, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: settings.timezone,
    }).format(date);
  }
  return EXPLICIT_PATTERNS[settings.dateFormat](
    dateParts(date, settings.timezone),
  );
}

function timePortion(date: Date, settings: DateTimeSettings): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: settings.timezone,
    // hourCycle (not hour12) so 24h midnight renders 00:30, never 24:30.
    ...(settings.timeFormat === "12h"
      ? { hour12: true }
      : { hourCycle: "h23" as const }),
  }).format(date);
}

/** Date in the org's format and timezone. Empty string for invalid input. */
export function formatDate(
  value: DateInput,
  settings: DateTimeSettings,
): string {
  const date = toDate(value);
  if (!date) return "";
  return datePortion(date, settings);
}

/** Time in the org's format and timezone. Empty for invalid input or "none". */
export function formatTime(
  value: DateInput,
  settings: DateTimeSettings,
): string {
  const date = toDate(value);
  if (!date || settings.timeFormat === "none") return "";
  return timePortion(date, settings);
}

/** Date + time in the org's settings; "none" renders the date alone. */
export function formatDateTime(
  value: DateInput,
  settings: DateTimeSettings,
): string {
  const date = toDate(value);
  if (!date) return "";
  const datePart = datePortion(date, settings);
  if (settings.timeFormat === "none") return datePart;
  return `${datePart}, ${timePortion(date, settings)}`;
}
