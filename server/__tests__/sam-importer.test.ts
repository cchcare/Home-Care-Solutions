/**
 * Vitest unit-test suite for the SAM.gov CSV importer.
 *
 * Covers the data-safety guarantees of `ExclusionService.importSamCsv`,
 * mirroring the MediCheck suite:
 *   - Recognized SAM.gov headers (First Name / Last Name / SAM Number /
 *     Exclusion Type) import cleanly.
 *   - Spaced vs. underscored variants are accepted (`SAM Number` and
 *     `SAM_Number`, `CAGE Code` and `CAGE_Code`).
 *   - UTF-8 BOM-prefixed files are accepted.
 *   - Empty files are REJECTED and existing records are preserved.
 *   - Header-only files are REJECTED and existing records are preserved.
 *   - Garbage-header files are REJECTED and existing records are preserved.
 *
 * The storage layer is fully mocked via `vi.mock`, so the suite has no DB
 * dependency and can run anywhere `vitest` is installed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../storage", () => {
  const fakeSource = {
    id: "sam-source-id",
    name: "SAM.gov",
    type: "sam" as const,
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
  SamImportValidationError,
} from "../exclusion-service";
import { storage } from "../storage";

interface MockedStorage {
  getExclusionSourceByType: ReturnType<typeof vi.fn>;
  deleteExclusionRecordsBySource: ReturnType<typeof vi.fn>;
  createExclusionRecordsBulk: ReturnType<typeof vi.fn>;
  updateExclusionSource: ReturnType<typeof vi.fn>;
}

const mockedStorage = storage as unknown as MockedStorage;

function getInsertedRecords(): InsertExclusionRecord[] {
  const calls = mockedStorage.createExclusionRecordsBulk.mock.calls;
  if (calls.length === 0) return [];
  const firstArg = calls[0][0];
  return Array.isArray(firstArg) ? (firstArg as InsertExclusionRecord[]) : [];
}

function destructiveDeleteWasCalled(): boolean {
  return mockedStorage.deleteExclusionRecordsBySource.mock.calls.length > 0;
}

const svc = ExclusionService.getInstance();

beforeEach(() => {
  mockedStorage.getExclusionSourceByType.mockClear();
  mockedStorage.deleteExclusionRecordsBySource.mockClear();
  mockedStorage.createExclusionRecordsBulk.mockClear();
  mockedStorage.updateExclusionSource.mockClear();
});

// ---------------------------------------------------------------------------
// 1. Recognized SAM.gov headers
// ---------------------------------------------------------------------------
describe("importSamCsv - recognized SAM.gov headers", () => {
  it("imports rows using First Name / Last Name / SAM Number / Exclusion Type", async () => {
    const csv = [
      "First Name,Last Name,SAM Number,Exclusion Type,NPI,Exclusion Date,Termination Date",
      "John,Doe,SAM-001,Mandatory,1234567890,2020-01-15,",
      "Jane,Smith,SAM-002,Procurement,,,",
    ].join("\n");

    const result = await svc.importSamCsv(csv);

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(destructiveDeleteWasCalled()).toBe(true);

    const inserted = getInsertedRecords();
    expect(inserted).toHaveLength(2);

    expect(inserted[0]).toMatchObject({
      firstName: "John",
      lastName: "Doe",
      externalIdentifier: "SAM-001",
      npi: "1234567890",
      exclusionType: "Mandatory",
    });
    expect(inserted[0].exclusionDate?.toISOString().startsWith("2020-01-15")).toBe(true);
    expect(inserted[0].reinstateDate).toBeNull();

    expect(inserted[1]).toMatchObject({
      firstName: "Jane",
      lastName: "Smith",
      externalIdentifier: "SAM-002",
      exclusionType: "Procurement",
      npi: null,
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Spaced vs. underscored header variants
// ---------------------------------------------------------------------------
describe("importSamCsv - header variants", () => {
  it("accepts the underscored SAM_Number / CAGE_Code variants", async () => {
    const csv = [
      "First Name,Last Name,SAM_Number,CAGE_Code,Exclusion Type",
      "Alice,Anderson,SAM-UND-1,CAGE-UND-1,Mandatory",
    ].join("\n");

    const result = await svc.importSamCsv(csv);
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);

    const [row] = getInsertedRecords();
    expect(row).toMatchObject({
      firstName: "Alice",
      lastName: "Anderson",
      externalIdentifier: "SAM-UND-1",
      exclusionType: "Mandatory",
    });
  });

  it("accepts the spaced 'SAM Number' / 'CAGE Code' variants", async () => {
    const csv = [
      "First Name,Last Name,SAM Number,CAGE Code,Exclusion Type",
      "Bob,Brown,SAM-SP-1,CAGE-SP-1,Procurement",
    ].join("\n");

    const result = await svc.importSamCsv(csv);
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);

    const [row] = getInsertedRecords();
    expect(row).toMatchObject({
      firstName: "Bob",
      lastName: "Brown",
      externalIdentifier: "SAM-SP-1",
      exclusionType: "Procurement",
    });
  });

  it("falls back to CAGE Code when SAM Number is missing", async () => {
    const csv = [
      "First Name,Last Name,SAM Number,CAGE Code,Exclusion Type",
      "Carol,Carter,,CAGE-ONLY-1,Mandatory",
    ].join("\n");

    const result = await svc.importSamCsv(csv);
    expect(result.success).toBe(true);

    const [row] = getInsertedRecords();
    expect(row.externalIdentifier).toBe("CAGE-ONLY-1");
  });
});

// ---------------------------------------------------------------------------
// 3. BOM-prefixed file
// ---------------------------------------------------------------------------
describe("importSamCsv - BOM-prefixed file", () => {
  it("strips the UTF-8 BOM from the first header so recognition still works", async () => {
    const BOM = "\uFEFF";
    const csv =
      BOM +
      [
        "First Name,Last Name,SAM Number,Exclusion Type,NPI,Exclusion Date,Termination Date",
        "John,Doe,SAM-001,Mandatory,1234567890,2020-01-15,",
        "Jane,Smith,SAM-002,Procurement,,,",
      ].join("\n");

    const result = await svc.importSamCsv(csv);
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);

    const inserted = getInsertedRecords();
    expect(inserted[0]).toMatchObject({
      firstName: "John",
      lastName: "Doe",
      externalIdentifier: "SAM-001",
    });
    expect(inserted[1]).toMatchObject({
      firstName: "Jane",
      lastName: "Smith",
      externalIdentifier: "SAM-002",
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Empty file (rejected, records preserved)
// ---------------------------------------------------------------------------
describe("importSamCsv - empty file", () => {
  it("rejects an empty CSV and never deletes existing records", async () => {
    await expect(svc.importSamCsv("")).rejects.toBeInstanceOf(
      SamImportValidationError
    );

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only CSV and never deletes existing records", async () => {
    await expect(svc.importSamCsv("   \n   \n")).rejects.toBeInstanceOf(
      SamImportValidationError
    );

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Header-only file (rejected, records preserved)
// ---------------------------------------------------------------------------
describe("importSamCsv - header-only file", () => {
  it("rejects a file with recognized headers but no data rows and never deletes existing records", async () => {
    const csv = "First Name,Last Name,SAM Number,Exclusion Type\n";

    const err = await svc
      .importSamCsv(csv)
      .then(() => null)
      .catch((e) => e);

    expect(err).toBeInstanceOf(SamImportValidationError);
    expect(err.message).toMatch(/no data rows/i);
    expect(err.message).toMatch(/refusing to replace existing records/i);

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Garbage-header file (rejected, records preserved)
// ---------------------------------------------------------------------------
describe("importSamCsv - unrecognized headers", () => {
  it("rejects a file whose headers don't match the SAM.gov layout and never deletes existing records", async () => {
    const csv = ["foo,bar,baz,quux", "1,2,3,4", "5,6,7,8"].join("\n");

    const err = await svc
      .importSamCsv(csv)
      .then(() => null)
      .catch((e) => e);

    expect(err).toBeInstanceOf(SamImportValidationError);
    expect(err.message).toMatch(/Unrecognized SAM\.gov CSV format/);

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });
});
