/**
 * Vitest suite for the scheduled exclusion auto-fetchers (Task #77 / #118).
 *
 * Covers:
 *   - ExclusionService.mapSamApiEntity against captured SAM.gov v3 JSON
 *     samples (individual person + business entity + empty/garbage rows).
 *   - ExclusionService.fetchMedicheckData against a recorded PA OMIG CSV
 *     fixture, with global.fetch mocked.
 *   - lastFetchedAt is updated on the source record even when the upstream
 *     fetch fails (network error, HTTP 5xx, empty body, zero rows).
 *
 * No DB or network dependencies. Run with: npm test
 */

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
      updateExclusionSource: vi.fn(async (_id: string, patch: any) => ({
        id: _id,
        ...patch,
      })),
    },
  };
});

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

const ORIGINAL_SAM_KEY = process.env.SAM_API_KEY;

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
// SAM.gov v3 API mapper — individual / entity / garbage rows
// ---------------------------------------------------------------------------
describe("mapSamApiEntity - SAM.gov v3 individual row", () => {
  it("maps a captured person record into the exclusion-record payload", () => {
    const entity = {
      classificationType: "Individual",
      exclusionIdentification: {
        firstName: "John",
        middleName: "Q",
        lastName: "Doe",
        title: "MD",
        suffix: "JR",
        samNumber: "SAM-IND-001",
        npiNumber: "1234567890",
      },
      exclusionDetails: {
        exclusionType: "Mandatory",
      },
      exclusionAddress: {
        addressLine1: "123 Main St",
        city: "Pittsburgh",
        stateOrProvince: "PA",
        zipCode: "15213",
      },
      exclusionActions: {
        activeDate: "2020-01-15",
        terminationDate: "Indefinite",
      },
    };

    const mapped = (svc as any).mapSamApiEntity(entity, SAM_SOURCE_ID);
    expect(mapped).not.toBeNull();
    expect(mapped).toMatchObject({
      sourceId: SAM_SOURCE_ID,
      firstName: "John",
      lastName: "Doe",
      middleName: "Q",
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
    expect(mapped.exclusionDate?.toISOString().startsWith("2020-01-15")).toBe(true);
    expect(mapped.rawPayload).toBe(entity);
  });

  it("falls back to NPI as externalIdentifier when no SAM number is present", () => {
    const entity = {
      classificationType: "Individual",
      exclusionIdentification: {
        firstName: "Jane",
        lastName: "Smith",
        npiNumber: "9999999999",
      },
    };
    const mapped = (svc as any).mapSamApiEntity(entity, SAM_SOURCE_ID);
    expect(mapped?.externalIdentifier).toBe("9999999999");
    expect(mapped?.businessName).toBeNull();
  });
});

describe("mapSamApiEntity - SAM.gov v3 entity (business) row", () => {
  it("maps a captured firm record with businessName populated and person fields null", () => {
    const entity = {
      classificationType: "Firm",
      exclusionIdentification: {
        name: "ACME HOME CARE LLC",
        samNumber: "SAM-ENT-042",
      },
      exclusionDetails: { exclusionType: "Procurement" },
      exclusionAddress: {
        addressLine1: "500 Liberty Ave",
        city: "Philadelphia",
        stateOrProvince: "PA",
        zipCode: "19103",
      },
      exclusionActions: { creationDate: "2022-06-01" },
    };

    const mapped = (svc as any).mapSamApiEntity(entity, SAM_SOURCE_ID);
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
    expect(mapped.exclusionDate?.toISOString().startsWith("2022-06-01")).toBe(true);
  });

  it("uses entity.legalBusinessName as a fallback when ident.name is missing", () => {
    const entity = {
      classificationType: "Special Entity",
      exclusionIdentification: { samNumber: "SAM-LB-001" },
      legalBusinessName: "CITYWIDE NURSING SERVICES INC",
    };
    const mapped = (svc as any).mapSamApiEntity(entity, SAM_SOURCE_ID);
    expect(mapped?.businessName).toBe("CITYWIDE NURSING SERVICES INC");
    expect(mapped?.firstName).toBeNull();
  });
});

describe("mapSamApiEntity - defensive cases", () => {
  it("returns null for an empty / non-object input", () => {
    expect((svc as any).mapSamApiEntity(null, SAM_SOURCE_ID)).toBeNull();
    expect((svc as any).mapSamApiEntity(undefined, SAM_SOURCE_ID)).toBeNull();
    expect((svc as any).mapSamApiEntity("garbage", SAM_SOURCE_ID)).toBeNull();
  });

  it("returns null for a row with no name, business, SAM number, or NPI", () => {
    const empty = {
      classificationType: "Individual",
      exclusionIdentification: {},
      exclusionAddress: { city: "Nowhere" },
    };
    expect((svc as any).mapSamApiEntity(empty, SAM_SOURCE_ID)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchSamData — lastFetchedAt stamped on failure
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
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
  });

  it("API returns 0 records: refuses to wipe and still stamps lastFetchedAt", async () => {
    process.env.SAM_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ excludedEntity: [], totalRecords: 0 }),
        text: async () => "",
      })) as any
    );

    const result = await svc.fetchSamData();
    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);
    expect(result.errors.some((e) => /0 records/.test(e))).toBe(true);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });

  it("network error: catches the exception and still stamps lastFetchedAt", async () => {
    process.env.SAM_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }) as any
    );

    const result = await svc.fetchSamData();
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /ECONNREFUSED/.test(e))).toBe(true);

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fetchMedicheckData — recorded CSV fixture + failure paths
// ---------------------------------------------------------------------------
describe("fetchMedicheckData - happy path with recorded PA OMIG CSV", () => {
  it("parses the captured fixture, persists the rows, and stamps lastFetchedAt", async () => {
    const csv = [
      "ProviderName,LicenseNumber,Status,BeginDate,EndDate,NAM_LAST_PROVR,NAM_FIRST_PROVR,NAM_MIDDLE_PROVR,NAM_BUSNS_MP,IDN_NPI,NBR_FEIN",
      '"DOE, JANE",RN-AUTO-1,Active,2021-03-01,NULL,DOE,JANE,Q,NULL,1000000001,NULL',
      '"ACME HOME CARE LLC",BUS-AUTO-1,Active,2021-06-01,NULL,NULL,NULL,NULL,ACME HOME CARE LLC,NULL,99-1111111',
    ].join("\n");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => csv,
      })) as any
    );

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.errors).toEqual([]);

    expect(mockedStorage.deleteExclusionRecordsBySource).toHaveBeenCalledWith(
      MEDICHECK_SOURCE_ID
    );
    const insertCall = mockedStorage.createExclusionRecordsBulk.mock.calls[0]?.[0] as any[];
    expect(insertCall).toHaveLength(2);
    expect(insertCall[0]).toMatchObject({
      firstName: "JANE",
      lastName: "DOE",
      npi: "1000000001",
      licenseNumber: "RN-AUTO-1",
    });
    expect(insertCall[1]).toMatchObject({
      firstName: null,
      lastName: null,
      businessName: "ACME HOME CARE LLC",
      fein: "99-1111111",
    });

    // importMedicheckCsv stamps lastFetchedAt on the success path; fetchMedicheckData
    // skips the redundant stamp when the importer ran.
    const updateCalls = mockedStorage.updateExclusionSource.mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const lastPatch = updateCalls[updateCalls.length - 1][1];
    expect(lastPatch.lastFetchedAt).toBeInstanceOf(Date);
    expect(lastPatch.lastRecordCount).toBe(2);
  });
});

describe("fetchMedicheckData - stamps lastFetchedAt even when the fetch fails", () => {
  it("HTTP 500 from PA DHS: returns failure and still updates the source record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "",
      })) as any
    );

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);
    expect(result.errors.some((e) => /500/.test(e))).toBe(true);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [id, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(id).toBe(MEDICHECK_SOURCE_ID);
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });

  it("empty response body: returns failure and still updates the source record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "   \n   ",
      })) as any
    );

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /empty response body/i.test(e))).toBe(true);

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });

  it("network error: catches the exception and still stamps lastFetchedAt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      }) as any
    );

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /ECONNRESET/.test(e))).toBe(true);

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });

  it("download succeeds but CSV has zero usable rows: refuses to wipe and still stamps lastFetchedAt", async () => {
    // Header-only CSV: download succeeds, but importMedicheckCsv must
    // reject it via MedicheckImportValidationError so the scheduler doesn't
    // silently replace good data with an empty list. The finally block in
    // fetchMedicheckData must still stamp the source.
    const headerOnly =
      "ProviderName,LicenseNumber,Status,BeginDate,EndDate,NAM_LAST_PROVR,NAM_FIRST_PROVR,NAM_BUSNS_MP,IDN_NPI,NBR_FEIN";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => headerOnly,
      })) as any
    );

    const result = await svc.fetchMedicheckData();
    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);

    expect(mockedStorage.deleteExclusionRecordsBySource).not.toHaveBeenCalled();
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();

    expect(mockedStorage.updateExclusionSource).toHaveBeenCalledTimes(1);
    const [, patch] = mockedStorage.updateExclusionSource.mock.calls[0];
    expect(patch.lastFetchedAt).toBeInstanceOf(Date);
    expect(patch.lastRecordCount).toBe(0);
  });
});
