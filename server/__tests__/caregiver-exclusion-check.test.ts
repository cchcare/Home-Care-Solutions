/**
 * Vitest suite for the per-caregiver exclusion check (Task #82).
 *
 * Covers:
 *   (a) Role gate — admin/supervisor/super_admin pass; every other role
 *       (including null/undefined/empty) is denied. The same helper is wired
 *       into the POST /api/caregivers/:id/exclusion-check route handler in
 *       server/routes.ts, so this is the single source of truth.
 *   (b) Clear path — `runCaregiverExclusionCheck` writes exactly one
 *       `clear` row per known exclusion source when no matches are found.
 *   (c) Possible-match paths — for an NPI hit, a license-number hit, and a
 *       name-exact hit, only the matching `possible_match` rows are written
 *       (no extra "clear" rows for unrelated sources are produced), and the
 *       persisted rows carry the correct matchReason and matchedIdentifier.
 *
 * The storage layer is fully mocked via `vi.mock`, so the suite has no DB
 * dependency and runs anywhere `vitest` is installed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CaregiverExclusionCheck,
  InsertCaregiverExclusionCheck,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// In-memory store of inserted exclusion-check rows. The mock for
// `getRecentCaregiverExclusionCheck` filters this exactly the way the real
// SQL query would, so the dedup logic in the service is exercised end-to-end.
// ---------------------------------------------------------------------------
type StoredCheck = InsertCaregiverExclusionCheck & { id: string };

const insertedChecks: StoredCheck[] = [];

function createCheckImpl(check: InsertCaregiverExclusionCheck): CaregiverExclusionCheck {
  const stored: StoredCheck = {
    ...check,
    id: `chk-${insertedChecks.length + 1}`,
  };
  insertedChecks.push(stored);
  return stored as unknown as CaregiverExclusionCheck;
}

function getRecentImpl(
  caregiverId: string,
  sourceId: string,
  exclusionRecordId: string | null,
  sinceMs: number,
): CaregiverExclusionCheck | undefined {
  const cutoff = Date.now() - sinceMs;
  const candidates = insertedChecks.filter((c) => {
    if (c.caregiverId !== caregiverId) return false;
    if (c.sourceId !== sourceId) return false;
    const recId = c.exclusionRecordId ?? null;
    if (recId !== exclusionRecordId) return false;
    const at = c.checkedAt ? new Date(c.checkedAt).getTime() : 0;
    return at >= cutoff;
  });
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const aAt = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
    const bAt = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
    return bAt - aAt;
  });
  return candidates[0] as unknown as CaregiverExclusionCheck;
}

// ---------------------------------------------------------------------------
// vi.mock is hoisted; the service module sees the mocked storage.
// ---------------------------------------------------------------------------
vi.mock("../storage", () => {
  return {
    storage: {
      getCaregiver: vi.fn(async () => ({
        id: "cg-1",
        firstName: "Maria",
        lastName: "Smith",
        dateOfBirth: null,
        npi: null,
      })),
      getExclusionSources: vi.fn(async () => [
        { id: "src-oig", name: "OIG", type: "oig" },
        { id: "src-sam", name: "SAM", type: "sam" },
        { id: "src-medicheck", name: "Medicheck", type: "medicheck" },
      ]),
      getCertificateNumbersByCaregiver: vi.fn(async () => []),
      getCaregiverFalsePositives: vi.fn(async () => []),
      getExclusionRecordsByNpi: vi.fn(async () => []),
      getExclusionRecordsByLicenseNumbers: vi.fn(async () => []),
      getExclusionRecordsByName: vi.fn(async () => []),
      searchExclusionRecords: vi.fn(async () => []),
      getLatestCaregiverExclusionCheck: vi.fn(async () => undefined),
      getRecentCaregiverExclusionCheck: vi.fn(
        async (
          caregiverId: string,
          sourceId: string,
          exclusionRecordId: string | null,
          sinceMs: number,
        ) => getRecentImpl(caregiverId, sourceId, exclusionRecordId, sinceMs),
      ),
      createCaregiverExclusionCheck: vi.fn(async (check: InsertCaregiverExclusionCheck) =>
        createCheckImpl(check),
      ),
    },
  };
});

import {
  EXCLUSION_ADMIN_ROLES,
  ExclusionService,
  hasExclusionAdminRole,
} from "../exclusion-service";
import { storage } from "../storage";

interface MockedStorage {
  getCaregiver: ReturnType<typeof vi.fn>;
  getExclusionSources: ReturnType<typeof vi.fn>;
  getCertificateNumbersByCaregiver: ReturnType<typeof vi.fn>;
  getCaregiverFalsePositives: ReturnType<typeof vi.fn>;
  getExclusionRecordsByNpi: ReturnType<typeof vi.fn>;
  getExclusionRecordsByLicenseNumbers: ReturnType<typeof vi.fn>;
  getExclusionRecordsByName: ReturnType<typeof vi.fn>;
  searchExclusionRecords: ReturnType<typeof vi.fn>;
  getLatestCaregiverExclusionCheck: ReturnType<typeof vi.fn>;
  getRecentCaregiverExclusionCheck: ReturnType<typeof vi.fn>;
  createCaregiverExclusionCheck: ReturnType<typeof vi.fn>;
}

const mockedStorage = storage as unknown as MockedStorage;
const svc = ExclusionService.getInstance();

beforeEach(() => {
  insertedChecks.length = 0;
  mockedStorage.getCaregiver.mockClear();
  mockedStorage.getExclusionSources.mockClear();
  mockedStorage.getCertificateNumbersByCaregiver.mockClear();
  mockedStorage.getCaregiverFalsePositives.mockClear();
  mockedStorage.getExclusionRecordsByNpi.mockClear();
  mockedStorage.getExclusionRecordsByLicenseNumbers.mockClear();
  mockedStorage.getExclusionRecordsByName.mockClear();
  mockedStorage.searchExclusionRecords.mockClear();
  mockedStorage.getLatestCaregiverExclusionCheck.mockClear();
  mockedStorage.getRecentCaregiverExclusionCheck.mockClear();
  mockedStorage.createCaregiverExclusionCheck.mockClear();
  // Reset every search/list mock to the empty-result default so prior
  // describe blocks don't leak state into this one.
  mockedStorage.getCaregiver.mockResolvedValue({
    id: "cg-1",
    firstName: "Maria",
    lastName: "Smith",
    dateOfBirth: null,
    npi: null,
  });
  mockedStorage.getCertificateNumbersByCaregiver.mockResolvedValue([]);
  mockedStorage.getExclusionRecordsByNpi.mockResolvedValue([]);
  mockedStorage.getExclusionRecordsByLicenseNumbers.mockResolvedValue([]);
  mockedStorage.getExclusionRecordsByName.mockResolvedValue([]);
  mockedStorage.searchExclusionRecords.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// (a) Role gate — admin/supervisor/super_admin pass; every other role denied.
// ---------------------------------------------------------------------------
describe("hasExclusionAdminRole - role gate for /api/caregivers/:id/exclusion-check", () => {
  it("permits the three admin roles", () => {
    expect(hasExclusionAdminRole("admin")).toBe(true);
    expect(hasExclusionAdminRole("supervisor")).toBe(true);
    expect(hasExclusionAdminRole("super_admin")).toBe(true);
  });

  it("rejects every other caregiver-app role", () => {
    expect(hasExclusionAdminRole("caregiver")).toBe(false);
    expect(hasExclusionAdminRole("client")).toBe(false);
    expect(hasExclusionAdminRole("family_member")).toBe(false);
    expect(hasExclusionAdminRole("coordinator")).toBe(false);
    expect(hasExclusionAdminRole("viewer")).toBe(false);
    expect(hasExclusionAdminRole("user")).toBe(false);
  });

  it("rejects missing / null / non-string / empty role values", () => {
    expect(hasExclusionAdminRole(undefined)).toBe(false);
    expect(hasExclusionAdminRole(null)).toBe(false);
    expect(hasExclusionAdminRole("")).toBe(false);
    expect(hasExclusionAdminRole(0)).toBe(false);
    expect(hasExclusionAdminRole(false)).toBe(false);
    expect(hasExclusionAdminRole({})).toBe(false);
  });

  it("exposes the canonical role list so the route layer cannot drift", () => {
    expect([...EXCLUSION_ADMIN_ROLES].sort()).toEqual([
      "admin",
      "super_admin",
      "supervisor",
    ]);
  });
});

// ---------------------------------------------------------------------------
// (b) Clear path — one `clear` row per source when no matches are found.
// ---------------------------------------------------------------------------
describe("runCaregiverExclusionCheck - caregiver with no matches", () => {
  it("writes exactly one `clear` row per exclusion source and returns status='clear'", async () => {
    const result = await svc.runCaregiverExclusionCheck("cg-1");

    expect(result).toMatchObject({
      caregiverId: "cg-1",
      status: "clear",
      totalMatches: 0,
      matches: [],
    });

    // One row per known source (3 sources in the mock), all `clear`.
    expect(insertedChecks).toHaveLength(3);
    const sourceIds = insertedChecks.map((c) => c.sourceId).sort();
    expect(sourceIds).toEqual(["src-medicheck", "src-oig", "src-sam"]);
    expect(insertedChecks.every((c) => c.status === "clear")).toBe(true);
    // No `possible_match` rows must leak in on the clear path.
    expect(
      insertedChecks.every((c) => c.exclusionRecordId == null),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (c) Possible-match paths — NPI / license / name. Only the matching rows
// should be written (NOT a `clear` row for every other source).
// ---------------------------------------------------------------------------
describe("runCaregiverExclusionCheck - caregiver with matches", () => {
  it("NPI hit: writes only the matching possible_match row with matchReason='npi' and the caregiver's NPI as matchedIdentifier", async () => {
    mockedStorage.getCaregiver.mockResolvedValue({
      id: "cg-1",
      firstName: "Maria",
      lastName: "Smith",
      dateOfBirth: null,
      npi: "1194807255",
    });
    mockedStorage.getExclusionRecordsByNpi.mockResolvedValue([
      {
        id: "rec-npi-1",
        sourceId: "src-medicheck",
        firstName: "Jadan",
        lastName: "Abbassi",
        npi: "1194807255",
        licenseNumber: null,
      },
    ]);

    const result = await svc.runCaregiverExclusionCheck("cg-1");

    expect(result.status).toBe("possible_match");
    expect(result.totalMatches).toBe(1);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      exclusionRecordId: "rec-npi-1",
      sourceId: "src-medicheck",
      matchReason: "npi",
      matchedIdentifier: "1194807255",
      matchedFirstName: "Jadan",
      matchedLastName: "Abbassi",
      matchType: "exact",
      matchScore: 100,
    });

    // Persistence must mirror the API result: ONLY the matching row, never a
    // `clear` row for OIG / SAM that could mislead a reviewer into thinking
    // the caregiver was independently cleared by those sources.
    expect(insertedChecks).toHaveLength(1);
    expect(insertedChecks[0]).toMatchObject({
      caregiverId: "cg-1",
      sourceId: "src-medicheck",
      exclusionRecordId: "rec-npi-1",
      status: "possible_match",
      matchReason: "npi",
      matchedIdentifier: "1194807255",
      matchedFirstName: "Jadan",
      matchedLastName: "Abbassi",
    });
    expect(insertedChecks.every((c) => c.status !== "clear")).toBe(true);
  });

  it("License hit: writes only the matching possible_match row with matchReason='license_number' and the matched license as matchedIdentifier", async () => {
    mockedStorage.getCertificateNumbersByCaregiver.mockResolvedValue([
      "RN12345",
    ]);
    mockedStorage.getExclusionRecordsByLicenseNumbers.mockResolvedValue([
      {
        id: "rec-lic-1",
        sourceId: "src-oig",
        firstName: "Earl",
        lastName: "Kempton",
        npi: null,
        licenseNumber: "RN12345",
      },
    ]);

    const result = await svc.runCaregiverExclusionCheck("cg-1");

    expect(result.status).toBe("possible_match");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      exclusionRecordId: "rec-lic-1",
      sourceId: "src-oig",
      matchReason: "license_number",
      matchedIdentifier: "RN12345",
      matchType: "exact",
      matchScore: 100,
    });

    expect(insertedChecks).toHaveLength(1);
    expect(insertedChecks[0]).toMatchObject({
      caregiverId: "cg-1",
      sourceId: "src-oig",
      exclusionRecordId: "rec-lic-1",
      status: "possible_match",
      matchReason: "license_number",
      matchedIdentifier: "RN12345",
      matchedFirstName: "Earl",
      matchedLastName: "Kempton",
    });
    expect(insertedChecks.every((c) => c.status !== "clear")).toBe(true);
  });

  it("Name hit: writes only the matching possible_match row with matchReason='name_exact' and a null matchedIdentifier", async () => {
    mockedStorage.getExclusionRecordsByName.mockResolvedValue([
      {
        id: "rec-name-1",
        sourceId: "src-sam",
        firstName: "Maria",
        lastName: "Smith",
        npi: null,
        licenseNumber: null,
      },
    ]);

    const result = await svc.runCaregiverExclusionCheck("cg-1");

    expect(result.status).toBe("possible_match");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      exclusionRecordId: "rec-name-1",
      sourceId: "src-sam",
      matchReason: "name_exact",
      matchedIdentifier: null,
      matchType: "exact",
      matchScore: 100,
      matchedFirstName: "Maria",
      matchedLastName: "Smith",
    });

    expect(insertedChecks).toHaveLength(1);
    expect(insertedChecks[0]).toMatchObject({
      caregiverId: "cg-1",
      sourceId: "src-sam",
      exclusionRecordId: "rec-name-1",
      status: "possible_match",
      matchReason: "name_exact",
      matchedIdentifier: null,
      matchedFirstName: "Maria",
      matchedLastName: "Smith",
    });
    expect(insertedChecks.every((c) => c.status !== "clear")).toBe(true);
  });
});
