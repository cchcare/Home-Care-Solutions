import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ensureOffboardingSchema } from "../initDb";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import {
  offboardingTemplates,
  offboardingTemplateSteps,
  offboardingInstances,
  offboardingInstanceSteps,
  users,
  caregivers,
} from "@shared/schema";
import {
  launchOffboardingInstance,
  processDueTerminations,
  hasInProgressOffboarding,
  findTemplateForEmployee,
  markInstanceStepComplete,
  assertTemplateUsable,
} from "../offboarding";
import { eq } from "drizzle-orm";

async function cleanup() {
  await db.execute(sql`DELETE FROM offboarding_instance_steps`);
  await db.execute(sql`DELETE FROM offboarding_instances`);
  await db.execute(sql`DELETE FROM offboarding_template_steps`);
  await db.execute(sql`DELETE FROM offboarding_templates WHERE name LIKE 'TEST-OFF-%'`);
  await db.execute(sql`DELETE FROM caregivers WHERE employee_id LIKE 'TEST-OFF-%'`);
  await db.execute(sql`DELETE FROM users WHERE username LIKE 'test-off-%'`);
}

describe("Offboarding (Task #137)", () => {
  let tplId: string;
  let userId: string;
  let caregiverId: string;

  beforeAll(async () => {
    await ensureOffboardingSchema();
    await cleanup();

    const [u] = await db.insert(users).values({
      username: "test-off-user-1",
      email: "test-off-user-1@example.com",
      firstName: "Term",
      lastName: "Worker",
      role: "caregiver",
      isActive: true,
    }).returning();
    userId = u.id;

    const [c] = await db.insert(caregivers).values({
      userId: u.id,
      employeeId: "TEST-OFF-1",
      firstName: "Term",
      lastName: "Worker",
      isActive: true,
    } as any).returning();
    caregiverId = c.id;

    const [tpl] = await db.insert(offboardingTemplates).values({
      name: "TEST-OFF-Caregiver",
      role: "caregiver",
      isActive: true,
    }).returning();
    tplId = tpl.id;
    await db.insert(offboardingTemplateSteps).values([
      { templateId: tpl.id, stepOrder: 0, stepType: "account_deactivation", title: "Disable account" } as any,
      { templateId: tpl.id, stepOrder: 1, stepType: "checklist", title: "Return badge" } as any,
    ]);
  });

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  it("launches an instance with steps copied from the template", async () => {
    const term = new Date(Date.now() - 60_000); // already due
    const inst = await launchOffboardingInstance({
      templateId: tplId,
      employeeType: "caregiver",
      employeeCaregiverId: caregiverId,
      employeeUserId: userId,
      terminationDate: term,
    });
    expect(inst.id).toBeTruthy();
    expect(inst.status).toBe("in_progress");

    const steps = await db.select().from(offboardingInstanceSteps).where(eq(offboardingInstanceSteps.instanceId, inst.id));
    expect(steps.length).toBe(2);

    expect(await hasInProgressOffboarding({ employeeCaregiverId: caregiverId })).toBe(true);
  });

  it("findTemplateForEmployee picks an active caregiver template", async () => {
    const tpl = await findTemplateForEmployee({ employeeType: "caregiver" });
    expect(tpl?.id).toBe(tplId);
  });

  it("assertTemplateUsable blocks wrong-role templates", async () => {
    const res = assertTemplateUsable({ isActive: true, role: "office_staff" }, null, "caregiver");
    expect(res?.code).toBe(400);
  });

  it("processDueTerminations disables the user and auto-completes account_deactivation", async () => {
    const result = await processDueTerminations();
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const [u] = await db.select().from(users).where(eq(users.id, userId));
    expect(u.isActive).toBe(false);

    // Step should be marked completed
    const steps = await db.select().from(offboardingInstanceSteps);
    const acct = steps.find((s) => s.stepType === "account_deactivation");
    expect(acct?.status).toBe("completed");
  });

  it("finalizes the instance and audits termination when all required steps complete", async () => {
    const steps = await db.select().from(offboardingInstanceSteps);
    const checklist = steps.find((s) => s.stepType === "checklist")!;
    await markInstanceStepComplete(checklist.id, null);

    const [inst] = await db.select().from(offboardingInstances).where(eq(offboardingInstances.id, checklist.instanceId));
    expect(inst.status).toBe("completed");

    const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, caregiverId));
    expect(cg.isActive).toBe(false);
  });
});
