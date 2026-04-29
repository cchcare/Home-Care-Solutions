/**
 * Standalone smoke test for ExclusionService.importSamCsv() — Task #74.
 *
 * Validates the SAM.gov CSV importer protections that match what we did for
 * MediCheck:
 *   - Rejects files with no recognized headers BEFORE any destructive op
 *   - Rejects header-only / no-data-row files BEFORE any destructive op
 *   - Accepts a valid SAM.gov CSV (with a UTF-8 BOM) and inserts records
 *   - When validation fails, existing records remain untouched
 *
 * Requires: a SAM exclusion source seeded in the DB (type='sam').
 *
 * Run with:
 *   npx tsx server/__tests__/sam-importer.smoke.ts
 *
 * Exits non-zero if any assertion fails.
 */

import { exclusionService, SamImportValidationError } from "../exclusion-service";
import { storage } from "../storage";

let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function group(name: string, fn: () => Promise<void> | void): Promise<void> {
  console.log(`\n[${name}]`);
  return Promise.resolve(fn());
}

async function getSamCount(sourceId: string): Promise<number> {
  const recs = await storage.getExclusionRecords(sourceId, 5000, 0);
  return recs.length;
}

async function main() {
  const samSource = await storage.getExclusionSourceByType("sam");
  if (!samSource) {
    console.error(
      "SAM source not seeded; run: INSERT INTO exclusion_sources (id, type, name) VALUES (gen_random_uuid(), 'sam', 'SAM.gov')"
    );
    process.exit(2);
  }

  // Make sure we start from a clean slate so assertions are unambiguous.
  await storage.deleteExclusionRecordsBySource(samSource.id);
  const startingCount = await getSamCount(samSource.id);
  assert(startingCount === 0, "test setup: SAM table starts empty");

  // -------------------------------------------------------------------------
  // 1. Unrecognized headers -> SamImportValidationError, no records deleted
  // -------------------------------------------------------------------------
  // First, seed a sentinel row so we can prove validation runs BEFORE delete.
  await storage.createExclusionRecordsBulk([
    {
      sourceId: samSource.id,
      externalIdentifier: "SENTINEL-1",
      firstName: "Sentinel",
      lastName: "Row",
      isActive: true,
    } as any,
  ]);
  const beforeBadHeaders = await getSamCount(samSource.id);
  assert(beforeBadHeaders === 1, "test setup: sentinel row inserted");

  await group("Unrecognized headers rejected, no destructive op", async () => {
    const garbage = "foo,bar,baz\n1,2,3\n";
    let threw: SamImportValidationError | null = null;
    try {
      await exclusionService.importSamCsv(garbage);
    } catch (err) {
      if (err instanceof SamImportValidationError) threw = err;
      else throw err;
    }
    assert(threw !== null, "throws SamImportValidationError for unrecognized headers");
    assert(
      threw?.statusCode === 400,
      "SamImportValidationError carries HTTP 400 status code"
    );
    assert(
      /Unrecognized SAM\.gov CSV format/.test(threw?.message || ""),
      "error message mentions 'Unrecognized SAM.gov CSV format'"
    );
    const afterCount = await getSamCount(samSource.id);
    assert(
      afterCount === 1,
      "sentinel row STILL present after rejected import (no destructive op ran)"
    );
  });

  // -------------------------------------------------------------------------
  // 2. Recognized headers but ZERO data rows -> SamImportValidationError
  // -------------------------------------------------------------------------
  await group("Header-only file rejected, no destructive op", async () => {
    const headerOnly = "First Name,Last Name,SAM Number,Exclusion Type\n";
    let threw: SamImportValidationError | null = null;
    try {
      await exclusionService.importSamCsv(headerOnly);
    } catch (err) {
      if (err instanceof SamImportValidationError) threw = err;
      else throw err;
    }
    assert(threw !== null, "throws SamImportValidationError for header-only file");
    assert(
      /no data rows/i.test(threw?.message || "") &&
        /refusing to replace existing records/i.test(threw?.message || ""),
      "error message mentions 'no data rows' and refusal to replace"
    );
    const afterCount = await getSamCount(samSource.id);
    assert(
      afterCount === 1,
      "sentinel row STILL present after header-only rejection"
    );
  });

  // -------------------------------------------------------------------------
  // 3. Valid CSV with UTF-8 BOM -> success, sentinel replaced
  // -------------------------------------------------------------------------
  await group("Valid CSV with BOM imports successfully", async () => {
    const BOM = "\uFEFF";
    const csv =
      BOM +
      "First Name,Last Name,SAM Number,Exclusion Type,NPI,Exclusion Date,Termination Date\n" +
      "John,Doe,SAM-001,Mandatory,1234567890,2020-01-15,\n" +
      "Jane,Smith,SAM-002,Procurement,,,\n";
    const result = await exclusionService.importSamCsv(csv);
    assert(result.success === true, "result.success === true");
    assert(result.recordCount === 2, `result.recordCount === 2 (got ${result.recordCount})`);
    assert(result.errors.length === 0, "result.errors is empty");

    const records = await storage.getExclusionRecords(samSource.id, 50, 0);
    assert(records.length === 2, "exactly 2 SAM records persisted (sentinel was replaced)");

    const doe = records.find((r) => r.lastName === "Doe");
    assert(!!doe, "John Doe record present");
    assert(doe?.firstName === "John", "Doe.firstName === 'John'");
    assert(doe?.externalIdentifier === "SAM-001", "Doe.externalIdentifier === 'SAM-001'");
    assert(doe?.npi === "1234567890", "Doe.npi parsed");
    assert(doe?.exclusionType === "Mandatory", "Doe.exclusionType parsed");
    assert(
      doe?.exclusionDate?.toISOString().startsWith("2020-01-15"),
      "Doe.exclusionDate parsed"
    );

    const smith = records.find((r) => r.lastName === "Smith");
    assert(!!smith, "Jane Smith record present (BOM did not corrupt header parsing)");
    assert(
      smith?.externalIdentifier === "SAM-002",
      "Smith.externalIdentifier === 'SAM-002'"
    );
  });

  // Cleanup so we leave the SAM table empty.
  await storage.deleteExclusionRecordsBySource(samSource.id);

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("UNEXPECTED ERROR:", err);
  process.exit(1);
});
