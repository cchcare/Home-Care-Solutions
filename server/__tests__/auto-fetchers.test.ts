/**
 * Vitest suite for the scheduled exclusion auto-fetchers (Task #77 / #118).
 *
 * Covers:
 *   - ExclusionService.mapSamApiEntity against a captured SAM.gov v3 JSON
 *     fixture (one individual person row + one business entity row).
 *   - ExclusionService.fetchMedicheckData against a recorded PA OMIG CSV
 *     fixture, with global.fetch stubbed.
 *   - lastFetchedAt is updated on the source record even when the upstream
 *     fetch fails (network error, HTTP 5xx, empty body, zero usable rows).
 *
 * Fixtures live in server/__tests__/fixtures/ so a future schema change at
 * SAM.gov or PA DHS will trip these tests instead of silently breaking the
 * scheduled job.
 *
 * No DB or network dependencies. Run with: npm test
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../storage", () => {
  const samSource = {
    id: "sam-source-id",
    name: "SAM.gov",
    type: "sam" as const,
  };
  const medicheckSource = {
    id: "medicheck-source-id",
    name: "PA Medicheck",
    type: "medicheck" as const,
  };
  return {
    storage: {
      getExclusionSourceByType: vi.fn(async (t: string) =>
        t === "sam" ? samSource : t === "medicheck" ? medicheckSource : undefined
      ),
      deleteExclusionRecordsBySource: vi.fn(async () => 0),
      createExclusionRecordsBulk: vi.fn(async (recs: unknown[]) =>
        Array.isArray(recs) ? recs.length : 0
      ),
      updateExclusionSource: vi.fn(async (_id: string, patch: Record<string, unknown>) => ({
        id: _id,
        ...patch,
      })),
    },
  };
});

import type { InsertExclusionRecord } from "@shared/schema";
import { ExclusionService } from "../exclusion-service";
import { storage } from "../storage";

interface MockedStorage {
  getExclusionSourceByType: ReturnType<typeof vi.fn>;
  deleteExclusionRecordsBySource: ReturnType<typeof vi.fn>;
  createExclusionRecordsBulk: ReturnType<typeof vi.fn>;
  updateExclusionSource: ReturnType<typeof vi.fn>;
}
const mockedStorage = storage as unknown as MockedStorage;

const svc = ExclusionService.getInstance();

const SAM_SOURCE_ID = "sam-source-id";
const MEDICHECK_SOURCE_ID = "medicheck-source-id";

const FIXTURES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "fixtures");

interface CapturedSamResponse {
  totalRecords: number;
  page?: number;
  size?: number;
  excludedEntity: unknown[];
}
const samFixture: CapturedSamResponse = JSON.parse(
  readFileSync(join(FIXTURES_DIR, "sam-gov-v3-sample.json"), "utf-8")
);
const medicheckFixture: string = readFileSync(
  join(FIXTURES_DIR, "pa-medicheck-sample.csv"),
  "utf-8"
);

const ORIGINAL_SAM_KEY = process.env.SAM_API_KEY;

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function textResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/csv" },
    ...init,
  });
}

function lastUpdatePatch(): Record<string, unknown> {
  const calls = mockedStorage.updateExclusionSource.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][1] as Record<string, unknown>;
}

beforeEach(() => {
  mockedStorage.getExclusionSourceByType.mockClear();
  mockedStorage.deleteExclusionRecordsBySource.mockClear();
  mockedStorage.createExclusionRecordsBulk.mockClear();
  mockedStorage.updateExclusionSource.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_SAM_KEY === undefined) {
    delete process.env.SAM_API_KEY;
  } else {
    process.env.SAM_API_KEY = ORIGINAL_SAM_KEY;
  }
});

// ---------------------------------------------------------------------------
// SAM.gov v3 mapper against the captured fixture
// ---------------------------------------------------------------------------
describe("mapSamApiEntity - against captured SAM.gov v3 fixture", () => {
  it("maps the captured Individual row into the exclusion-record payload", () => {
    const individual = samFixture.excludedEntity[0];
    const mapped = svc.mapSamApiEntity(individual, SAM_SOURCE_ID);
    expect(mapped).not.toBeNull();
    expect(mapped).toMatchObject({
      sourceId: SAM_SOURCE_ID,
      firstName: "John",
      middleName: "Q",
      lastName: "Doe",
      title: "MD",
      suffix: "JR",
      businessName: null,
      npi: "1234567890",
      address: "123 Main St",
      city: "Pittsburgh",
      state: "PA",
      zipCode: "15213",
      exclusionType: "Mandatory",
      externalIdentifier: "SAM-IND-001",
      isActive: true,
    });
    expect(mapped?.exclusionDate?.toISOString().startsWith("2020-01-15")).toBe(true);
    expect(mapped?.rawPayload).toBe(individual);
  });

  it("maps the captured Firm row with businessName populated and person fields null", () => {
    const firm = samFixture.excludedEntity[1];
    const mapped = svc.mapSamApiEntity(firm, SAM_SOURCE_ID);
    expect(mapped).not.toBeNull();
    expect(mapped).toMatchObject({
      sourceId: SAM_SOURCE_ID,
      firstName: null,
      lastName: null,
      middleName: null,
      businessName: "ACME HOME CARE LLC",
      npi: null,
      address: "500 Liberty Ave",
      city: "Philadelphia",
      state: "PA",
      zipCode: "19103",
      exclusionType: "Procurement",
      externalIdentifier: "SAM-ENT-042",
    });
    expect(mapped?.exclusionDate?.toISOString().startsWith("2022-06-01")).toBe(true);
  });

  it("returns null for null/undefined/non-object input", () => {
    expect(svc.mapSamApiEntity(null, SAM_SOURCE_ID)).toBeNull();
    expect(svc.mapSamApiEntity(undefined, SAM_SOURCE_ID)).toBeNull();
    expect(svc.mapSamApiEntity("garbage", SAM_SOURCE_ID)).toBeNull();
  });

  it("returns null for a row with no name, business, SAM number, or NPI", () => {
    const empty = {
      classificationType: "Individual",
      exclusionIdentification: {},
      exclusionAddress: { city: "Nowhere" },
    };
    expect(svc.mapSamApiEntity(empty, SAM_SOURCE_ID)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchSamData failure paths -- lastFetchedAt is stamped even on failure
// ---------------------------------------------------------------------------
describe("fetchSamData - stamps lastFetchedAt even when the fetch fails", () => {
  it("missing SAM_API_KEY: returns failure and still updates the source record", async () => {
    delete process.env.SAM_API_KEY;

    const result = await svc.fetchSamData();
    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);
    expect(result.errors.some((e) => /SAM_API_KEY/.test(e))).toBe(true);

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [id, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(id).toBe(SAM_SOURCE_ID);
    const p = patch as { lastFetchedAt: Date; lastRecordCount: number };
    expect(p.lastFetchedAt).toBeInstanceOf(Date);
    expect(p.lastRecordCount).toBe(0);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
  });

  it("API returns 0 records: refuses to wipe and still stamps lastFetchedAt", async () => {
    process.env.SAM_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ excludedEntity: [], totalRecords: 0 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await svc.fetchSamData();
    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);
    expect(result.errors.some((e) => /0 records/.test(e))).toBe(true);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();

    const patch = lastUpdatePatch() as { lastFetchedAt: Date; lastRecordCount: number };
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });

  it("network error: catches the exception and still stamps lastFetchedAt", async () => {
    process.env.SAM_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("ECONNREFUSED");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await svc.fetchSamData();
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /ECONNREFUSED/.test(e))).toBe(true);

    const patch = lastUpdatePatch() as { lastFetchedAt: Date; lastRecordCount: number };
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fetchMedicheckData - happy path against the recorded PA OMIG fixture
// ---------------------------------------------------------------------------
describe("fetchMedicheckData - happy path with recorded PA OMIG fixture", () => {
  it("downloads the captured CSV, persists the rows, and stamps lastFetchedAt", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => textResponse(medicheckFixture));
    vi.stubGlobal("fetch", fetchMock);

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.errors).toEqual([]);

    expect(mockedStorage.deleteExclusionRecordsBySource).toHaveBeenCalledWith(
      MEDICHECK_SOURCE_ID
    );
    const insertCall = mockedStorage.createExclusionRecordsBulk.mock
      .calls[0]?.[0] as InsertExclusionRecord[];
    expect(insertCall).toHaveLength(2);
    expect(insertCall[0]).toMatchObject({
      firstName: "JANE",
      lastName: "DOE",
      middleName: "Q",
      npi: "1000000001",
      licenseNumber: "RN-AUTO-1",
      state: "PA",
    });
    expect(insertCall[1]).toMatchObject({
      firstName: null,
      lastName: null,
      businessName: "ACME HOME CARE LLC",
      fein: "99-1111111",
    });

    const patch = lastUpdatePatch() as { lastFetchedAt: Date; lastRecordCount: number };
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(2);
  });
});

describe("fetchMedicheckData - stamps lastFetchedAt even when the fetch fails", () => {
  it("HTTP 500 from PA DHS: returns failure and still updates the source record", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response("", { status: 500, statusText: "Internal Server Error" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);
    expect(result.errors.some((e) => /500/.test(e))).toBe(true);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [id, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(id).toBe(MEDICHECK_SOURCE_ID);
    const p = patch as { lastFetchedAt: Date; lastRecordCount: number };
    expect(p.lastFetchedAt).toBeInstanceOf(Date);
    expect(p.lastRecordCount).toBe(0);
  });

  it("empty response body: returns failure and still updates the source record", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => textResponse("   \n   "));
    vi.stubGlobal("fetch", fetchMock);

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /empty response body/i.test(e))).toBe(true);

    const patch = lastUpdatePatch() as { lastFetchedAt: Date; lastRecordCount: number };
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });

  it("network error: catches the exception and still stamps lastFetchedAt", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("ECONNRESET");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /ECONNRESET/.test(e))).toBe(true);

    const patch = lastUpdatePatch() as { lastFetchedAt: Date; lastRecordCount: number };
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });

  it("download succeeds but CSV has zero usable rows: refuses to wipe and still stamps lastFetchedAt", async () => {
    const headerOnly =
      "ProviderName,LicenseNumber,Status,BeginDate,EndDate,NAM_LAST_PROVR,NAM_FIRST_PROVR,NAM_BUSNS_MP,IDN_NPI,NBR_FEIN";
    const fetchMock = vi.fn<typeof fetch>(async () => textResponse(headerOnly));
    vi.stubGlobal("fetch", fetchMock);

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();

    const patch = lastUpdatePatch() as { lastFetchedAt: Date; lastRecordCount: number };
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });
});
