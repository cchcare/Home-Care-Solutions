/**
 * Vitest suite for ExclusionService.checkCaregiverAgainstExclusions() — Task #71
 * License Number / NPI identifier matching.
 *
 * Verifies:
 *   - NPI identifier match returns score 100 with matchReason='npi'
 *   - License number identifier match returns score 100 with
 *     matchReason='license_number'
 *   - NPI normalization strips non-digits before comparing
 *   - License match is case-insensitive and trim-tolerant
 *   - Identifier match suppresses a duplicate name match for the same record
 *   - Name-only fuzzy match still works for caregivers with no NPI/license
 *   - matchSignature includes the matchReason so a name false-positive does
 *     not suppress a later identifier match for the same caregiver/record
 *
 * Storage is mocked in-memory via vi.mock; no DB or network access.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../storage", () => {
  return {
    storage: {
      getCaregiverFalsePositives: vi.fn(),
      getExclusionRecordsByNpi: vi.fn(),
      getExclusionRecordsByLicenseNumbers: vi.fn(),
      getExclusionRecordsByName: vi.fn(),
      searchExclusionRecords: vi.fn(),
    },
  };
});

import type {
  ExclusionRecord,
  CaregiverExclusionFalsePositive,
} from "@shared/schema";
import { ExclusionService } from "../exclusion-service";
import { storage } from "../storage";

const svc = ExclusionService.getInstance();

const SOURCE_OIG = "src-oig";
const SOURCE_MEDI = "src-medi";

function rec(partial: Partial<ExclusionRecord>): ExclusionRecord {
  const base: ExclusionRecord = {
    id: `rec-${Math.random().toString(36).slice(2, 8)}`,
    sourceId: SOURCE_MEDI,
    externalIdentifier: null,
    firstName: null,
    lastName: null,
    middleName: null,
    businessName: null,
    npi: null,
    upin: null,
    licenseNumber: null,
    fein: null,
    address: null,
    city: null,
    state: null,
    zipCode: null,
    exclusionType: null,
    exclusionDate: null,
    reinstateDate: null,
    waiverDate: null,
    specialty: null,
    general: null,
    rawPayload: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...base, ...partial };
}

type Stub = {
  records: ExclusionRecord[];
  fps: CaregiverExclusionFalsePositive[];
};

const stub: Stub = { records: [], fps: [] };

interface MockedStorage {
  getCaregiverFalsePositives: ReturnType<typeof vi.fn>;
  getExclusionRecordsByNpi: ReturnType<typeof vi.fn>;
  getExclusionRecordsByLicenseNumbers: ReturnType<typeof vi.fn>;
  getExclusionRecordsByName: ReturnType<typeof vi.fn>;
  searchExclusionRecords: ReturnType<typeof vi.fn>;
}

const mockedStorage = storage as unknown as MockedStorage;

mockedStorage.getCaregiverFalsePositives.mockImplementation(
  async (caregiverId: string) =>
    stub.fps.filter((fp) => fp.caregiverId === caregiverId),
);

mockedStorage.getExclusionRecordsByNpi.mockImplementation(async (npi: string) => {
  const digits = (npi || "").replace(/\D/g, "");
  if (!digits) return [];
  return stub.records.filter(
    (r) => r.isActive && (r.npi || "").replace(/\D/g, "") === digits,
  );
});

mockedStorage.getExclusionRecordsByLicenseNumbers.mockImplementation(
  async (numbers: string[]) => {
    const norm = new Set(
      numbers.map((n) => (n || "").trim().toLowerCase()).filter(Boolean),
    );
    if (norm.size === 0) return [];
    return stub.records.filter(
      (r) =>
        r.isActive &&
        !!r.licenseNumber &&
        norm.has(r.licenseNumber.trim().toLowerCase()),
    );
  },
);

mockedStorage.getExclusionRecordsByName.mockImplementation(
  async (lastName: string, firstName?: string) => {
    const ln = lastName.toLowerCase();
    const fn = firstName?.toLowerCase();
    return stub.records.filter(
      (r) =>
        r.isActive &&
        (r.lastName || "").toLowerCase() === ln &&
        (fn == null || (r.firstName || "").toLowerCase() === fn),
    );
  },
);

mockedStorage.searchExclusionRecords.mockImplementation(
  async (lastName: string, firstName?: string) => {
    const ln = lastName.toLowerCase();
    const fn = firstName?.toLowerCase();
    return stub.records.filter(
      (r) =>
        r.isActive &&
        (r.lastName || "").toLowerCase().includes(ln) &&
        (fn == null || (r.firstName || "").toLowerCase().includes(fn)),
    );
  },
);

function fp(
  caregiverId: string,
  matchSignature: string,
  sourceId: string = SOURCE_OIG,
): CaregiverExclusionFalsePositive {
  return {
    id: `fp-${Math.random().toString(36).slice(2, 8)}`,
    caregiverId,
    sourceId,
    exclusionRecordId: null,
    matchSignature,
    reason: null,
    createdBy: null,
    createdAt: new Date(),
  };
}

beforeEach(() => {
  stub.records = [];
  stub.fps = [];
});

describe("checkCaregiverAgainstExclusions - NPI identifier match", () => {
  it("returns a single NPI match with score 100", async () => {
    stub.records = [
      rec({
        id: "r-npi",
        sourceId: SOURCE_MEDI,
        firstName: "Jadan",
        lastName: "Abbassi",
        npi: "1194807255",
      }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cg1",
      "Totally",
      "Different",
      null,
      "1194807255",
      [],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      matchReason: "npi",
      matchScore: 100,
      matchType: "exact",
      matchedIdentifier: "1194807255",
      exclusionRecordId: "r-npi",
    });
  });

  it("normalizes NPI by stripping non-digits before comparing", async () => {
    stub.records = [
      rec({ id: "r1", npi: "10-43343-569", firstName: "X", lastName: "Y" }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cg2",
      "X",
      "Y",
      null,
      "1043343569",
      [],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchReason).toBe("npi");
  });
});

describe("checkCaregiverAgainstExclusions - license number identifier match", () => {
  it("matches case-insensitively and preserves original casing", async () => {
    stub.records = [
      rec({
        id: "r-lic",
        sourceId: SOURCE_MEDI,
        firstName: "Earl",
        lastName: "Kempton",
        licenseNumber: "RN12345",
      }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cg3",
      "Wrong",
      "Name",
      null,
      null,
      ["rn12345"],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      matchReason: "license_number",
      matchScore: 100,
      matchedIdentifier: "RN12345",
    });
  });

  it("handles whitespace and multiple licenses", async () => {
    stub.records = [
      rec({
        id: "r-lic2",
        firstName: "F",
        lastName: "L",
        licenseNumber: "PN006753L",
      }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cg4",
      "F",
      "L",
      null,
      null,
      ["  CNA-99  ", " pn006753l "],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].exclusionRecordId).toBe("r-lic2");
  });
});

describe("checkCaregiverAgainstExclusions - dedupe and combined identifiers", () => {
  it("dedupes name match against the same record's identifier match", async () => {
    stub.records = [
      rec({
        id: "r-dup",
        firstName: "Maria",
        lastName: "Smith",
        npi: "1234567890",
      }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cg5",
      "Maria",
      "Smith",
      null,
      "1234567890",
      [],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchReason).toBe("npi");
  });

  it("returns three flags when NPI, license, and name hit different records", async () => {
    stub.records = [
      rec({ id: "r-by-npi", firstName: "A1", lastName: "B1", npi: "1234567890" }),
      rec({ id: "r-by-lic", firstName: "A2", lastName: "B2", licenseNumber: "RN12345" }),
      rec({ id: "r-by-name", firstName: "Cara", lastName: "Giver" }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cg6",
      "Cara",
      "Giver",
      null,
      "1234567890",
      ["RN12345"],
    );
    expect(matches).toHaveLength(3);
    const byReason = Object.fromEntries(matches.map((m) => [m.matchReason, m]));
    expect(byReason.npi?.matchScore).toBe(100);
    expect(byReason.license_number?.matchScore).toBe(100);
    expect(byReason.name_exact?.matchScore).toBe(100);
  });
});

describe("checkCaregiverAgainstExclusions - name-only fuzzy match", () => {
  it("still flags fuzzy name matches when no identifiers are present", async () => {
    stub.records = [
      rec({ id: "r-fuzz", firstName: "Maria", lastName: "Smith" }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cgF",
      "Maria",
      "Smit",
      null,
      null,
      [],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchReason).toBe("name_fuzzy");
    expect(matches[0].matchScore).toBeGreaterThanOrEqual(80);
    expect(matches[0].matchScore).toBeLessThan(100);
  });
});

describe("checkCaregiverAgainstExclusions - false-positive signature gating", () => {
  it("name-exact and NPI signatures differ, so name FP does not suppress NPI hit", async () => {
    stub.records = [
      rec({
        id: "r-fp",
        firstName: "Maria",
        lastName: "Smith",
        npi: "9999999999",
      }),
    ];
    const nameSig = svc.generateMatchSignature(
      "cgFP",
      SOURCE_MEDI,
      "Maria",
      "Smith",
      "name_exact",
      null,
    );
    const npiSig = svc.generateMatchSignature(
      "cgFP",
      SOURCE_MEDI,
      "Maria",
      "Smith",
      "npi",
      "9999999999",
    );
    expect(nameSig).not.toBe(npiSig);

    stub.fps.push(fp("cgFP", nameSig, SOURCE_MEDI));

    const matches = await svc.checkCaregiverAgainstExclusions(
      "cgFP",
      "Maria",
      "Smith",
      null,
      "9999999999",
      [],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchReason).toBe("npi");
  });

  it("returns no matches when caregiver has neither identifiers nor name hits", async () => {
    stub.records = [
      rec({ id: "r-empty", firstName: "F", lastName: "L", npi: "1111111111" }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cgN",
      "Different",
      "Person",
      null,
      "",
      [],
    );
    expect(matches).toHaveLength(0);
  });
});

describe("generateMatchSignature - reason + identifier disambiguation", () => {
  it("produces distinct signatures for different identifiers and reasons", () => {
    const a = svc.generateMatchSignature("c", "s", "F", "L", "npi", "1");
    const b = svc.generateMatchSignature("c", "s", "F", "L", "npi", "2");
    const c = svc.generateMatchSignature("c", "s", "F", "L", "license_number", "1");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("checkCaregiverAgainstExclusions - legacy FP signatures", () => {
  it("legacy name FP still suppresses a new name_exact match (regression)", async () => {
    stub.records = [
      rec({ id: "r-leg", firstName: "John", lastName: "Doe", sourceId: "src-A" }),
    ];
    const legacy = svc.generateLegacyMatchSignature("cgL", "src-A", "John", "Doe");
    stub.fps = [fp("cgL", legacy, "src-A")];

    const matches = await svc.checkCaregiverAgainstExclusions(
      "cgL",
      "John",
      "Doe",
      null,
      null,
      [],
    );
    expect(matches).toHaveLength(0);
  });

  it("legacy name FP does NOT suppress NPI or license identifier matches", async () => {
    stub.records = [
      rec({
        id: "r-leg2",
        firstName: "John",
        lastName: "Doe",
        sourceId: "src-B",
        npi: "1112223333",
        licenseNumber: "RN-LEG-1",
      }),
    ];
    const legacy = svc.generateLegacyMatchSignature("cgL2", "src-B", "John", "Doe");
    stub.fps = [fp("cgL2", legacy, "src-B")];

    const matchesNpi = await svc.checkCaregiverAgainstExclusions(
      "cgL2",
      "John",
      "Doe",
      null,
      "1112223333",
      [],
    );
    expect(matchesNpi).toHaveLength(1);
    expect(matchesNpi[0].matchReason).toBe("npi");

    const matchesLic = await svc.checkCaregiverAgainstExclusions(
      "cgL2",
      "John",
      "Doe",
      null,
      null,
      ["RN-LEG-1"],
    );
    expect(matchesLic).toHaveLength(1);
    expect(matchesLic[0].matchReason).toBe("license_number");
  });
});
