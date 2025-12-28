import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { organizations, planFeatures, subscriptionFeatures } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Helper to get all feature keys an organization has access to
 */
export async function getOrganizationFeatures(organizationId: string): Promise<string[]> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org || !org.subscriptionPlanId) {
    return [];
  }

  const features = await db
    .select({
      key: subscriptionFeatures.key,
    })
    .from(planFeatures)
    .innerJoin(subscriptionFeatures, eq(planFeatures.featureId, subscriptionFeatures.id))
    .where(eq(planFeatures.planId, org.subscriptionPlanId));

  return features.map((f) => f.key);
}

/**
 * Helper to check if an organization has access to a specific feature
 */
export async function hasFeature(organizationId: string, featureKey: string): Promise<boolean> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org || !org.subscriptionPlanId) {
    return false;
  }

  const feature = await db
    .select({
      id: subscriptionFeatures.id,
    })
    .from(planFeatures)
    .innerJoin(subscriptionFeatures, eq(planFeatures.featureId, subscriptionFeatures.id))
    .where(and(
      eq(planFeatures.planId, org.subscriptionPlanId),
      eq(subscriptionFeatures.key, featureKey)
    ))
    .limit(1);

  return feature.length > 0;
}

/**
 * Express middleware to require a specific feature for the organization
 */
export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated and has an organization
    const user = (req as any).user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const hasAccess = await hasFeature(user.organizationId, featureKey);

      if (!hasAccess) {
        return res.status(403).json({
          message: `This feature (${featureKey}) is not available on your current plan. Please upgrade to access this functionality.`,
          feature: featureKey,
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error(`Error checking feature gate for ${featureKey}:`, error);
      res.status(500).json({ message: "Internal server error during feature check" });
    }
  };
}
