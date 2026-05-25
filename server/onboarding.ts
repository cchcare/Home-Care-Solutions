import crypto from "crypto";
import { and, eq, desc, asc, inArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import {
  onboardingTemplates,
  onboardingTemplateSteps,
  onboardingInstances,
  onboardingInstanceSteps,
  eSignatureTemplates,
  eSignatureRequests,
  trainings,
  policyDocuments,
  caregivers,
  users,
  type OnboardingTemplate,
  type OnboardingTemplateStep,
  type OnboardingInstance,
  type OnboardingInstanceStep,
  type InsertOnboardingTemplate,
  type InsertOnboardingTemplateStep,
} from "@shared/schema";

export type OnboardingStepLinkType = "signature" | "training" | "policy";

export async function listTemplates(filters?: { officeId?: string; role?: string; isActive?: boolean; organizationId?: string | null }) {
  const conds: any[] = [];
  if (filters?.officeId) conds.push(eq(onboardingTemplates.officeId, filters.officeId));
  if (filters?.role) conds.push(eq(onboardingTemplates.role, filters.role));
  if (filters?.isActive !== undefined) conds.push(eq(onboardingTemplates.isActive, filters.isActive));
  if (filters?.organizationId !== undefined && filters?.organizationId !== null) {
    // Scope to caller's org OR global (organization_id IS NULL)
    conds.push(or(eq(onboardingTemplates.organizationId, filters.organizationId), sql`${onboardingTemplates.organizationId} IS NULL`));
  }
  const q = db.select().from(onboardingTemplates);
  const rows = conds.length ? await q.where(and(...conds)).orderBy(desc(onboardingTemplates.createdAt)) : await q.orderBy(desc(onboardingTemplates.createdAt));
  return rows;
}

export async function getTemplateWithSteps(id: string) {
  const [tmpl] = await db.select().from(onboardingTemplates).where(eq(onboardingTemplates.id, id));
  if (!tmpl) return null;
  const steps = await db.select().from(onboardingTemplateSteps).where(eq(onboardingTemplateSteps.templateId, id)).orderBy(asc(onboardingTemplateSteps.stepOrder));
  return { ...tmpl, steps };
}

export async function createTemplate(data: InsertOnboardingTemplate & { steps?: Array<Omit<InsertOnboardingTemplateStep, "templateId">> }) {
  const { steps = [], ...tplData } = data as any;
  const [tmpl] = await db.insert(onboardingTemplates).values(tplData).returning();
  if (steps.length) {
    await db.insert(onboardingTemplateSteps).values(
      steps.map((s: any, i: number) => ({ ...s, templateId: tmpl.id, stepOrder: s.stepOrder ?? i }))
    );
  }
  return getTemplateWithSteps(tmpl.id);
}

export async function updateTemplate(id: string, data: Partial<InsertOnboardingTemplate> & { steps?: Array<Omit<InsertOnboardingTemplateStep, "templateId">> }) {
  const { steps, ...tplData } = data as any;
  if (Object.keys(tplData).length) {
    await db.update(onboardingTemplates)
      .set({ ...tplData, updatedAt: new Date() })
      .where(eq(onboardingTemplates.id, id));
  }
  if (Array.isArray(steps)) {
    await db.delete(onboardingTemplateSteps).where(eq(onboardingTemplateSteps.templateId, id));
    if (steps.length) {
      await db.insert(onboardingTemplateSteps).values(
        steps.map((s: any, i: number) => ({ ...s, templateId: id, stepOrder: s.stepOrder ?? i }))
      );
    }
  }
  return getTemplateWithSteps(id);
}

export async function deleteTemplate(id: string) {
  await db.delete(onboardingTemplates).where(eq(onboardingTemplates.id, id));
}

export async function listInstances(filters?: { status?: string; employeeUserId?: string; employeeCaregiverId?: string; organizationId?: string | null }) {
  const conds: any[] = [];
  if (filters?.status) conds.push(eq(onboardingInstances.status, filters.status as any));
  if (filters?.employeeUserId) conds.push(eq(onboardingInstances.employeeUserId, filters.employeeUserId));
  if (filters?.employeeCaregiverId) conds.push(eq(onboardingInstances.employeeCaregiverId, filters.employeeCaregiverId));
  if (filters?.organizationId !== undefined && filters?.organizationId !== null) {
    conds.push(or(eq(onboardingInstances.organizationId, filters.organizationId), sql`${onboardingInstances.organizationId} IS NULL`));
  }
  const q = db.select().from(onboardingInstances);
  return conds.length ? await q.where(and(...conds)).orderBy(desc(onboardingInstances.launchedAt)) : await q.orderBy(desc(onboardingInstances.launchedAt));
}

export async function getInstanceWithSteps(id: string) {
  const [inst] = await db.select().from(onboardingInstances).where(eq(onboardingInstances.id, id));
  if (!inst) return null;
  const steps = await db.select().from(onboardingInstanceSteps).where(eq(onboardingInstanceSteps.instanceId, id)).orderBy(asc(onboardingInstanceSteps.stepOrder));
  const [tmpl] = inst.templateId
    ? await db.select().from(onboardingTemplates).where(eq(onboardingTemplates.id, inst.templateId))
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
  launchedBy?: string | null;
  organizationId?: string | null;
}

export async function launchOnboardingInstance(opts: LaunchOpts): Promise<OnboardingInstance> {
  const tmpl = await getTemplateWithSteps(opts.templateId);
  if (!tmpl) throw new Error("Onboarding template not found");

  // Resolve recipient user (for sending emails / linking acks)
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

  const [inst] = await db.insert(onboardingInstances).values({
    organizationId: opts.organizationId ?? recipientUser?.organizationId ?? null,
    templateId: opts.templateId,
    employeeType: opts.employeeType,
    employeeUserId: opts.employeeUserId ?? null,
    employeeCaregiverId: opts.employeeCaregiverId ?? null,
    launchedBy: opts.launchedBy ?? null,
    status: "in_progress",
  }).returning();

  // Create instance steps + auto-fire signature/training/policy assignments.
  for (const s of tmpl.steps) {
    let linkId: string | null = null;
    try {
      if (s.stepType === "signature" && s.refId && recipientUser?.email) {
        const [esigTpl] = await db.select().from(eSignatureTemplates).where(eq(eSignatureTemplates.id, s.refId));
        if (esigTpl) {
          const accessToken = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          const recipientName = [recipientUser.firstName, recipientUser.lastName].filter(Boolean).join(" ") || recipientUser.email;
          const req = await storage.createESignatureRequest({
            templateId: esigTpl.id,
            recipientName,
            recipientEmail: recipientUser.email,
            documentContent: (esigTpl as any).content ?? "",
            accessToken,
            expiresAt,
            sentBy: opts.launchedBy ?? null,
            status: "pending",
          } as any);
          linkId = req.id;

          try {
            const { sendTemplatedEmail } = await import("./agentmail");
            const baseUrl = process.env.BASE_URL || "http://localhost:5000";
            const signingLink = `${baseUrl}/esign/${accessToken}`;
            await sendTemplatedEmail(
              recipientUser.email,
              "esignature_request",
              {
                firstName: recipientUser.firstName || recipientName,
                documentName: esigTpl.name || "Onboarding document",
                senderName: "Onboarding",
                deadline: expiresAt.toLocaleDateString("en-US"),
                signUrl: signingLink,
              },
              `Onboarding: please sign "${esigTpl.name}"`,
              `<p>Hello ${recipientName},</p><p>You have an onboarding document to sign: <strong>${esigTpl.name}</strong>.</p><p><a href="${signingLink}">Click here to review and sign</a> (expires ${expiresAt.toLocaleDateString("en-US")}).</p>`,
              `Hello ${recipientName}, please sign "${esigTpl.name}": ${signingLink}`,
            );
          } catch (mailErr) {
            console.error("[Onboarding] eSign email failed (non-fatal):", mailErr);
          }
        }
      } else if (s.stepType === "training" && s.refId && opts.employeeCaregiverId) {
        const rec = await storage.createTrainingRecord({
          caregiverId: opts.employeeCaregiverId,
          trainingId: s.refId,
          status: "not_started",
          startDate: new Date(),
        } as any);
        linkId = rec.id;
      } else if (s.stepType === "policy" && s.refId) {
        // Policy ack is created lazily when user acknowledges in the UI; link
        // by ref_id so completion hook can find this step.
        linkId = null;
      }
    } catch (err) {
      console.error("[Onboarding] Failed to auto-fire step", s.stepType, err);
    }

    await db.insert(onboardingInstanceSteps).values({
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
      action: "onboarding_launched",
      entityType: "onboarding_instance",
      entityId: inst.id,
      newValues: { templateId: opts.templateId, employeeType: opts.employeeType },
    } as any);
  } catch {}

  return inst;
}

async function checkAndFinalize(instanceId: string) {
  const steps = await db.select().from(onboardingInstanceSteps).where(eq(onboardingInstanceSteps.instanceId, instanceId));
  const remaining = steps.filter((s) => s.isRequired !== false && s.status !== "completed" && s.status !== "skipped");
  if (remaining.length === 0) {
    await db.update(onboardingInstances)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(onboardingInstances.id, instanceId));

    // Mark the employee as onboarded (sets onboarded_at on caregivers/users).
    try {
      const [inst] = await db.select().from(onboardingInstances).where(eq(onboardingInstances.id, instanceId));
      if (inst?.employeeCaregiverId) {
        await db.execute(sql`UPDATE caregivers SET onboarded_at = NOW() WHERE id = ${inst.employeeCaregiverId} AND onboarded_at IS NULL`);
      }
      if (inst?.employeeUserId) {
        await db.execute(sql`UPDATE users SET onboarded_at = NOW() WHERE id = ${inst.employeeUserId} AND onboarded_at IS NULL`);
      } else if (inst?.employeeCaregiverId) {
        const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, inst.employeeCaregiverId));
        if (cg?.userId) {
          await db.execute(sql`UPDATE users SET onboarded_at = NOW() WHERE id = ${cg.userId} AND onboarded_at IS NULL`);
        }
      }
    } catch (err) {
      console.error("[Onboarding] Failed to set onboarded_at:", err);
    }

    try {
      await storage.createAuditLog({
        action: "onboarding_completed",
        entityType: "onboarding_instance",
        entityId: instanceId,
      } as any);
    } catch {}
  }
}

export async function isUserInstanceOwner(instanceId: string, userId: string): Promise<boolean> {
  const [inst] = await db.select().from(onboardingInstances).where(eq(onboardingInstances.id, instanceId));
  if (!inst) return false;
  if (inst.employeeUserId === userId) return true;
  if (inst.employeeCaregiverId) {
    const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, inst.employeeCaregiverId));
    if (cg?.userId === userId) return true;
  }
  return false;
}

export async function getInstanceById(instanceId: string) {
  const [inst] = await db.select().from(onboardingInstances).where(eq(onboardingInstances.id, instanceId));
  return inst;
}

export async function getStepById(stepId: string) {
  const [s] = await db.select().from(onboardingInstanceSteps).where(eq(onboardingInstanceSteps.id, stepId));
  return s;
}

export async function markInstanceStepComplete(stepId: string, completedBy?: string | null, adminOverrideReason?: string | null) {
  const [step] = await db.select().from(onboardingInstanceSteps).where(eq(onboardingInstanceSteps.id, stepId));
  if (!step) return;
  if (step.status === "completed") return;
  await db.update(onboardingInstanceSteps)
    .set({ status: "completed", completedAt: new Date(), completedBy: completedBy ?? null })
    .where(eq(onboardingInstanceSteps.id, stepId));
  try {
    await storage.createAuditLog({
      userId: completedBy ?? null,
      action: adminOverrideReason ? "onboarding_step_admin_override" : "onboarding_step_completed",
      entityType: "onboarding_instance_step",
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

// Validate that a template is appropriate for the launch context. Returns
// null when allowed, otherwise an HTTP-style { code, message } object so the
// caller can short-circuit.
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

// Called from existing handlers (esign/sign, policy acknowledge, training record update).
export async function markStepCompleteByLink(stepType: OnboardingStepLinkType, linkId: string, completedBy?: string | null) {
  try {
    const steps = await db.select().from(onboardingInstanceSteps)
      .where(and(
        eq(onboardingInstanceSteps.stepType, stepType as any),
        eq(onboardingInstanceSteps.linkId, linkId),
      ));
    for (const s of steps) {
      if (s.status !== "completed") {
        await markInstanceStepComplete(s.id, completedBy);
      }
    }
  } catch (err) {
    console.error("[Onboarding] markStepCompleteByLink failed (non-fatal):", err);
  }
}

// Called when a user acknowledges a policy — match by ref_id (policy id) +
// instance's employee_user_id, since acks aren't pre-created.
export async function markPolicyStepCompleteForUser(policyId: string, userId: string, ackId: string) {
  try {
    const candidates = await db.select({
      step: onboardingInstanceSteps,
      instance: onboardingInstances,
    })
      .from(onboardingInstanceSteps)
      .innerJoin(onboardingInstances, eq(onboardingInstanceSteps.instanceId, onboardingInstances.id))
      .where(and(
        eq(onboardingInstanceSteps.stepType, "policy"),
        eq(onboardingInstanceSteps.refId, policyId),
      ));
    for (const c of candidates) {
      if (c.step.status === "completed") continue;
      const instanceUserId = c.instance.employeeUserId;
      let match = instanceUserId === userId;
      if (!match && c.instance.employeeCaregiverId) {
        const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, c.instance.employeeCaregiverId));
        if (cg?.userId === userId) match = true;
      }
      if (match) {
        await db.update(onboardingInstanceSteps)
          .set({ linkId: ackId })
          .where(eq(onboardingInstanceSteps.id, c.step.id));
        await markInstanceStepComplete(c.step.id, userId);
      }
    }
  } catch (err) {
    console.error("[Onboarding] markPolicyStepCompleteForUser failed (non-fatal):", err);
  }
}

export async function cancelInstance(id: string, byUser?: string | null) {
  await db.update(onboardingInstances)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(onboardingInstances.id, id));
  try {
    await storage.createAuditLog({
      userId: byUser ?? null,
      action: "onboarding_cancelled",
      entityType: "onboarding_instance",
      entityId: id,
    } as any);
  } catch {}
}

export async function getMyOnboarding(userId: string) {
  // Resolve as user instance and (if caregiver) caregiver instance
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const caregiverRow = u ? (await db.select().from(caregivers).where(eq(caregivers.userId, userId)))[0] : undefined;
  const conds: any[] = [eq(onboardingInstances.employeeUserId, userId)];
  if (caregiverRow) conds.push(eq(onboardingInstances.employeeCaregiverId, caregiverRow.id));
  const rows = await db.select().from(onboardingInstances)
    .where(conds.length === 1 ? conds[0] : or(...conds))
    .orderBy(desc(onboardingInstances.launchedAt));
  const enriched = [] as any[];
  for (const inst of rows) {
    const full = await getInstanceWithSteps(inst.id);
    if (!full) continue;
    // Enrich each step with an actionable deep-link target so the new hire
    // can click directly into the underlying form/document.
    const steps = await Promise.all(full.steps.map(async (s: any) => {
      try {
        if (s.stepType === "signature" && s.linkId) {
          const [req] = await db.select().from(eSignatureRequests).where(eq(eSignatureRequests.id, s.linkId));
          if (req) {
            return { ...s, action: { kind: "signature", href: `/esign/${req.accessToken}`, label: "Open & sign" } };
          }
        } else if (s.stepType === "policy" && s.refId) {
          const [p] = await db.select().from(policyDocuments).where(eq(policyDocuments.id, s.refId));
          return { ...s, action: { kind: "policy", policyId: s.refId, label: "Acknowledge", policyTitle: p?.title } };
        } else if (s.stepType === "training") {
          return { ...s, action: { kind: "training", href: "/training", label: "Open training" } };
        } else if (s.stepType === "document") {
          return { ...s, action: { kind: "document", href: "/my-documents", label: "Upload document" } };
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
