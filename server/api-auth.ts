import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { ApiKey, Organization } from "@shared/schema";

export interface ApiAuthRequest extends Request {
  apiKey?: ApiKey;
  organization?: Organization;
  apiScopes?: string[];
}

interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
}

function sendApiError(res: Response, statusCode: number, error: string): void {
  res.status(statusCode).json({
    success: false,
    error,
  } as ApiResponse);
}

export async function apiKeyAuth(
  req: ApiAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendApiError(res, 401, "Missing or invalid Authorization header. Use: Bearer <api_key>");
    return;
  }

  const apiKeyFull = authHeader.substring(7);

  if (apiKeyFull.length < 8) {
    sendApiError(res, 401, "Invalid API key format");
    return;
  }

  const keyPrefix = apiKeyFull.substring(0, 8);

  try {
    const apiKey = await storage.getApiKeyByPrefix(keyPrefix);

    if (!apiKey) {
      sendApiError(res, 401, "Invalid API key");
      return;
    }

    if (!apiKey.isActive) {
      sendApiError(res, 401, "API key is inactive");
      return;
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      sendApiError(res, 401, "API key has expired");
      return;
    }

    const isValidHash = await bcrypt.compare(apiKeyFull, apiKey.keyHash);
    if (!isValidHash) {
      sendApiError(res, 401, "Invalid API key");
      return;
    }

    const organization = await storage.getOrganization(apiKey.organizationId);
    if (!organization) {
      sendApiError(res, 401, "Organization not found");
      return;
    }

    if (organization.status !== "active") {
      sendApiError(res, 403, "Organization is not active");
      return;
    }

    const rateLimit = apiKey.rateLimit ?? 1000;
    const usageToday = await storage.getApiUsageCountToday(apiKey.organizationId);
    
    if (usageToday >= rateLimit) {
      sendApiError(res, 429, `Daily rate limit exceeded (${rateLimit} requests/day)`);
      await logApiUsage(req, apiKey, 429, startTime);
      return;
    }

    await storage.incrementApiKeyRequestCount(apiKey.id);

    req.apiKey = apiKey;
    req.organization = organization;
    req.apiScopes = apiKey.scopes ?? [];

    res.on("finish", async () => {
      await logApiUsage(req, apiKey, res.statusCode, startTime);
    });

    next();
  } catch (error) {
    console.error("API auth error:", error);
    sendApiError(res, 500, "Internal authentication error");
  }
}

async function logApiUsage(
  req: ApiAuthRequest,
  apiKey: ApiKey,
  statusCode: number,
  startTime: number
): Promise<void> {
  try {
    await storage.createApiUsageLog({
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
      endpoint: req.originalUrl || req.url,
      method: req.method,
      statusCode,
      responseTime: Date.now() - startTime,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.get("User-Agent") || null,
      requestBody: req.method !== "GET" ? sanitizeRequestBody(req.body) : null,
    });
  } catch (error) {
    console.error("Failed to log API usage:", error);
  }
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") return null;
  
  const sanitized = { ...body };
  const sensitiveFields = ["password", "passwordHash", "ssn", "socialSecurityNumber", "apiKey", "secret"];
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  
  return sanitized;
}

export function requireScope(scope: string) {
  return (req: ApiAuthRequest, res: Response, next: NextFunction): void => {
    if (!req.apiScopes?.includes(scope) && !req.apiScopes?.includes("*")) {
      sendApiError(res, 403, `Missing required scope: ${scope}`);
      return;
    }
    next();
  };
}

export function formatApiResponse<T>(
  data: T,
  meta?: { total?: number; page?: number; limit?: number }
): { success: true; data: T; meta?: typeof meta } {
  const response: { success: true; data: T; meta?: typeof meta } = {
    success: true,
    data,
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
}
