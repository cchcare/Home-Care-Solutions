/**
 * Vitest suite for ExclusionService.importSamCsv() — Task #74.
 *
 * Validates the SAM.gov CSV importer protections that mirror MediCheck:
 *   - Rejects files with no recognized headers BEFORE any destructive op
 *   - Rejects header-only / no-data-row files BEFORE any destructive op
 *   - Accepts a valid SAM.gov CSV (with a UTF-8 BOM) and inserts records
 *   - When validation fails, existing records remain untouched
 *
 * Storage is mocked via vi.mock — no DB dependency.
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
import { exclusionService, SamImportValidationError } from "../exclusion-service";
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

beforeEach(() => {
  mockedStorage.getExclusionSourceByType.mockClear();
  mockedStorage.deleteExclusionRecordsBySource.mockClear();
  mockedStorage.createExclusionRecordsBulk.mockClear();
  mockedStorage.updateExclusionSource.mockClear();
});

describe("importSamCsv - unrecognized headers", () => {
  it("throws SamImportValidationError and never deletes existing records", async () => {
    const garbage = "foo,bar,baz\n1,2,3\n";
    await expect(exclusionService.importSamCsv(garbage)).rejects.toBeInstanceOf(
      SamImportValidationError,
    );

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
    expect(mockedStorage.updateExclusionSource).not.toHaveBeenCalled();
  });

  it("error carries HTTP 400 status code and a descriptive message", async () => {
    const garbage = "foo,bar,baz\n1,2,3\n";
    try {
      await exclusionService.importSamCsv(garbage);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(SamImportValidationError);
      const e = err as SamImportValidationError;
      expect(e.statusCode).toBe(400);
      expect(e.message).toMatch(/Unrecognized SAM\.gov CSV format/);
    }
  });
});

describe("importSamCsv - header-only file", () => {
  it("rejects with a 'no data rows' error and preserves existing records", async () => {
    const headerOnly = "First Name,Last Name,SAM Number,Exclusion Type\n";
    try {
      await exclusionService.importSamCsv(headerOnly);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(SamImportValidationError);
      const e = err as SamImportValidationError;
      expect(e.message).toMatch(/no data rows/i);
      expect(e.message).toMatch(/refusing to replace existing records/i);
    }

    expect(destructiveDeleteWasCalled()).toBe(false);
    expect(mockedStorage.createExclusionRecordsBulk).not.toHaveBeenCalled();
  });
});

describe("importSamCsv - valid CSV with UTF-8 BOM", () => {
  it("strips the BOM, imports rows, and replaces existing records", async () => {
    const BOM = "\uFEFF";
    const csv =
      BOM +
      "First Name,Last Name,SAM Number,Exclusion Type,NPI,Exclusion Date,Termination Date\n" +
      "John,Doe,SAM-001,Mandatory,1234567890,2020-01-15,\n" +
      "Jane,Smith,SAM-002,Procurement,,,\n";

    const result = await exclusionService.importSamCsv(csv);
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.errors).toEqual([]);

    expect(destructiveDeleteWasCalled()).toBe(true);

    const inserted = getInsertedRecords();
    expect(inserted).toHaveLength(2);

    const doe = inserted.find((r) => r.lastName === "Doe");
    expect(doe).toBeDefined();
    expect(doe).toMatchObject({
      firstName: "John",
      externalIdentifier: "SAM-001",
      npi: "1234567890",
      exclusionType: "Mandatory",
    });
    expect(doe?.exclusionDate?.toISOString().startsWith("2020-01-15")).toBe(true);

    const smith = inserted.find((r) => r.lastName === "Smith");
    expect(smith).toBeDefined();
    expect(smith?.externalIdentifier).toBe("SAM-002");
  });
});
