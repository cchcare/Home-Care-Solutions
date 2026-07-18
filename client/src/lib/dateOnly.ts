// Helpers for "date-only" fields (e.g. date of birth) that are stored as a
// timestamp but represent a calendar date, not a moment in time.
//
// The bug this fixes: `new Date("1990-05-15")` parses as UTC midnight. If
// that Date is later rendered with `.toLocaleDateString()` / date-fns
// `format()` (both of which use the LOCAL timezone), any timezone behind
// UTC (e.g. every US timezone) rolls it back to "1990-05-14". These helpers
// keep every date-only value anchored to noon UTC on write, and read the
// calendar date back out using UTC getters (never local getters), so the
// same calendar day survives regardless of the browser's timezone.

/** Convert a native `<input type="date">` value ("YYYY-MM-DD") into a Date
 *  anchored at noon UTC, safe to store/send without shifting a day in any
 *  timezone from UTC-12 to UTC+14. */
export function parseDateOnlyInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
}

/** Convert a stored date-only value (Date, ISO string, or "YYYY-MM-DD") into
 *  the "YYYY-MM-DD" string a native `<input type="date">` expects, reading
 *  the calendar date from UTC components so it doesn't shift by a day. */
export function toDateOnlyInputValue(value: string | Date | null | undefined): string {
  const parts = dateOnlyParts(value);
  if (!parts) return "";
  const [y, m, d] = parts;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Extract [year, month(1-12), day] from a date-only value using UTC
 *  getters, so the calendar date is read the same way regardless of the
 *  viewer's local timezone. */
export function dateOnlyParts(value: string | Date | null | undefined): [number, number, number] | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

/** Build a local Date object anchored at local midnight on the same
 *  calendar day the stored value represents (via UTC components). Safe to
 *  hand to date-fns `format()` or `.toLocaleDateString()` without the
 *  day rolling back. */
export function dateOnlyToLocalDate(value: string | Date | null | undefined): Date | null {
  const parts = dateOnlyParts(value);
  if (!parts) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/** Format a date-only value for display without timezone-induced day shift.
 *  `formatter` receives the timezone-safe local Date; defaults to
 *  `toLocaleDateString()`. */
export function formatDateOnly(
  value: string | Date | null | undefined,
  formatter?: (d: Date) => string,
): string {
  const d = dateOnlyToLocalDate(value);
  if (!d) return "";
  return formatter ? formatter(d) : d.toLocaleDateString();
}
