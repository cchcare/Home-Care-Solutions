import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { organizations, planFeatures, subscriptionFeatures, users } from "@shared/schema";
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
    // Resolve the authenticated user from either auth flow:
    //   - local auth stores it on req.session.user
    //   - passport (OIDC) stores it on req.user
    const sessionUser = (req as any).session?.user;
    const passportUser = (req as any).user;
    const user = sessionUser || passportUser;

    if (!user || !user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super admins bypass all feature gates (platform-level access)
    if (user.role === "super_admin") {
      return next();
    }

    // Defensive fallback: if the session payload is missing role/organizationId
    // (e.g., a partial session created by an older code path), look up the
    // canonical user record from the DB before denying access.
    let role = user.role;
    let organizationId = user.organizationId;
    if (!role || !organizationId) {
      try {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
        if (dbUser) {
          role = role || dbUser.role;
          organizationId = organizationId || dbUser.organizationId || undefined;
          if (role === "super_admin") {
            return next();
          }
        }
      } catch (lookupError) {
        console.error(`Error looking up user ${user.id} during feature gate:`, lookupError);
      }
    }

    if (!organizationId) {
      return res.status(403).json({
        message: "Your account is not associated with an organization. Contact your administrator.",
        feature: featureKey,
      });
    }

    try {
      const hasAccess = await hasFeature(organizationId, featureKey);

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
