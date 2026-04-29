/**
 * Vitest unit-test suite for the MediCheck CSV importer.
 *
 * Covers the data-safety guarantees of `ExclusionService.importMedicheckCsv`:
 *   - Legacy header layout still imports cleanly.
 *   - Full PA OMIG layout maps person, entity, and identifier columns.
 *   - Mixed person + entity rows in the same file are stored correctly.
 *   - "NULL" / whitespace cell values are normalized to null.
 *   - UTF-8 BOM-prefixed files are accepted.
 *   - Header-only files are REJECTED and existing records are preserved.
 *   - Garbage-header files are REJECTED and existing records are preserved.
 *   - Empty files are REJECTED and existing records are preserved.
 *
 * The storage layer is fully mocked via `vi.mock`, so the suite has no DB
 * dependency and can run anywhere `vitest` is installed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the storage singleton imported by exclusion-service.ts. Vitest hoists
// vi.mock above all imports, so the service module sees the mocked storage.
// ---------------------------------------------------------------------------
vi.mock("../storage", () => {
  const fakeSource = {
    id: "medicheck-source-id",
    name: "PA Medicheck",
    type: "medicheck" as const,
  };
  return {
    storage: {
      getExclusionSourceByType: vi.fn(async () => fakeSource),
      deleteExclusionRecordsBySource: vi.fn(async () => 0),
      createExclusionRecordsBulk: vi.fn(async (recs: unknown[]) => recs.length),
      updateExclusionSource: vi.fn(async () => fakeSource),
    },
  };
});

import type { InsertExclusionRecord } from "@shared/schema";
import {
  ExclusionService,
  MedicheckImportValidationError,
} from "../exclusion-service";
import { storage } from "../storage";

interface MockedStorage {
  getExclusionSourceByType: ReturnType<typeof vi.fn>;
  deleteExclusionRecordsBySource: ReturnType<typeof vi.fn>;
  createExclusionRecordsBulk: ReturnType<typeof vi.fn>;
  updateExclusionSource: ReturnType<typeof vi.fn>;
}

const mockedStorage = storage as unknown as MockedStorage;

// Helper: pull the mapped insert payloads out of the bulk-insert mock.
function getInsertedRecords(): InsertExclusionRecord[] {
  const calls = mockedStorage.createExclusionRecordsBulk.mock.calls;
  if (calls.length === 0) return [];
  // Importer always passes a single array of payloads as the first argument.
  const firstArg = calls[0][0];
  return Array.isArray(firstArg) ? (firstArg as InsertExclusionRecord[]) : [];
}

// Helper: was the destructive delete called?
function destructiveDeleteWasCalled(): boolean {
  return mockedStorage.deleteExclusionRecordsBySource.mock.calls.length > 0;
}

const svc = ExclusionService.getInstance();

beforeEach(() => {
  // Reset call history but keep the resolved-value implementations.
  mockedStorage.getExclusionSourceByType.mockClear();
  mockedStorage.deleteExclusionRecordsBySource.mockClear();
  mockedStorage.createExclusionRecordsBulk.mockClear();
  mockedStorage.updateExclusionSource.mockClear();
});

// ---------------------------------------------------------------------------
// 1. Legacy header layout
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - legacy headers", () => {
  it("imports rows using FirstName / LastName / NPI / ExclusionDate", async () => {
    const csv = [
      "FirstName,LastName,MiddleName,NPI,License Number,State,ExclusionDate,ReinstateDate,ExclusionType,BusinessName",
      "Jane,Smith,Q,9876543210,LIC-LEGACY-1,NY,2018-09-01,2023-09-01,Mandatory,SMITH WELLNESS LLC",
      "Bob,Jones,,1112223333,LIC-LEGACY-2,NY,2019-01-15,,Mandatory,",
    ].join("\n");

    const result = await svc.importMedicheckCsv(csv);

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(destructiveDeleteWasCalled()).toBe(true);

    const inserted = getInsertedRecords();
    expect(inserted).toHaveLength(2);

    expect(inserted[0]).toMatchObject({
      firstName: "Jane",
      lastName: "Smith",
      middleName: "Q",
      npi: "9876543210",
      licenseNumber: "LIC-LEGACY-1",
      state: "NY",
      exclusionType: "Mandatory",
      businessName: "SMITH WELLNESS LLC",
      externalIdentifier: "LIC-LEGACY-1",
    });
    expect(inserted[0].exclusionDate?.toISOString().startsWith("2018-09-01")).toBe(true);
    expect(inserted[0].reinstateDate?.toISOString().startsWith("2023-09-01")).toBe(true);

    expect(inserted[1]).toMatchObject({
      firstName: "Bob",
      lastName: "Jones",
      middleName: null,
      npi: "1112223333",
      licenseNumber: "LIC-LEGACY-2",
      businessName: null,
    });
    expect(inserted[1].reinstateDate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Full PA OMIG header layout
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - full PA OMIG headers", () => {
  it("maps every PA OMIG column for a person row", async () => {
    const csv = [
      "ProviderName,LicenseNumber,Status,BeginDate,EndDate,CAO,NAM_LAST_PROVR,NAM_FIRST_PROVR,NAM_MIDDLE_PROVR,NAM_TITLE_PROVR,NAM_SUFFIX_PROVR,NAM_PROVR_ALT,NAM_BUSNS_MP,IDN_NPI,NBR_FEIN",
      '"DOE, JOHN A",RN12345,Active,2020-05-15,NULL,001,DOE,JOHN,A,MD,JR,JOHNNY DOE,NULL,1234567890,12-3456789',
    ].join("\n");

    const result = await svc.importMedicheckCsv(csv);

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);

    const [row] = getInsertedRecords();
    expect(row).toMatchObject({
      firstName: "JOHN",
      lastName: "DOE",
      middleName: "A",
      title: "MD",
      suffix: "JR",
      aliasName: "JOHNNY DOE",
      npi: "1234567890",
      licenseNumber: "RN12345",
      fein: "12-3456789",
      exclusionStatus: "Active",
      businessName: null,
      reinstateDate: null,
      externalIdentifier: "RN12345",
      state: "PA",
    });
    expect(row.exclusionDate?.toISOString().startsWith("2020-05-15")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Mixed person + entity rows
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - mixed person and entity rows", () => {
  it("imports both, surfaces an entity-only warning, and preserves both shapes", async () => {
    const csv = [
      "ProviderName,LicenseNumber,Status,BeginDate,EndDate,NAM_LAST_PROVR,NAM_FIRST_PROVR,NAM_BUSNS_MP,IDN_NPI,NBR_FEIN",
      '"DOE, JANE",RN-PERSON-1,Active,2021-03-01,NULL,DOE,JANE,NULL,1000000001,NULL',
      '"ACME HOME CARE LLC",BUS-ENT-1,Active,2021-06-01,NULL,NULL,NULL,ACME HOME CARE LLC,NULL,99-1111111',
      '"CITYWIDE NURSING SERVICES INC",BUS-FALLBACK,Active,NULL,NULL,NULL,NULL,NULL,NULL,NULL',
    ].join("\n");

    const result = await svc.importMedicheckCsv(csv);

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(3);
    // Two of the three rows have no person name — they should be reported as
    // entity-only via warnings (single warning line summarizing the count).
    expect(result.warnings.some((w) => /entity \(business\)/.test(w))).toBe(true);
    expect(result.warnings.find((w) => /entity \(business\)/.test(w))).toContain("2");

    const inserted = getInsertedRecords();
    expect(inserted).toHaveLength(3);

    expect(inserted[0]).toMatchObject({
      firstName: "JANE",
      lastName: "DOE",
      businessName: null,
      npi: "1000000001",
      fein: null,
    });

    expect(inserted[1]).toMatchObject({
      firstName: null,
      lastName: null,
      businessName: "ACME HOME CARE LLC",
      npi: null,
      fein: "99-1111111",
    });

    // Third row has no NAM_BUSNS_MP — businessName must fall back to ProviderName.
    expect(inserted[2]).toMatchObject({
      firstName: null,
      lastName: null,
      businessName: "CITYWIDE NURSING SERVICES INC",
    });
  });
});

// ---------------------------------------------------------------------------
// 4. NULL / whitespace normalization
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - NULL and whitespace normalization", () => {
  it('treats "NULL", "null", "  ", and empty cells as null in the payload', async () => {
    const csv = [
      "NAM_FIRST_PROVR,NAM_LAST_PROVR,IDN_NPI,LicenseNumber,NAM_BUSNS_MP,NBR_FEIN,Status",
      '"   ","Null","  null  ","\tRN-WS-1\t","","NULL","  Reinstated  "',
    ].join("\n");

    const result = await svc.importMedicheckCsv(csv);
    expect(result.success).toBe(true);

    const [row] = getInsertedRecords();
    expect(row).toMatchObject({
      firstName: null,
      lastName: null,
      npi: null,
      licenseNumber: "RN-WS-1",
      businessName: null,
      fein: null,
      exclusionStatus: "Reinstated",
    });
  });

  it("drops rows with no recognizable identifying data and reports them as a warning", async () => {
    const csv = [
      "NAM_FIRST_PROVR,NAM_LAST_PROVR,IDN_NPI,LicenseNumber,NAM_BUSNS_MP,NBR_FEIN,ProviderName",
      '"NULL","NULL","NULL","","NULL","NULL","   "',
      "Jane,Doe,1111111111,LIC-OK,NULL,NULL,NULL",
    ].join("\n");

    const result = await svc.importMedicheckCsv(csv);
    expect(result.success).toBe(true);
    // Only the second (real) row gets persisted.
    expect(result.recordCount).toBe(1);
    expect(result.warnings.some((w) => /no recognizable identifying data/.test(w))).toBe(true);

    const inserted = getInsertedRecords();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      firstName: "Jane",
      lastName: "Doe",
      npi: "1111111111",
      licenseNumber: "LIC-OK",
    });
  });
});

// ---------------------------------------------------------------------------
// 5. UTF-8 BOM-prefixed file
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - BOM-prefixed file", () => {
  it("strips the BOM from the first header so recognition still works", async () => {
    const BOM = "\uFEFF";
    const csv =
      BOM +
      [
        "NAM_FIRST_PROVR,NAM_LAST_PROVR,IDN_NPI,LicenseNumber,Status,BeginDate",
        "JOHN,SMITH,1234567890,LIC-BOM-1,Active,2022-01-01",
      ].join("\n");

    const result = await svc.importMedicheckCsv(csv);
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);

    const [row] = getInsertedRecords();
    expect(row).toMatchObject({
      firstName: "JOHN",
      lastName: "SMITH",
      npi: "1234567890",
      licenseNumber: "LIC-BOM-1",
      exclusionStatus: "Active",
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Header-only file (rejected, records preserved)
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - header-only file", () => {
  it("rejects a file with recognized headers but no data rows and never deletes existing records", async () => {
    const csv =
      "NAM_FIRST_PROVR,NAM_LAST_PROVR,IDN_NPI,LicenseNumber,Status,BeginDate";

    await expect(svc.importMedicheckCsv(csv)).rejects.toBeInstanceOf(
      MedicheckImportValidationError
    );

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. Garbage-header file (rejected, records preserved)
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - unrecognized headers", () => {
  it("rejects a file whose headers don't match either layout and never deletes existing records", async () => {
    const csv = [
      "foo,bar,baz,quux",
      "1,2,3,4",
      "5,6,7,8",
    ].join("\n");

    await expect(svc.importMedicheckCsv(csv)).rejects.toBeInstanceOf(
      MedicheckImportValidationError
    );

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 8. Empty file (rejected, records preserved)
// ---------------------------------------------------------------------------
describe("importMedicheckCsv - empty file", () => {
  it("rejects an empty CSV and never deletes existing records", async () => {
    await expect(svc.importMedicheckCsv("")).rejects.toBeInstanceOf(
      MedicheckImportValidationError
    );

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only CSV and never deletes existing records", async () => {
    await expect(svc.importMedicheckCsv("   \n   \n")).rejects.toBeInstanceOf(
      MedicheckImportValidationError
    );

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });
});
