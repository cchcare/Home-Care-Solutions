/**
 * Vitest suite for ExclusionService.mapMedicheckRow().
 *
 * Validates that the MediCheck CSV row mapper correctly handles:
 *   - the legacy FirstName / LastName / NPI / ExclusionDate header layout
 *   - the real PA OMIG layout (NAM_FIRST_PROVR / NAM_LAST_PROVR / IDN_NPI /
 *     LicenseNumber / NBR_FEIN / NAM_BUSNS_MP / BeginDate / EndDate / Status)
 *   - entity-only rows (no person name) -> stored as a business record
 *   - "NULL" / whitespace strings normalized to null
 *   - rows with no recognizable identifying data flagged hasAnyData=false
 *
 * Pure unit test — no DB or network dependencies.
 */

import { describe, expect, it } from "vitest";
import { ExclusionService } from "../exclusion-service";

const svc = ExclusionService.getInstance();
const SOURCE_ID = "test-source-id";

describe("mapMedicheckRow - PA OMIG person row", () => {
  it("maps every PA OMIG column for a person row", () => {
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
    expect(m.hasAnyData).toBe(true);
    expect(m.isEntityOnly).toBe(false);
    expect(m.payload).toMatchObject({
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
    expect(m.payload.exclusionDate?.toISOString().startsWith("2020-05-15")).toBe(true);
  });
});

describe("mapMedicheckRow - PA OMIG entity-only row", () => {
  it("treats a row with no person name as entity-only", () => {
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
    expect(m.hasAnyData).toBe(true);
    expect(m.isEntityOnly).toBe(true);
    expect(m.payload).toMatchObject({
      firstName: null,
      lastName: null,
      businessName: "ACME HOME CARE LLC",
      fein: "99-1111111",
      npi: null,
    });
  });

  it("falls back to ProviderName when NAM_BUSNS_MP is NULL and no person name", () => {
    const row = {
      ProviderName: "CITYWIDE NURSING SERVICES INC",
      LicenseNumber: "BUS-FALLBACK",
      Status: "Active",
      NAM_LAST_PROVR: "  ",
      NAM_FIRST_PROVR: "",
      NAM_BUSNS_MP: "NULL",
    };
    const m = svc.mapMedicheckRow(row, SOURCE_ID);
    expect(m.isEntityOnly).toBe(true);
    expect(m.payload.businessName).toBe("CITYWIDE NURSING SERVICES INC");
  });
});

describe("mapMedicheckRow - legacy header layout", () => {
  it("maps the legacy FirstName / LastName / NPI / ExclusionDate columns", () => {
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
    expect(m.payload).toMatchObject({
      firstName: "Jane",
      lastName: "Smith",
      middleName: "Q",
      npi: "9876543210",
      licenseNumber: "LIC-LEGACY-1",
      state: "NY",
      exclusionType: "Mandatory",
      businessName: "SMITH WELLNESS LLC",
    });
    expect(m.payload.exclusionDate?.toISOString().startsWith("2018-09-01")).toBe(true);
    expect(m.payload.reinstateDate?.toISOString().startsWith("2023-09-01")).toBe(true);
  });
});

describe("mapMedicheckRow - whitespace and NULL normalization", () => {
  it("normalizes 'NULL', 'null', and whitespace-only cells to null", () => {
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
    expect(m.payload).toMatchObject({
      firstName: null,
      lastName: null,
      npi: null,
      licenseNumber: "RN-WS-1",
      businessName: null,
      fein: null,
      exclusionStatus: "Reinstated",
    });
  });
});

describe("mapMedicheckRow - empty row", () => {
  it("flags hasAnyData=false for a fully-NULL row", () => {
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
    expect(m.hasAnyData).toBe(false);
    expect(m.isEntityOnly).toBe(false);
  });
});
