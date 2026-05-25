/**
 * Routes for DOH audit "saved comparisons" (the saved before/after audit pairs
 * shown on the Audit Assessment page).
 *
 * Extracted from `server/routes.ts` so the routes can be mounted onto a fresh
 * Express app in tests without pulling in the rest of the route registry. The
 * production route registration calls `registerDohSavedComparisonRoutes` from
 * inside `registerRoutes` exactly once.
 */

import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

/**
 * Authorize that a user may access a given office.
 *   - super_admin: any office in the system
 *   - admin: only offices in their own organization
 *   - everyone else: only their primary/own office
 *
 * Returns `true` on success or `{ status, message }` on failure so the caller
 * can forward the appropriate HTTP error to the client.
 */
export async function authorizeOfficeAccess(
  user: any,
  officeId: string,
): Promise<true | { status: number; message: string }> {
  if (!user) return { status: 401, message: "Not authenticated" };
  if (user.role === "super_admin") return true;
  const office = await storage.getOffice(officeId);
  if (!office) return { status: 404, message: "Office not found" };
  if (user.role === "admin") {
    if (!user.organizationId || office.organizationId !== user.organizationId) {
      return { status: 403, message: "Access denied" };
    }
    return true;
  }
  const userOfficeId = user.primaryOfficeId || user.officeId;
  if (userOfficeId && officeId === userOfficeId) return true;
  return { status: 403, message: "Access denied" };
}

export function registerDohSavedComparisonRoutes(
  app: Express,
  isAuthenticated: RequestHandler,
): void {
  // GET /api/doh-saved-comparisons?officeId=xxx
  app.get("/api/doh-saved-comparisons", isAuthenticated, async (req: any, res) => {
    try {
      const { officeId } = req.query;
      if (!officeId) return res.status(400).json({ message: "officeId is required" });
      const user = req.session?.user;
      const auth = await authorizeOfficeAccess(user, String(officeId));
      if (auth !== true) return res.status(auth.status).json({ message: auth.message });
      const comparisons = await storage.getDohSavedComparisons(String(officeId));
      res.json(comparisons);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch saved comparisons" });
    }
  });

  // POST /api/doh-saved-comparisons
  app.post("/api/doh-saved-comparisons", isAuthenticated, async (req: any, res) => {
    try {
      const { name, auditId1, auditId2 } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name is required" });
      }
      if (!auditId1 || !auditId2) {
        return res.status(400).json({ message: "auditId1 and auditId2 are required" });
      }
      if (auditId1 === auditId2) {
        return res.status(400).json({ message: "auditId1 and auditId2 must differ" });
      }
      const [a1, a2] = await Promise.all([
        storage.getDohAuditAssessment(auditId1),
        storage.getDohAuditAssessment(auditId2),
      ]);
      if (!a1 || !a2) return res.status(404).json({ message: "One or both audits not found" });
      if (a1.officeId !== a2.officeId) {
        return res.status(400).json({ message: "Audits must belong to the same office" });
      }
      const user = req.session?.user;
      const auth = await authorizeOfficeAccess(user, a1.officeId);
      if (auth !== true) return res.status(auth.status).json({ message: auth.message });
      const trimmed = name.trim().slice(0, 200);
      const comparison = await storage.createDohSavedComparison({
        name: trimmed,
        officeId: a1.officeId,
        auditId1,
        auditId2,
        createdBy: user?.id,
      });
      res.status(201).json(comparison);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to save comparison" });
    }
  });

  // PATCH /api/doh-saved-comparisons/:id  (rename)
  app.patch("/api/doh-saved-comparisons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name is required" });
      }
      const trimmedName = name.trim().slice(0, 200);
      if (!trimmedName) {
        return res.status(400).json({ message: "name is required" });
      }
      const comparison = await storage.getDohSavedComparison(req.params.id);
      if (!comparison) return res.status(404).json({ message: "Saved comparison not found" });
      const user = req.session?.user;
      const auth = await authorizeOfficeAccess(user, comparison.officeId);
      if (auth !== true) return res.status(auth.status).json({ message: auth.message });
      const updated = await storage.updateDohSavedComparison(req.params.id, { name: trimmedName });
      if (!updated) return res.status(404).json({ message: "Saved comparison not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to rename saved comparison" });
    }
  });

  // DELETE /api/doh-saved-comparisons/:id
  app.delete("/api/doh-saved-comparisons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const comparison = await storage.getDohSavedComparison(req.params.id);
      if (!comparison) return res.status(404).json({ message: "Saved comparison not found" });
      const user = req.session?.user;
      const auth = await authorizeOfficeAccess(user, comparison.officeId);
      if (auth !== true) return res.status(auth.status).json({ message: auth.message });
      await storage.deleteDohSavedComparison(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete saved comparison" });
    }
  });
}
