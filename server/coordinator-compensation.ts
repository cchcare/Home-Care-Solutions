// Coordinator Compensation calculations.
//
// Pure, deterministic functions so the money math is unit-testable and matches
// the confirmed worked example. Overtime is split weekly at a configurable
// threshold (FLSA default 40 hrs/week): each 7-day bucket from the period start
// contributes up to `threshold` regular hours and the remainder as overtime.
//
//   caregiver_payroll = regular * rate + overtime * rate * 1.5
//   coordinator_gross = coordinator_rate * total_hours
//   compensation      = coordinator_gross - caregiver_payroll   (may be negative)

export interface ScheduleHours {
  workDate: string; // YYYY-MM-DD
  hours: number;
}

export interface CaregiverPeriodResult {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  payroll: number; // caregiver's actual pay for the period
}

/** Days between two YYYY-MM-DD dates (b - a), using UTC to avoid TZ drift. */
function daysBetween(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.floor((db - da) / 86400000);
}

/** Round to cents to avoid floating-point drift accumulating in payroll totals. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sum a caregiver's hours into 7-day buckets anchored at the period start,
 * then split each bucket into regular (up to threshold) and overtime.
 * Entries outside [periodStart, periodEnd] are ignored.
 */
export function computeCaregiverPeriod(
  entries: ScheduleHours[],
  caregiverRate: number,
  otWeeklyThreshold: number,
  periodStart: string,
  periodEnd: string,
): CaregiverPeriodResult {
  const buckets = new Map<number, number>();
  for (const e of entries) {
    if (e.workDate < periodStart || e.workDate > periodEnd) continue;
    const offset = daysBetween(periodStart, e.workDate);
    if (offset < 0) continue;
    const week = Math.floor(offset / 7);
    buckets.set(week, (buckets.get(week) ?? 0) + (Number(e.hours) || 0));
  }

  let regularHours = 0;
  let overtimeHours = 0;
  let totalHours = 0;
  for (const weekHours of buckets.values()) {
    totalHours += weekHours;
    const reg = Math.min(weekHours, otWeeklyThreshold);
    regularHours += reg;
    overtimeHours += Math.max(0, weekHours - otWeeklyThreshold);
  }

  const payroll = round2(regularHours * caregiverRate + overtimeHours * caregiverRate * 1.5);
  return {
    totalHours: round2(totalHours),
    regularHours: round2(regularHours),
    overtimeHours: round2(overtimeHours),
    payroll,
  };
}

/**
 * Coordinator compensation for a single caregiver in a period:
 *   coordinator_gross - caregiver_payroll. May be negative (allowed to net).
 */
export function computeCaregiverCompensation(
  caregiverResult: CaregiverPeriodResult,
  coordinatorRate: number,
): { coordinatorGross: number; compensation: number } {
  const coordinatorGross = round2(coordinatorRate * caregiverResult.totalHours);
  return {
    coordinatorGross,
    compensation: round2(coordinatorGross - caregiverResult.payroll),
  };
}
