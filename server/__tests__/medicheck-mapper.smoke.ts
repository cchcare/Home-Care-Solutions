/**
 * Standalone smoke test for ExclusionService.mapMedicheckRow().
 *
 * Validates that the MediCheck CSV row mapper correctly handles:
 *   - the legacy FirstName / LastName / NPI / ExclusionDate header layout
 *   - the real PA OMIG layout (NAM_FIRST_PROVR / NAM_LAST_PROVR / IDN_NPI /
 *     LicenseNumber / NBR_FEIN / NAM_BUSNS_MP / BeginDate / EndDate / Status)
 *   - entity-only rows (no person name) → stored as a business record
 *   - "NULL" / whitespace strings normalized to null
 *   - rows with no recognizable identifying data flagged hasAnyData=false
 *
 * No DB or network dependencies. Run with:
 *   npx tsx server/__tests__/medicheck-mapper.smoke.ts
 *
 * Exits non-zero if any assertion fails.
 */

import { ExclusionService } from "../exclusion-service";

const svc = ExclusionService.getInstance();
const SOURCE_ID = "test-source-id";

let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function group(name: string, fn: () => void): void {
  console.log(`\n[${name}]`);
  fn();
}

// ---------------------------------------------------------------------------
// 1. PA OMIG layout — person row with all the new columns
// ---------------------------------------------------------------------------
group("PA OMIG person row", () => {
  const row = {
    ProviderName: "DOE, JOHN A",
    LicenseNumber: "RN12345",
    Status: "Active",
    BeginDate: "2020-05-15",
    EndDate: "NULL",
    CAO: "001",
    NAM_LAST_PROVR: "DOE",
    NAM_FIRST_PROVR: "JOHN",
    NAM_MIDDLE_PROVR: "A",
    NAM_TITLE_PROVR: "MD",
    NAM_SUFFIX_PROVR: "JR",
    NAM_PROVR_ALT: "JOHNNY DOE",
    NAM_BUSNS_MP: "NULL",
    IDN_NPI: "1234567890",
    NBR_FEIN: "12-3456789",
  };
  const m = svc.mapMedicheckRow(row, SOURCE_ID);
  assert(m.hasAnyData, "hasAnyData=true");
  assert(!m.isEntityOnly, "isEntityOnly=false");
  assert(m.payload.firstName === "JOHN", "firstName mapped from NAM_FIRST_PROVR");
  assert(m.payload.lastName === "DOE", "lastName mapped from NAM_LAST_PROVR");
  assert(m.payload.middleName === "A", "middleName mapped from NAM_MIDDLE_PROVR");
  assert(m.payload.title === "MD", "title mapped from NAM_TITLE_PROVR");
  assert(m.payload.suffix === "JR", "suffix mapped from NAM_SUFFIX_PROVR");
  assert(m.payload.aliasName === "JOHNNY DOE", "aliasName mapped from NAM_PROVR_ALT");
  assert(m.payload.npi === "1234567890", "npi mapped from IDN_NPI");
  assert(m.payload.licenseNumber === "RN12345", "licenseNumber mapped");
  assert(m.payload.fein === "12-3456789", "fein mapped from NBR_FEIN");
  assert(m.payload.exclusionStatus === "Active", "exclusionStatus mapped from Status");
  assert(m.payload.businessName === null, "NAM_BUSNS_MP='NULL' normalized to null");
  assert(m.payload.exclusionDate?.toISOString().startsWith("2020-05-15"), "BeginDate parsed");
  assert(m.payload.reinstateDate === null, "EndDate='NULL' normalized to null");
  assert(m.payload.externalIdentifier === "RN12345", "externalIdentifier == licenseNumber");
  assert(m.payload.state === "PA", "state defaults to PA");
});

// ---------------------------------------------------------------------------
// 2. PA OMIG layout — entity-only row (no person name)
// ---------------------------------------------------------------------------
group("PA OMIG entity-only row", () => {
  const row = {
    ProviderName: "ACME HOME CARE LLC",
    LicenseNumber: "BUS-ENT-001",
    Status: "Active",
    BeginDate: "2021-01-01",
    EndDate: "NULL",
    NAM_LAST_PROVR: "NULL",
    NAM_FIRST_PROVR: "NULL",
    NAM_MIDDLE_PROVR: "NULL",
    NAM_BUSNS_MP: "ACME HOME CARE LLC",
    IDN_NPI: "NULL",
    NBR_FEIN: "99-1111111",
  };
  const m = svc.mapMedicheckRow(row, SOURCE_ID);
  assert(m.hasAnyData, "hasAnyData=true");
  assert(m.isEntityOnly, "isEntityOnly=true (no person name)");
  assert(m.payload.firstName === null, "firstName null");
  assert(m.payload.lastName === null, "lastName null");
  assert(m.payload.businessName === "ACME HOME CARE LLC", "businessName from NAM_BUSNS_MP");
  assert(m.payload.fein === "99-1111111", "fein mapped");
  assert(m.payload.npi === null, "npi null after NULL normalization");
});

// ---------------------------------------------------------------------------
// 3. PA OMIG entity-only with no NAM_BUSNS_MP — falls back to ProviderName
// ---------------------------------------------------------------------------
group("PA OMIG entity-only fallback to ProviderName", () => {
  const row = {
    ProviderName: "CITYWIDE NURSING SERVICES INC",
    LicenseNumber: "BUS-FALLBACK",
    Status: "Active",
    NAM_LAST_PROVR: "  ",
    NAM_FIRST_PROVR: "",
    NAM_BUSNS_MP: "NULL",
  };
  const m = svc.mapMedicheckRow(row, SOURCE_ID);
  assert(m.isEntityOnly, "isEntityOnly=true");
  assert(
    m.payload.businessName === "CITYWIDE NURSING SERVICES INC",
    "businessName falls back to ProviderName when NAM_BUSNS_MP is NULL and there is no person name"
  );
});

// ---------------------------------------------------------------------------
// 4. Legacy header layout still works
// ---------------------------------------------------------------------------
group("Legacy headers still supported", () => {
  const row = {
    FirstName: "Jane",
    LastName: "Smith",
    MiddleName: "Q",
    NPI: "9876543210",
    "License Number": "LIC-LEGACY-1",
    State: "NY",
    ExclusionDate: "2018-09-01",
    ReinstateDate: "2023-09-01",
    ExclusionType: "Mandatory",
    BusinessName: "SMITH WELLNESS LLC",
  };
  const m = svc.mapMedicheckRow(row, SOURCE_ID);
  assert(m.payload.firstName === "Jane", "firstName from FirstName");
  assert(m.payload.lastName === "Smith", "lastName from LastName");
  assert(m.payload.middleName === "Q", "middleName from MiddleName");
  assert(m.payload.npi === "9876543210", "npi from NPI");
  assert(m.payload.licenseNumber === "LIC-LEGACY-1", "licenseNumber from License Number");
  assert(m.payload.state === "NY", "state from State (no PA default)");
  assert(m.payload.exclusionType === "Mandatory", "exclusionType from ExclusionType");
  assert(m.payload.exclusionDate?.toISOString().startsWith("2018-09-01"), "ExclusionDate parsed");
  assert(m.payload.reinstateDate?.toISOString().startsWith("2023-09-01"), "ReinstateDate parsed");
  assert(m.payload.businessName === "SMITH WELLNESS LLC", "businessName from BusinessName even when person name present");
});

// ---------------------------------------------------------------------------
// 5. Whitespace and "NULL" normalization
// ---------------------------------------------------------------------------
group("Whitespace + NULL normalization", () => {
  const row = {
    NAM_FIRST_PROVR: "   ",
    NAM_LAST_PROVR: "Null",
    IDN_NPI: "  null  ",
    LicenseNumber: "\tRN-WS-1\t",
    NAM_BUSNS_MP: "",
    NBR_FEIN: "NULL",
    Status: "  Reinstated  ",
  };
  const m = svc.mapMedicheckRow(row, SOURCE_ID);
  assert(m.payload.firstName === null, "whitespace-only -> null");
  assert(m.payload.lastName === null, "'Null' (mixed case) -> null");
  assert(m.payload.npi === null, "'  null  ' -> null");
  assert(m.payload.licenseNumber === "RN-WS-1", "tabs trimmed from licenseNumber");
  assert(m.payload.businessName === null, "empty string -> null");
  assert(m.payload.fein === null, "'NULL' -> null");
  assert(m.payload.exclusionStatus === "Reinstated", "Status trimmed");
});

// ---------------------------------------------------------------------------
// 6. Truly empty row → hasAnyData=false (will be skipped by importer)
// ---------------------------------------------------------------------------
group("Empty row dropped", () => {
  const row = {
    NAM_FIRST_PROVR: "NULL",
    NAM_LAST_PROVR: "NULL",
    NAM_BUSNS_MP: "NULL",
    IDN_NPI: "NULL",
    LicenseNumber: "",
    NBR_FEIN: "NULL",
    ProviderName: "  ",
  };
  const m = svc.mapMedicheckRow(row, SOURCE_ID);
  assert(!m.hasAnyData, "hasAnyData=false for fully-NULL row");
  assert(!m.isEntityOnly, "isEntityOnly=false when there is no business name either");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
process.exit(0);
