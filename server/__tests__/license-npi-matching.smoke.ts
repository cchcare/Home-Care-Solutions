/**
 * Smoke test for ExclusionService.checkCaregiverAgainstExclusions() — Task #71
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
 * Storage is monkey-patched in-memory; no DB or network access.
 *
 *   npx tsx server/__tests__/license-npi-matching.smoke.ts
 *
 * Exits non-zero if any assertion fails.
 */

import { ExclusionService } from "../exclusion-service";
import { storage, type IStorage } from "../storage";
import type {
  ExclusionRecord,
  CaregiverExclusionFalsePositive,
} from "@shared/schema";

const svc = ExclusionService.getInstance();

let passed = 0;
let failed = 0;

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function group(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n[${name}]`);
  return Promise.resolve(fn());
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Storage stub
// ---------------------------------------------------------------------------
type Stub = {
  records: ExclusionRecord[];
  fps: CaregiverExclusionFalsePositive[];
};

const stub: Stub = { records: [], fps: [] };

// Strongly-typed override surface — only the IStorage methods the
// matcher actually calls. Each impl matches the real IStorage signature.
type ExclusionStorageOverrides = Pick<
  IStorage,
  | "getCaregiverFalsePositives"
  | "getExclusionRecordsByNpi"
  | "getExclusionRecordsByLicenseNumbers"
  | "getExclusionRecordsByName"
  | "searchExclusionRecords"
>;

const overrides: ExclusionStorageOverrides = {
  getCaregiverFalsePositives: async (caregiverId) =>
    stub.fps.filter((fp) => fp.caregiverId === caregiverId),

  getExclusionRecordsByNpi: async (npi) => {
    const digits = (npi || "").replace(/\D/g, "");
    if (!digits) return [];
    return stub.records.filter(
      (r) => r.isActive && (r.npi || "").replace(/\D/g, "") === digits,
    );
  },

  getExclusionRecordsByLicenseNumbers: async (numbers) => {
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

  getExclusionRecordsByName: async (lastName, firstName) => {
    const ln = lastName.toLowerCase();
    const fn = firstName?.toLowerCase();
    return stub.records.filter(
      (r) =>
        r.isActive &&
        (r.lastName || "").toLowerCase() === ln &&
        (fn == null || (r.firstName || "").toLowerCase() === fn),
    );
  },

  searchExclusionRecords: async (lastName, firstName) => {
    const ln = lastName.toLowerCase();
    const fn = firstName?.toLowerCase();
    return stub.records.filter(
      (r) =>
        r.isActive &&
        (r.lastName || "").toLowerCase().includes(ln) &&
        (fn == null || (r.firstName || "").toLowerCase().includes(fn)),
    );
  },
};

// Install typed overrides onto the real storage singleton. Using
// Object.assign keeps both source and target typed — no `any` escapes.
Object.assign<IStorage, ExclusionStorageOverrides>(storage, overrides);

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

function reset(): void {
  stub.records = [];
  stub.fps = [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  await group("NPI identifier match", async () => {
    reset();
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
    assert(matches.length === 1, "exactly one NPI match");
    assert(matches[0].matchReason === "npi", "matchReason='npi'");
    assert(matches[0].matchScore === 100, "score 100 for NPI hit");
    assert(matches[0].matchType === "exact", "matchType='exact'");
    assert(
      matches[0].matchedIdentifier === "1194807255",
      "matchedIdentifier carries the NPI",
    );
    assert(matches[0].exclusionRecordId === "r-npi", "correct record id");
  });

  await group("NPI normalization (strips non-digits)", async () => {
    reset();
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
    assert(matches.length === 1, "matched despite punctuation in stored NPI");
    assert(matches[0].matchReason === "npi", "still NPI reason");
  });

  await group("License number identifier match", async () => {
    reset();
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
      ["rn12345"], // lowercase to test case-insensitivity
    );
    assert(matches.length === 1, "exactly one license match");
    assert(
      matches[0].matchReason === "license_number",
      "matchReason='license_number'",
    );
    assert(matches[0].matchScore === 100, "score 100 for license hit");
    assert(
      matches[0].matchedIdentifier === "RN12345",
      "matchedIdentifier preserves original casing",
    );
  });

  await group("License match handles whitespace + multiple licenses", async () => {
    reset();
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
      ["  CNA-99  ", " pn006753l "], // multiple, with whitespace
    );
    assert(matches.length === 1, "one license match across multi-license set");
    assert(matches[0].exclusionRecordId === "r-lic2", "correct record");
  });

  await group(
    "Identifier match dedupes against same-record name match",
    async () => {
      reset();
      // Same record matches by NPI AND by name
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
      assert(matches.length === 1, "single match (no double-flag)");
      assert(
        matches[0].matchReason === "npi",
        "preferred reason is NPI (ran first)",
      );
    },
  );

  await group(
    "Three-way fixture: NPI, license, name-only on different records",
    async () => {
      reset();
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
      assert(matches.length === 3, "three flags total");
      const byReason = Object.fromEntries(matches.map((m) => [m.matchReason, m]));
      assert(byReason.npi?.matchScore === 100, "NPI flag score=100");
      assert(byReason.license_number?.matchScore === 100, "license flag score=100");
      assert(byReason.name_exact?.matchScore === 100, "name-exact flag score=100");
    },
  );

  await group("Name-only fuzzy still works without identifiers", async () => {
    reset();
    // searchExclusionRecords uses LIKE %lastName% so the record's lastname
    // must contain the query lastname as a substring. Use matching last names
    // and a 1-char first-name diff to land in the fuzzy band.
    stub.records = [
      rec({ id: "r-fuzz", firstName: "Maria", lastName: "Smith" }),
    ];
    const matches = await svc.checkCaregiverAgainstExclusions(
      "cgF",
      "Maria",
      "Smit", // substring of "Smith" so the LIKE-search returns the record;
              // Levenshtein then scores 4/5 = 80% on lastname, 100% on
              // firstname → 90% avg, in fuzzy band.
      null,
      null,
      [],
    );
    assert(matches.length === 1, "one fuzzy match");
    assert(matches[0].matchReason === "name_fuzzy", "matchReason='name_fuzzy'");
    assert(
      matches[0].matchScore < 100 && matches[0].matchScore >= 80,
      "score in fuzzy band (80-99)",
    );
  });

  await group("False-positive signature gates by matchReason", async () => {
    reset();
    stub.records = [
      rec({
        id: "r-fp",
        firstName: "Maria",
        lastName: "Smith",
        npi: "9999999999",
      }),
    ];
    // User previously dismissed the name match -> FP signature with no
    // matchReason. The new signature for an NPI hit must NOT collide.
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
    assert(nameSig !== npiSig, "name-exact and NPI signatures differ");
    stub.fps.push(fp("cgFP", nameSig, SOURCE_MEDI));

    const matches = await svc.checkCaregiverAgainstExclusions(
      "cgFP",
      "Maria",
      "Smith",
      null,
      "9999999999",
      [],
    );
    assert(matches.length === 1, "still flags via NPI even though name was FP");
    assert(matches[0].matchReason === "npi", "NPI takes precedence over FP'd name");
  });

  await group("Empty NPI / no licenses → no identifier hits", async () => {
    reset();
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
    assert(matches.length === 0, "no false matches when caregiver lacks identifiers");
  });

  await group("matchSignature includes reason+identifier", () => {
    const a = svc.generateMatchSignature("c", "s", "F", "L", "npi", "1");
    const b = svc.generateMatchSignature("c", "s", "F", "L", "npi", "2");
    const c = svc.generateMatchSignature("c", "s", "F", "L", "license_number", "1");
    assert(a !== b, "different NPI values produce different signatures");
    assert(a !== c, "different reasons produce different signatures");
  });

  await group("Legacy FP signature suppresses name match (regression)", async () => {
    reset();
    stub.records = [
      rec({ id: "r-leg", firstName: "John", lastName: "Doe", sourceId: "src-A" }),
    ];
    // Pre-Task-#71 false positive (4-part legacy signature, no reason suffix).
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
    assert(matches.length === 0, "legacy name FP suppresses new name_exact match");
  });

  await group("Legacy FP signature does NOT suppress identifier (NPI/license) match", async () => {
    reset();
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

    // NPI match should fire despite legacy name dismissal — identifier
    // semantics are stronger than a prior name-only FP decision.
    const matchesNpi = await svc.checkCaregiverAgainstExclusions(
      "cgL2",
      "John",
      "Doe",
      null,
      "1112223333",
      [],
    );
    assert(matchesNpi.length === 1, "legacy name FP does not suppress NPI hit");
    assert(matchesNpi[0].matchReason === "npi", "match reason is npi");

    // License match also wins over a legacy name FP.
    const matchesLic = await svc.checkCaregiverAgainstExclusions(
      "cgL2",
      "John",
      "Doe",
      null,
      null,
      ["RN-LEG-1"],
    );
    assert(matchesLic.length === 1, "legacy name FP does not suppress license hit");
    assert(
      matchesLic[0].matchReason === "license_number",
      "match reason is license_number",
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
