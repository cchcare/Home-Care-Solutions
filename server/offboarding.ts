import crypto from "crypto";
import { and, eq, desc, asc, or, sql, gte, lte, isNotNull, isNull } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import {
  offboardingTemplates,
  offboardingTemplateSteps,
  offboardingInstances,
  offboardingInstanceSteps,
  surveyTemplates,
  surveyResponses,
  caregiverSchedules,
  caregivers,
  users,
  type OffboardingInstance,
  type InsertOffboardingTemplate,
  type InsertOffboardingTemplateStep,
} from "@shared/schema";

export async function listTemplates(filters?: { officeId?: string; role?: string; isActive?: boolean; organizationId?: string | null }) {
  const conds: any[] = [];
  if (filters?.officeId) conds.push(eq(offboardingTemplates.officeId, filters.officeId));
  if (filters?.role) conds.push(eq(offboardingTemplates.role, filters.role));
  if (filters?.isActive !== undefined) conds.push(eq(offboardingTemplates.isActive, filters.isActive));
  if (filters?.organizationId !== undefined && filters?.organizationId !== null) {
    conds.push(or(eq(offboardingTemplates.organizationId, filters.organizationId), sql`${offboardingTemplates.organizationId} IS NULL`));
  }
  const q = db.select().from(offboardingTemplates);
  return conds.length ? await q.where(and(...conds)).orderBy(desc(offboardingTemplates.createdAt)) : await q.orderBy(desc(offboardingTemplates.createdAt));
}

export async function getTemplateWithSteps(id: string) {
  const [tmpl] = await db.select().from(offboardingTemplates).where(eq(offboardingTemplates.id, id));
  if (!tmpl) return null;
  const steps = await db.select().from(offboardingTemplateSteps).where(eq(offboardingTemplateSteps.templateId, id)).orderBy(asc(offboardingTemplateSteps.stepOrder));
  return { ...tmpl, steps };
}

export async function createTemplate(data: InsertOffboardingTemplate & { steps?: Array<Omit<InsertOffboardingTemplateStep, "templateId">> }) {
  const { steps = [], ...tplData } = data as any;
  const [tmpl] = await db.insert(offboardingTemplates).values(tplData).returning();
  if (steps.length) {
    await db.insert(offboardingTemplateSteps).values(
      steps.map((s: any, i: number) => ({ ...s, templateId: tmpl.id, stepOrder: s.stepOrder ?? i }))
    );
  }
  return getTemplateWithSteps(tmpl.id);
}

export async function updateTemplate(id: string, data: Partial<InsertOffboardingTemplate> & { steps?: Array<Omit<InsertOffboardingTemplateStep, "templateId">> }) {
  const { steps, ...tplData } = data as any;
  if (Object.keys(tplData).length) {
    await db.update(offboardingTemplates)
      .set({ ...tplData, updatedAt: new Date() })
      .where(eq(offboardingTemplates.id, id));
  }
  if (Array.isArray(steps)) {
    await db.delete(offboardingTemplateSteps).where(eq(offboardingTemplateSteps.templateId, id));
    if (steps.length) {
      await db.insert(offboardingTemplateSteps).values(
        steps.map((s: any, i: number) => ({ ...s, templateId: id, stepOrder: s.stepOrder ?? i }))
      );
    }
  }
  return getTemplateWithSteps(id);
}

export async function deleteTemplate(id: string) {
  await db.delete(offboardingTemplates).where(eq(offboardingTemplates.id, id));
}

export async function listInstances(filters?: { status?: string; employeeUserId?: string; employeeCaregiverId?: string; organizationId?: string | null }) {
  const conds: any[] = [];
  if (filters?.status) conds.push(eq(offboardingInstances.status, filters.status as any));
  if (filters?.employeeUserId) conds.push(eq(offboardingInstances.employeeUserId, filters.employeeUserId));
  if (filters?.employeeCaregiverId) conds.push(eq(offboardingInstances.employeeCaregiverId, filters.employeeCaregiverId));
  if (filters?.organizationId !== undefined && filters?.organizationId !== null) {
    conds.push(or(eq(offboardingInstances.organizationId, filters.organizationId), sql`${offboardingInstances.organizationId} IS NULL`));
  }
  const q = db.select().from(offboardingInstances);
  return conds.length ? await q.where(and(...conds)).orderBy(desc(offboardingInstances.launchedAt)) : await q.orderBy(desc(offboardingInstances.launchedAt));
}

export async function getInstanceWithSteps(id: string) {
  const [inst] = await db.select().from(offboardingInstances).where(eq(offboardingInstances.id, id));
  if (!inst) return null;
  const steps = await db.select().from(offboardingInstanceSteps).where(eq(offboardingInstanceSteps.instanceId, id)).orderBy(asc(offboardingInstanceSteps.stepOrder));
  const [tmpl] = inst.templateId
    ? await db.select().from(offboardingTemplates).where(eq(offboardingTemplates.id, inst.templateId))
    : [null];
  let employee: any = null;
  if (inst.employeeCaregiverId) {
    const [c] = await db.select().from(caregivers).where(eq(caregivers.id, inst.employeeCaregiverId));
    if (c?.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, c.userId));
      employee = { type: "caregiver", id: c.id, firstName: u?.firstName, lastName: u?.lastName, email: u?.email };
    } else {
      employee = { type: "caregiver", id: c?.id };
    }
  } else if (inst.employeeUserId) {
    const [u] = await db.select().from(users).where(eq(users.id, inst.employeeUserId));
    employee = { type: "user", id: u?.id, firstName: u?.firstName, lastName: u?.lastName, email: u?.email };
  }
  return { ...inst, steps, template: tmpl, employee };
}

interface LaunchOpts {
  templateId: string;
  employeeType: "caregiver" | "user";
  employeeCaregiverId?: string | null;
  employeeUserId?: string | null;
  terminationDate?: Date | null;
  launchedBy?: string | null;
  organizationId?: string | null;
}

export async function launchOffboardingInstance(opts: LaunchOpts): Promise<OffboardingInstance> {
  const tmpl = await getTemplateWithSteps(opts.templateId);
  if (!tmpl) throw new Error("Offboarding template not found");

  let recipientUser: any = null;
  if (opts.employeeType === "caregiver" && opts.employeeCaregiverId) {
    const [c] = await db.select().from(caregivers).where(eq(caregivers.id, opts.employeeCaregiverId));
    if (c?.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, c.userId));
      recipientUser = u;
    }
  } else if (opts.employeeUserId) {
    const [u] = await db.select().from(users).where(eq(users.id, opts.employeeUserId));
    recipientUser = u;
  }

  const [inst] = await db.insert(offboardingInstances).values({
    organizationId: opts.organizationId ?? recipientUser?.organizationId ?? null,
    templateId: opts.templateId,
    employeeType: opts.employeeType,
    employeeUserId: opts.employeeUserId ?? null,
    employeeCaregiverId: opts.employeeCaregiverId ?? null,
    terminationDate: opts.terminationDate ?? null,
    launchedBy: opts.launchedBy ?? null,
    status: "in_progress",
  }).returning();

  for (const s of tmpl.steps) {
    let linkId: string | null = null;
    try {
      if (s.stepType === "exit_interview" && s.refId && recipientUser?.email) {
        const [tpl] = await db.select().from(surveyTemplates).where(eq(surveyTemplates.id, s.refId));
        if (tpl) {
          const accessToken = crypto.randomBytes(24).toString("hex");
          const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
          const [resp] = await db.insert(surveyResponses).values({
            templateId: tpl.id,
            respondentType: opts.employeeType === "caregiver" ? "caregiver" : "caregiver",
            respondentId: recipientUser.id,
            respondentName: [recipientUser.firstName, recipientUser.lastName].filter(Boolean).join(" ") || recipientUser.email,
            respondentEmail: recipientUser.email,
            caregiverId: opts.employeeCaregiverId ?? null,
            sentAt: new Date(),
            expiresAt,
            status: "pending",
            accessToken,
          }).returning();
          linkId = resp.id;

          try {
            const baseUrl = process.env.BASE_URL || "http://localhost:5000";
            const link = `${baseUrl}/survey/${accessToken}`;
            const { sendEmail } = await import("./communication-services");
            const name = [recipientUser.firstName, recipientUser.lastName].filter(Boolean).join(" ") || recipientUser.email;
            await sendEmail({
              to: recipientUser.email,
              subject: `Exit Interview: ${tpl.name}`,
              html: `<p>Hello ${name},</p><p>As part of your offboarding we kindly ask you to complete a brief exit interview: <strong>${tpl.name}</strong>.</p><p><a href="${link}">Open the exit interview</a> (link expires ${expiresAt.toLocaleDateString("en-US")}).</p><p>Your responses are confidential and will only be visible to HR.</p>`,
              text: `Hello ${name}, please complete your exit interview "${tpl.name}": ${link}`,
            });
          } catch (mailErr) {
            console.error("[Offboarding] Exit interview email failed (non-fatal):", mailErr);
          }
        }
      }
    } catch (err) {
      console.error("[Offboarding] Failed to auto-fire step", s.stepType, err);
    }

    await db.insert(offboardingInstanceSteps).values({
      instanceId: inst.id,
      templateStepId: s.id,
      stepOrder: s.stepOrder ?? 0,
      stepType: s.stepType,
      title: s.title,
      description: s.description ?? null,
      refId: s.refId ?? null,
      linkId,
      status: "pending",
      isRequired: s.isRequired ?? true,
    });
  }

  try {
    await storage.createAuditLog({
      userId: opts.launchedBy ?? null,
      action: "offboarding_launched",
      entityType: "offboarding_instance",
      entityId: inst.id,
      newValues: { templateId: opts.templateId, employeeType: opts.employeeType, terminationDate: opts.terminationDate ?? null },
    } as any);
  } catch {}

  return inst;
}

async function flipEmployeeToTerminated(inst: OffboardingInstance) {
  try {
    if (inst.employeeCaregiverId) {
      await db.execute(sql`UPDATE caregivers SET is_active = false, updated_at = NOW() WHERE id = ${inst.employeeCaregiverId}`);
      const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, inst.employeeCaregiverId));
      if (cg?.userId) {
        await db.execute(sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${cg.userId}`);
      }
    } else if (inst.employeeUserId) {
      await db.execute(sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${inst.employeeUserId}`);
    }
    try {
      await storage.createAuditLog({
        action: "employee_terminated",
        entityType: inst.employeeCaregiverId ? "caregiver" : "user",
        entityId: inst.employeeCaregiverId ?? inst.employeeUserId ?? inst.id,
        newValues: { offboardingInstanceId: inst.id, status: "terminated" },
      } as any);
    } catch {}
  } catch (err) {
    console.error("[Offboarding] flipEmployeeToTerminated failed:", err);
  }
}

async function checkAndFinalize(instanceId: string) {
  const steps = await db.select().from(offboardingInstanceSteps).where(eq(offboardingInstanceSteps.instanceId, instanceId));
  const remaining = steps.filter((s) => s.isRequired !== false && s.status !== "completed" && s.status !== "skipped");
  if (remaining.length === 0) {
    const [inst] = await db.select().from(offboardingInstances).where(eq(offboardingInstances.id, instanceId));
    await db.update(offboardingInstances)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(offboardingInstances.id, instanceId));
    if (inst) await flipEmployeeToTerminated(inst);

    try {
      await storage.createAuditLog({
        action: "offboarding_completed",
        entityType: "offboarding_instance",
        entityId: instanceId,
      } as any);
    } catch {}
  }
}

export async function isUserInstanceOwner(instanceId: string, userId: string): Promise<boolean> {
  const [inst] = await db.select().from(offboardingInstances).where(eq(offboardingInstances.id, instanceId));
  if (!inst) return false;
  if (inst.employeeUserId === userId) return true;
  if (inst.employeeCaregiverId) {
    const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, inst.employeeCaregiverId));
    if (cg?.userId === userId) return true;
  }
  return false;
}

export async function getInstanceById(instanceId: string) {
  const [inst] = await db.select().from(offboardingInstances).where(eq(offboardingInstances.id, instanceId));
  return inst;
}

export async function getStepById(stepId: string) {
  const [s] = await db.select().from(offboardingInstanceSteps).where(eq(offboardingInstanceSteps.id, stepId));
  return s;
}

export async function markInstanceStepComplete(stepId: string, completedBy?: string | null, adminOverrideReason?: string | null) {
  const [step] = await db.select().from(offboardingInstanceSteps).where(eq(offboardingInstanceSteps.id, stepId));
  if (!step) return;
  if (step.status === "completed") return;
  await db.update(offboardingInstanceSteps)
    .set({ status: "completed", completedAt: new Date(), completedBy: completedBy ?? null })
    .where(eq(offboardingInstanceSteps.id, stepId));
  try {
    await storage.createAuditLog({
      userId: completedBy ?? null,
      action: adminOverrideReason ? "offboarding_step_admin_override" : "offboarding_step_completed",
      entityType: "offboarding_instance_step",
      entityId: stepId,
      newValues: {
        instanceId: step.instanceId,
        stepType: step.stepType,
        ...(adminOverrideReason ? { adminOverrideReason } : {}),
      },
    } as any);
  } catch {}
  await checkAndFinalize(step.instanceId);
}

export function assertTemplateUsable(
  tmpl: { isActive?: boolean | null; organizationId?: string | null; role?: string | null },
  user: { organizationId?: string | null } | null | undefined,
  employeeType: "caregiver" | "user",
): { code: number; message: string } | null {
  if (tmpl.isActive === false) return { code: 400, message: "Template is inactive" };
  if (tmpl.organizationId && user?.organizationId && tmpl.organizationId !== user.organizationId) {
    return { code: 403, message: "Template belongs to a different organization" };
  }
  const role = (tmpl.role || "any").toLowerCase();
  if (role !== "any") {
    if (employeeType === "caregiver" && role !== "caregiver") {
      return { code: 400, message: "This template is not allowed for caregivers" };
    }
    if (employeeType === "user" && role !== "office_staff") {
      return { code: 400, message: "This template is not allowed for office staff users" };
    }
  }
  return null;
}

export async function cancelInstance(id: string, byUser?: string | null) {
  await db.update(offboardingInstances)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(offboardingInstances.id, id));
  try {
    await storage.createAuditLog({
      userId: byUser ?? null,
      action: "offboarding_cancelled",
      entityType: "offboarding_instance",
      entityId: id,
    } as any);
  } catch {}
}

// Mark exit-interview step done when the survey response is submitted.
export async function markExitInterviewStepCompleteByResponse(responseId: string, completedBy?: string | null) {
  try {
    const steps = await db.select().from(offboardingInstanceSteps)
      .where(and(
        eq(offboardingInstanceSteps.stepType, "exit_interview"),
        eq(offboardingInstanceSteps.linkId, responseId),
      ));
    for (const s of steps) {
      if (s.status !== "completed") {
        await markInstanceStepComplete(s.id, completedBy);
      }
    }
  } catch (err) {
    console.error("[Offboarding] markExitInterviewStepCompleteByResponse failed (non-fatal):", err);
  }
}

// True if the employee already has an in-progress offboarding so we don't
// double-launch when terminationDate is re-saved.
export async function hasInProgressOffboarding(opts: { employeeUserId?: string | null; employeeCaregiverId?: string | null }) {
  const conds: any[] = [eq(offboardingInstances.status, "in_progress" as any)];
  if (opts.employeeCaregiverId) conds.push(eq(offboardingInstances.employeeCaregiverId, opts.employeeCaregiverId));
  else if (opts.employeeUserId) conds.push(eq(offboardingInstances.employeeUserId, opts.employeeUserId));
  else return false;
  const rows = await db.select().from(offboardingInstances).where(and(...conds)).limit(1);
  return rows.length > 0;
}

// Pick the best-matching template for an employee at termination time.
// Prefers role-specific + same-office + same-org templates; falls back to
// broader matches. Returns null when no usable template exists.
export async function findTemplateForEmployee(opts: {
  employeeType: "caregiver" | "user";
  organizationId?: string | null;
  officeId?: string | null;
}) {
  const rows = await db.select().from(offboardingTemplates)
    .where(eq(offboardingTemplates.isActive, true));
  const score = (t: any) => {
    let s = 0;
    if (t.role === (opts.employeeType === "caregiver" ? "caregiver" : "office_staff")) s += 4;
    else if (t.role === "any") s += 1;
    else return -1;
    if (opts.organizationId && t.organizationId === opts.organizationId) s += 2;
    else if (!t.organizationId) s += 1;
    else return -1;
    if (opts.officeId && t.officeId === opts.officeId) s += 2;
    else if (!t.officeId) s += 1;
    return s;
  };
  const scored = rows.map((t) => ({ t, s: score(t) })).filter((x) => x.s >= 0);
  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.t ?? null;
}

// Fired from caregiver/user create+update handlers when terminationDate
// transitions from null/undefined → a value. Safe to call repeatedly.
export async function maybeAutoLaunchOnTermination(opts: {
  employeeType: "caregiver" | "user";
  employeeCaregiverId?: string | null;
  employeeUserId?: string | null;
  terminationDate: Date | null | undefined;
  previousTerminationDate?: Date | null | undefined;
  organizationId?: string | null;
  officeId?: string | null;
  launchedBy?: string | null;
}) {
  if (!opts.terminationDate) return null;
  // No-op when value did not change (avoids loops on PUT re-saves).
  if (opts.previousTerminationDate && new Date(opts.previousTerminationDate).getTime() === new Date(opts.terminationDate).getTime()) {
    return null;
  }
  if (await hasInProgressOffboarding(opts)) return null;
  const tmpl = await findTemplateForEmployee({
    employeeType: opts.employeeType,
    organizationId: opts.organizationId ?? null,
    officeId: opts.officeId ?? null,
  });
  if (!tmpl) {
    console.warn("[Offboarding] No matching template for", opts.employeeType, "— skipping auto-launch");
    return null;
  }
  try {
    return await launchOffboardingInstance({
      templateId: tmpl.id,
      employeeType: opts.employeeType,
      employeeCaregiverId: opts.employeeCaregiverId ?? null,
      employeeUserId: opts.employeeUserId ?? null,
      terminationDate: opts.terminationDate,
      launchedBy: opts.launchedBy ?? null,
      organizationId: opts.organizationId ?? null,
    });
  } catch (err) {
    console.error("[Offboarding] Auto-launch failed:", err);
    return null;
  }
}

// Daily cron: for any in-progress offboarding whose terminationDate has
// arrived and has not been processed yet, auto-disable the account and
// auto-complete the `account_deactivation` step. Shift cancellation is left
// to a manager-confirmation endpoint so deletions are explicit.
export async function processDueTerminations(now: Date = new Date()) {
  const due = await db.select().from(offboardingInstances).where(and(
    eq(offboardingInstances.status, "in_progress" as any),
    isNotNull(offboardingInstances.terminationDate),
    lte(offboardingInstances.terminationDate, now),
    isNull(offboardingInstances.terminationProcessedAt),
  ));
  let processed = 0;
  for (const inst of due) {
    try {
      // Auto-disable account.
      if (inst.employeeCaregiverId) {
        await db.execute(sql`UPDATE caregivers SET is_active = false, updated_at = NOW() WHERE id = ${inst.employeeCaregiverId}`);
        const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, inst.employeeCaregiverId));
        if (cg?.userId) {
          await db.execute(sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${cg.userId}`);
        }
      } else if (inst.employeeUserId) {
        await db.execute(sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${inst.employeeUserId}`);
      }

      // Auto-complete any `account_deactivation` step on this instance so the
      // checklist reflects the fact that the system already handled it.
      const acctSteps = await db.select().from(offboardingInstanceSteps).where(and(
        eq(offboardingInstanceSteps.instanceId, inst.id),
        eq(offboardingInstanceSteps.stepType, "account_deactivation"),
      ));
      for (const s of acctSteps) {
        if (s.status !== "completed") {
          await markInstanceStepComplete(s.id, null, "Auto-completed by termination job");
        }
      }

      await db.update(offboardingInstances)
        .set({ terminationProcessedAt: new Date(), updatedAt: new Date() })
        .where(eq(offboardingInstances.id, inst.id));

      try {
        await storage.createAuditLog({
          action: "offboarding_termination_date_reached",
          entityType: "offboarding_instance",
          entityId: inst.id,
          newValues: { terminationDate: inst.terminationDate },
        } as any);
      } catch {}
      processed++;
    } catch (err) {
      console.error("[Offboarding] processDueTerminations failed for instance", inst.id, err);
    }
  }
  return { processed, total: due.length };
}

// Manager-confirmation flow: list a caregiver's future shifts so a manager
// can review before deletion.
export async function listFutureShiftsForInstance(instanceId: string, from: Date = new Date()) {
  const [inst] = await db.select().from(offboardingInstances).where(eq(offboardingInstances.id, instanceId));
  if (!inst || !inst.employeeCaregiverId) return [];
  return await db.select().from(caregiverSchedules).where(and(
    eq(caregiverSchedules.caregiverId, inst.employeeCaregiverId),
    gte(caregiverSchedules.scheduledDate, from),
  )).orderBy(asc(caregiverSchedules.scheduledDate));
}

export async function cancelFutureShiftsForInstance(instanceId: string, byUser?: string | null, from: Date = new Date()) {
  const [inst] = await db.select().from(offboardingInstances).where(eq(offboardingInstances.id, instanceId));
  if (!inst || !inst.employeeCaregiverId) return { cancelled: 0 };
  const shifts = await listFutureShiftsForInstance(instanceId, from);
  for (const s of shifts) {
    await db.delete(caregiverSchedules).where(eq(caregiverSchedules.id, s.id));
  }
  try {
    await storage.createAuditLog({
      userId: byUser ?? null,
      action: "offboarding_future_shifts_cancelled",
      entityType: "offboarding_instance",
      entityId: instanceId,
      newValues: { cancelledCount: shifts.length, fromDate: from.toISOString() },
    } as any);
  } catch {}
  return { cancelled: shifts.length };
}

export async function getMyOffboarding(userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const caregiverRow = u ? (await db.select().from(caregivers).where(eq(caregivers.userId, userId)))[0] : undefined;
  const conds: any[] = [eq(offboardingInstances.employeeUserId, userId)];
  if (caregiverRow) conds.push(eq(offboardingInstances.employeeCaregiverId, caregiverRow.id));
  const rows = await db.select().from(offboardingInstances)
    .where(conds.length === 1 ? conds[0] : or(...conds))
    .orderBy(desc(offboardingInstances.launchedAt));
  const enriched = [] as any[];
  for (const inst of rows) {
    const full = await getInstanceWithSteps(inst.id);
    if (!full) continue;
    const steps = await Promise.all(full.steps.map(async (s: any) => {
      try {
        if (s.stepType === "exit_interview" && s.linkId) {
          const [resp] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, s.linkId));
          if (resp?.accessToken) {
            return { ...s, action: { kind: "exit_interview", href: `/survey/${resp.accessToken}`, label: "Open exit interview" } };
          }
        } else if (s.stepType === "checklist") {
          return { ...s, action: { kind: "checklist", label: "Mark done" } };
        }
      } catch {}
      return s;
    }));
    enriched.push({ ...full, steps });
  }
  return enriched;
}
