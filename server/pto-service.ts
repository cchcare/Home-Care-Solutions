import { db } from "./db";
import { storage } from "./storage";
import { caregivers, ptoPolicies, ptoLedger, users, officePayrollConfigs } from "@shared/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";

export type PtoType = "vacation" | "sick" | "personal";

function toDateOnly(d: Date): string {
  // YYYY-MM-DD in UTC
  return d.toISOString().slice(0, 10);
}

/**
 * Decide which policy applies to a caregiver. Best match wins:
 *   1) office + role exact match
 *   2) office only
 *   3) role only
 *   4) global (no office, no role)
 * Per PTO type.
 */
/**
 * Per-policy accrual eligibility for a given date. A policy only credits on
 * dates that match its cadence so weekly/semi-monthly/monthly policies don't
 * over-accrue when the scheduler fires for a different cadence's pay date.
 */
function isPolicyDueOn(frequency: string | null | undefined, today: Date): boolean {
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const freq = frequency ?? "biweekly";
  if (freq === "weekly") {
    return todayUtc.getUTCDay() === 5; // Friday
  }
  if (freq === "biweekly") {
    const anchor = new Date("2024-01-05T00:00:00Z");
    const diffDays = Math.floor((todayUtc.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % 14 === 0;
  }
  if (freq === "semi_monthly") {
    const d = todayUtc.getUTCDate();
    if (d === 15) return true;
    // 30th, or last day of the month if it's shorter
    const lastDay = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, 0)).getUTCDate();
    return d === Math.min(30, lastDay) || (lastDay < 30 && d === lastDay);
  }
  if (freq === "monthly") {
    return todayUtc.getUTCDate() === 1;
  }
  return false;
}

function pickPolicy(
  policies: Array<{ id: string; ptoType: string; role: string | null; officeId: string | null; hoursPerPeriod: string; capHours: string | null; accrualFrequency: string | null; isActive: boolean | null }>,
  ptoType: PtoType,
  caregiverOfficeId: string | null,
  caregiverRole: string | null,
) {
  const active = policies.filter(p => p.ptoType === ptoType && p.isActive !== false);
  const score = (p: typeof active[number]) => {
    let s = 0;
    if (p.officeId && p.officeId === caregiverOfficeId) s += 2;
    else if (p.officeId) return -1;
    if (p.role && caregiverRole && p.role === caregiverRole) s += 1;
    else if (p.role) return -1;
    return s;
  };
  let best: typeof active[number] | null = null;
  let bestScore = -1;
  for (const p of active) {
    const s = score(p);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

export interface AccrualRunResult {
  runDate: string;
  employeesProcessed: number;
  ledgerInserts: number;
  skippedNoPolicy: number;
  skippedCapped: number;
}

/**
 * Run accruals for `runDate`. Idempotent: re-runs insert no new rows because of
 * the (caregiver_id, pto_type, run_date, source) unique index.
 */
export async function runAccruals(runDate: Date = new Date(), opts: { officeId?: string } = {}): Promise<AccrualRunResult> {
  const runDateStr = toDateOnly(runDate);

  const cgConds: any[] = [eq(caregivers.isActive, true)];
  if (opts.officeId) cgConds.push(eq(caregivers.officeId, opts.officeId));

  const activeCaregivers = await db
    .select({
      id: caregivers.id,
      officeId: caregivers.officeId,
      userId: caregivers.userId,
    })
    .from(caregivers)
    .where(and(...cgConds));

  // Lookup role for each caregiver via their linked user (if any).
  const userIds = activeCaregivers.map(c => c.userId).filter((x): x is string => !!x);
  const userRoleMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
    for (const u of userRows) userRoleMap.set(u.id, u.role);
  }

  const policies = await db.select().from(ptoPolicies).where(eq(ptoPolicies.isActive, true));
  const policyRows = policies.map(p => ({
    id: p.id,
    ptoType: p.ptoType as string,
    role: p.role,
    officeId: p.officeId,
    hoursPerPeriod: p.hoursPerPeriod as unknown as string,
    capHours: p.capHours as unknown as string | null,
    accrualFrequency: (p.accrualFrequency as unknown as string) ?? "biweekly",
    isActive: p.isActive,
  }));

  const types: PtoType[] = ["vacation", "sick", "personal"];
  let ledgerInserts = 0;
  let skippedNoPolicy = 0;
  let skippedCapped = 0;

  for (const cg of activeCaregivers) {
    const role = cg.userId ? userRoleMap.get(cg.userId) ?? null : null;

    for (const t of types) {
      const policy = pickPolicy(policyRows, t, cg.officeId, role);
      if (!policy) { skippedNoPolicy++; continue; }

      // Frequency gating: only accrue policies whose cadence matches today.
      if (!isPolicyDueOn(policy.accrualFrequency, runDate)) continue;

      const hours = parseFloat(policy.hoursPerPeriod) || 0;
      if (hours <= 0) continue;

      // Apply cap: don't credit beyond capHours
      let delta = hours;
      if (policy.capHours) {
        const cap = parseFloat(policy.capHours);
        const balances = await storage.getPtoBalancesFromLedger(cg.id);
        const current = balances.find(b => b.ptoType === t)?.balance ?? 0;
        if (current >= cap) { skippedCapped++; continue; }
        if (current + delta > cap) delta = Math.max(0, cap - current);
        if (delta <= 0) { skippedCapped++; continue; }
      }

      const inserted = await storage.insertPtoLedgerEntry({
        caregiverId: cg.id,
        ptoType: t,
        source: "accrual",
        deltaHours: delta.toFixed(2),
        runDate: runDateStr,
        policyId: policy.id,
        reason: `Accrual ${runDateStr} (${policy.id})`,
      } as any);
      if (inserted) ledgerInserts++;
    }
  }

  return {
    runDate: runDateStr,
    employeesProcessed: activeCaregivers.length,
    ledgerInserts,
    skippedNoPolicy,
    skippedCapped,
  };
}

/**
 * Compute number of PTO hours for a time-off request. Uses `hoursRequested` if
 * present; otherwise estimates 8 hrs/day across the date range.
 */
export function requestHours(req: { hoursRequested: string | null; startDate: Date | string; endDate: Date | string }): number {
  if (req.hoursRequested) {
    const h = parseFloat(req.hoursRequested as any);
    if (!isNaN(h) && h > 0) return h;
  }
  const s = new Date(req.startDate);
  const e = new Date(req.endDate);
  const days = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  return days * 8;
}

/**
 * Decide whether `requestType` maps to a tracked PTO ledger type.
 */
export function ledgerTypeForRequest(requestType: string): PtoType | null {
  if (requestType === "vacation" || requestType === "sick" || requestType === "personal") return requestType;
  return null;
}

/**
 * Today is a biweekly accrual date for the given office payroll config (or
 * default biweekly cadence anchored to 2024-01-05) when no config exists.
 */
export async function isAccrualDateForAnyOffice(today: Date = new Date()): Promise<boolean> {
  // Treat the default cadence as biweekly Fridays anchored at 2024-01-05.
  const todayStr = toDateOnly(today);
  const configs = await db.select().from(officePayrollConfigs);

  // Default: biweekly Fridays from anchor
  const anchor = new Date("2024-01-05T00:00:00Z");
  const diffDays = Math.floor((today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  const defaultBiweeklyHit = diffDays >= 0 && diffDays % 14 === 0;

  if (configs.length === 0) return defaultBiweeklyHit;

  for (const cfg of configs) {
    const customDates = (cfg.customPayrollDates as unknown as string[] | null) ?? null;
    if (customDates && customDates.includes(todayStr)) return true;
    if (cfg.payrollFrequency === "weekly") {
      // Every Friday
      if (today.getUTCDay() === 5) return true;
    } else if (cfg.payrollFrequency === "biweekly" || !cfg.payrollFrequency) {
      if (defaultBiweeklyHit) return true;
    } else if (cfg.payrollFrequency === "semi_monthly") {
      const d = today.getUTCDate();
      if (d === 15 || d === 30 || d === 31) return true;
    } else if (cfg.payrollFrequency === "monthly") {
      if (today.getUTCDate() === 1) return true;
    }
  }
  return false;
}
