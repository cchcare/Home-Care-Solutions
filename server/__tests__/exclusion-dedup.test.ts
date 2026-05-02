/**
 * Vitest suite for the duplicate-row guard around
 * `ExclusionService.runCaregiverExclusionCheck`.
 *
 * Two supervisors (or two browser tabs) can each fire POST
 * /api/caregivers/:id/exclusion-check at the same instant. Without protection
 * each call writes its own copy of the result rows, doubling the audit trail
 * and inflating Pending Reviews. The service combines a per-caregiver
 * in-process mutex with a short dedup window; this suite verifies both.
 *
 * The storage layer is fully mocked so the suite has no DB dependency.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CaregiverExclusionCheck, InsertCaregiverExclusionCheck } from "@shared/schema";

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
  // Most-recent first.
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
        firstName: "Alice",
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

import { ExclusionService } from "../exclusion-service";
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
  mockedStorage.getExclusionRecordsByNpi.mockResolvedValue([]);
  mockedStorage.getExclusionRecordsByLicenseNumbers.mockResolvedValue([]);
  mockedStorage.getExclusionRecordsByName.mockResolvedValue([]);
  mockedStorage.searchExclusionRecords.mockResolvedValue([]);
});

describe("runCaregiverExclusionCheck - duplicate suppression", () => {
  it("two parallel calls produce the same audit rows as a single call (clear)", async () => {
    const [r1, r2] = await Promise.all([
      svc.runCaregiverExclusionCheck("cg-1"),
      svc.runCaregiverExclusionCheck("cg-1"),
    ]);

    expect(r1.status).toBe("clear");
    expect(r2.status).toBe("clear");

    // Three sources -> exactly three `clear` rows total, even though we
    // invoked the check twice.
    expect(insertedChecks).toHaveLength(3);
    const sourceIds = insertedChecks.map((c) => c.sourceId).sort();
    expect(sourceIds).toEqual(["src-medicheck", "src-oig", "src-sam"]);
    expect(insertedChecks.every((c) => c.status === "clear")).toBe(true);
  });

  it("a sequential second call within the dedup window adds no new rows", async () => {
    await svc.runCaregiverExclusionCheck("cg-1");
    expect(insertedChecks).toHaveLength(3);

    await svc.runCaregiverExclusionCheck("cg-1");
    expect(insertedChecks).toHaveLength(3);
  });

  it("two parallel calls with a possible match write each match exactly once", async () => {
    mockedStorage.getExclusionRecordsByName.mockResolvedValueOnce([
      {
        id: "rec-1",
        sourceId: "src-oig",
        firstName: "Alice",
        lastName: "Smith",
        licenseNumber: null,
      },
    ]);
    // Both parallel checks call this method, so resolve it twice.
    mockedStorage.getExclusionRecordsByName.mockResolvedValueOnce([
      {
        id: "rec-1",
        sourceId: "src-oig",
        firstName: "Alice",
        lastName: "Smith",
        licenseNumber: null,
      },
    ]);

    const [r1, r2] = await Promise.all([
      svc.runCaregiverExclusionCheck("cg-1"),
      svc.runCaregiverExclusionCheck("cg-1"),
    ]);

    expect(r1.status).toBe("possible_match");
    expect(r2.status).toBe("possible_match");

    // Exactly one possible_match row for the (cg-1, src-oig, rec-1) triple.
    const matchRows = insertedChecks.filter((c) => c.status === "possible_match");
    expect(matchRows).toHaveLength(1);
    expect(matchRows[0]).toMatchObject({
      caregiverId: "cg-1",
      sourceId: "src-oig",
      exclusionRecordId: "rec-1",
    });
  });
});
