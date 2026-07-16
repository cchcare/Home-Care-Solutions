import { describe, it, expect } from "vitest";
import {
  computeCaregiverPeriod,
  computeCaregiverCompensation,
  round2,
} from "../coordinator-compensation";

describe("Coordinator compensation calculations", () => {
  // Confirmed worked example from the spec:
  //   Caregiver 84 total hours (80 regular + 4 OT), rate $15/hr
  //   Coordinator rate $16/hr
  //   Coordinator gross = 16 * 84 = $1,344
  //   Caregiver payroll = 80*15 + 4*15*1.5 = 1200 + 90 = $1,290
  //   Compensation = 1344 - 1290 = $54
  it("matches the confirmed worked example (44 + 40 across two weeks)", () => {
    const entries = [
      { workDate: "2026-01-05", hours: 44 }, // week 1: 44 -> 40 reg + 4 OT
      { workDate: "2026-01-12", hours: 40 }, // week 2: 40 -> 40 reg + 0 OT
    ];
    const cg = computeCaregiverPeriod(entries, 15, 40, "2026-01-05", "2026-01-18");
    expect(cg.totalHours).toBe(84);
    expect(cg.regularHours).toBe(80);
    expect(cg.overtimeHours).toBe(4);
    expect(cg.payroll).toBe(1290);

    const comp = computeCaregiverCompensation(cg, 16);
    expect(comp.coordinatorGross).toBe(1344);
    expect(comp.compensation).toBe(54);
  });

  it("also yields 80/4 for 42 + 42 across two weeks (weekly OT, same total)", () => {
    const entries = [
      { workDate: "2026-01-05", hours: 42 },
      { workDate: "2026-01-12", hours: 42 },
    ];
    const cg = computeCaregiverPeriod(entries, 15, 40, "2026-01-05", "2026-01-18");
    expect(cg.regularHours).toBe(80);
    expect(cg.overtimeHours).toBe(4);
  });

  it("sums multiple entries within the same week before applying the OT threshold", () => {
    const entries = [
      { workDate: "2026-01-05", hours: 8 },
      { workDate: "2026-01-06", hours: 8 },
      { workDate: "2026-01-07", hours: 8 },
      { workDate: "2026-01-08", hours: 8 },
      { workDate: "2026-01-09", hours: 12 }, // week1 total 44 -> 40 reg + 4 OT
    ];
    const cg = computeCaregiverPeriod(entries, 20, 40, "2026-01-05", "2026-01-18");
    expect(cg.totalHours).toBe(44);
    expect(cg.regularHours).toBe(40);
    expect(cg.overtimeHours).toBe(4);
    expect(cg.payroll).toBe(round2(40 * 20 + 4 * 20 * 1.5));
  });

  it("ignores entries outside the period window", () => {
    const entries = [
      { workDate: "2026-01-04", hours: 10 }, // before start
      { workDate: "2026-01-05", hours: 10 },
      { workDate: "2026-01-19", hours: 10 }, // after end
    ];
    const cg = computeCaregiverPeriod(entries, 15, 40, "2026-01-05", "2026-01-18");
    expect(cg.totalHours).toBe(10);
  });

  it("allows negative compensation (coordinator rate below effective caregiver cost)", () => {
    const entries = [{ workDate: "2026-01-05", hours: 40 }];
    const cg = computeCaregiverPeriod(entries, 20, 40, "2026-01-05", "2026-01-18");
    // caregiver payroll = 40*20 = 800; coordinator gross = 10*40 = 400
    const comp = computeCaregiverCompensation(cg, 10);
    expect(comp.compensation).toBe(-400);
  });

  it("no hours -> zero everything", () => {
    const cg = computeCaregiverPeriod([], 15, 40, "2026-01-05", "2026-01-18");
    expect(cg.totalHours).toBe(0);
    expect(cg.payroll).toBe(0);
    const comp = computeCaregiverCompensation(cg, 16);
    expect(comp.compensation).toBe(0);
  });
});
