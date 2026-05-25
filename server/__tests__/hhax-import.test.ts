/**
 * Vitest suite for the HHAeXchange importer — Task #112.
 *
 * After the recent rewrite (header normalization, file-kind picking,
 * schedule linkage by AdmissionID OR PatientCode, dry-run mode) there were
 * no automated tests. This suite locks in the edge cases most likely to
 * regress quietly:
 *
 *   1. Header normalization across formats (PascalCase, snake_case, spaces,
 *      lowercase) and across aliases, with explicit coverage of the
 *      `State` (address) vs `Status` alias collision that caused a silent
 *      data-corruption bug.
 *   2. Filename matching for the three file kinds.
 *   3. Schedule importer linking clients by AdmissionID OR PatientCode.
 *   4. dryRun option performs ZERO destructive storage writes.
 *
 * The storage layer is mocked so the suite has no DB dependency.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// HhaxSftpService construction reads env vars eagerly, so set them BEFORE
// the module is loaded. The test never opens a real SFTP connection.
process.env.HHAX_SFTP_HOST = "test.example.com";
process.env.HHAX_SFTP_PORT = "2222";
process.env.HHAX_SFTP_USERNAME = "test-user";
process.env.HHAX_SFTP_PASSWORD = "test-pass";
process.env.HHAX_TAX_ID = "00-0000000";

// ---------------------------------------------------------------------------
// Mock the storage module. Each test resets/overrides as needed.
// ---------------------------------------------------------------------------
const storageMock = {
  getHhaxOfficeMappings: vi.fn(async () => [] as any[]),
  getCaregiverByHhaxCode: vi.fn(async (_code: string) => undefined as any),
  getClientByHhaxAdmissionId: vi.fn(async (_id: string) => undefined as any),
  getClientByHhaxPatientCode: vi.fn(async (_code: string) => undefined as any),
  createCaregiver: vi.fn(async (data: any) => ({ id: "cg-new", ...data })),
  updateCaregiver: vi.fn(async (id: string, data: any) => ({ id, ...data })),
  createClient: vi.fn(async (data: any) => ({ id: "cl-new", ...data })),
  updateClient: vi.fn(async (id: string, data: any) => ({ id, ...data })),
  createSchedule: vi.fn(async (data: any) => ({ id: "sch-new", ...data })),
};

vi.mock("../storage", () => ({
  storage: storageMock,
}));

let canonicalizeHeader: typeof import("../hhax-sftp-service").canonicalizeHeader;
let normalizeRecord: typeof import("../hhax-sftp-service").normalizeRecord;
let pickFileForKind: typeof import("../hhax-sftp-service").pickFileForKind;
let CAREGIVER_HEADER_ALIASES: typeof import("../hhax-sftp-service").CAREGIVER_HEADER_ALIASES;
let PATIENT_HEADER_ALIASES: typeof import("../hhax-sftp-service").PATIENT_HEADER_ALIASES;
let SCHEDULE_HEADER_ALIASES: typeof import("../hhax-sftp-service").SCHEDULE_HEADER_ALIASES;
let HhaxSftpService: typeof import("../hhax-sftp-service").HhaxSftpService;

beforeAll(async () => {
  const mod = await import("../hhax-sftp-service");
  canonicalizeHeader = mod.canonicalizeHeader;
  normalizeRecord = mod.normalizeRecord;
  pickFileForKind = mod.pickFileForKind;
  CAREGIVER_HEADER_ALIASES = mod.CAREGIVER_HEADER_ALIASES;
  PATIENT_HEADER_ALIASES = mod.PATIENT_HEADER_ALIASES;
  SCHEDULE_HEADER_ALIASES = mod.SCHEDULE_HEADER_ALIASES;
  HhaxSftpService = mod.HhaxSftpService;
});

beforeEach(() => {
  for (const fn of Object.values(storageMock)) fn.mockClear();
  storageMock.getHhaxOfficeMappings.mockResolvedValue([]);
  storageMock.getCaregiverByHhaxCode.mockResolvedValue(undefined);
  storageMock.getClientByHhaxAdmissionId.mockResolvedValue(undefined);
  storageMock.getClientByHhaxPatientCode.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// canonicalizeHeader
// ---------------------------------------------------------------------------
describe("canonicalizeHeader", () => {
  it("lowercases and strips non-alnum characters", () => {
    expect(canonicalizeHeader("Caregiver Code")).toBe("caregivercode");
    expect(canonicalizeHeader("caregiver_code")).toBe("caregivercode");
    expect(canonicalizeHeader("CAREGIVER-CODE!")).toBe("caregivercode");
    expect(canonicalizeHeader("Date of Birth")).toBe("dateofbirth");
  });
});

// ---------------------------------------------------------------------------
// normalizeRecord
// ---------------------------------------------------------------------------
describe("normalizeRecord", () => {
  it("normalizes PascalCase headers (canonical form)", () => {
    const { normalized, unknownHeaders } = normalizeRecord<any>(
      {
        CaregiverCode: "C1",
        FirstName: "Jane",
        LastName: "Doe",
      },
      CAREGIVER_HEADER_ALIASES,
    );
    expect(normalized.CaregiverCode).toBe("C1");
    expect(normalized.FirstName).toBe("Jane");
    expect(normalized.LastName).toBe("Doe");
    expect(unknownHeaders).toEqual([]);
  });

  it("normalizes snake_case, lowercase, and spaced headers", () => {
    const { normalized, unknownHeaders } = normalizeRecord<any>(
      {
        caregiver_code: "C2",
        "first name": "Sam",
        LASTNAME: "Smith",
        "date of birth": "1990-01-02",
      },
      CAREGIVER_HEADER_ALIASES,
    );
    expect(normalized.CaregiverCode).toBe("C2");
    expect(normalized.FirstName).toBe("Sam");
    expect(normalized.LastName).toBe("Smith");
    expect(normalized.DateOfBirth).toBe("1990-01-02");
    expect(unknownHeaders).toEqual([]);
  });

  it("resolves aliases (employeeId -> CaregiverCode, dob -> DateOfBirth)", () => {
    const { normalized } = normalizeRecord<any>(
      {
        EmployeeID: "EMP-9",
        givenName: "Pat",
        Surname: "Lee",
        DOB: "1985-05-05",
      },
      CAREGIVER_HEADER_ALIASES,
    );
    expect(normalized.CaregiverCode).toBe("EMP-9");
    expect(normalized.FirstName).toBe("Pat");
    expect(normalized.LastName).toBe("Lee");
    expect(normalized.DateOfBirth).toBe("1985-05-05");
  });

  it("does NOT let 'Status' aliases overwrite 'State' (address) — the alias-collision bug", () => {
    // The bug we are guarding against: an earlier draft included 'state' as
    // an alias of Status, which silently overwrote the address State field
    // with the employment status during import.
    const { normalized } = normalizeRecord<any>(
      {
        CaregiverCode: "C3",
        FirstName: "A",
        LastName: "B",
        State: "PA", // address state
        Status: "Active",
      },
      CAREGIVER_HEADER_ALIASES,
    );
    expect(normalized.State).toBe("PA");
    expect(normalized.Status).toBe("Active");
  });

  it("reports unknown headers and ignores empty header keys", () => {
    const { normalized, unknownHeaders } = normalizeRecord<any>(
      {
        CaregiverCode: "C4",
        WeirdCustomField: "x",
        "": "blank-key-should-be-skipped",
      },
      CAREGIVER_HEADER_ALIASES,
    );
    expect(normalized.CaregiverCode).toBe("C4");
    expect(unknownHeaders).toEqual(["WeirdCustomField"]);
  });

  it("trims string values and coerces non-strings", () => {
    const { normalized } = normalizeRecord<any>(
      { CaregiverCode: "  C5  ", FirstName: 42 as unknown as string },
      CAREGIVER_HEADER_ALIASES,
    );
    expect(normalized.CaregiverCode).toBe("C5");
    expect(normalized.FirstName).toBe("42");
  });

  it("does not overwrite an existing value with a later empty value", () => {
    // Two headers map to the same canonical field; the second is blank.
    // The first non-empty value should win.
    const { normalized } = normalizeRecord<any>(
      { CaregiverCode: "C6", CaregiverID: "" },
      CAREGIVER_HEADER_ALIASES,
    );
    expect(normalized.CaregiverCode).toBe("C6");
  });
});

// ---------------------------------------------------------------------------
// pickFileForKind
// ---------------------------------------------------------------------------
describe("pickFileForKind", () => {
  const f = (name: string, hoursAgo = 0) => ({
    name,
    size: 100,
    modifyTime: new Date(Date.now() - hoursAgo * 3600_000),
  });

  it("picks caregiver-like names (Aide_Export.csv, employee.csv, staff.csv)", () => {
    const files = [
      f("Aide_Export.csv"),
      f("Patient_Export.csv"),
      f("Schedule_Export.csv"),
    ];
    expect(pickFileForKind(files, "caregiver")?.name).toBe("Aide_Export.csv");
    expect(
      pickFileForKind([f("employee_dump.csv")], "caregiver")?.name,
    ).toBe("employee_dump.csv");
    expect(pickFileForKind([f("staff.csv")], "caregiver")?.name).toBe("staff.csv");
  });

  it("picks patient/client-like names (member.csv, Admission_*.csv)", () => {
    expect(pickFileForKind([f("ClientList.csv")], "patient")?.name).toBe("ClientList.csv");
    expect(pickFileForKind([f("member_export.csv")], "patient")?.name).toBe("member_export.csv");
    expect(pickFileForKind([f("Admission_2024.csv")], "patient")?.name).toBe(
      "Admission_2024.csv",
    );
  });

  it("picks schedule-like names (visit.csv, shift.csv, authorization.csv)", () => {
    expect(pickFileForKind([f("Visit_Export.csv")], "schedule")?.name).toBe(
      "Visit_Export.csv",
    );
    expect(pickFileForKind([f("shifts.csv")], "schedule")?.name).toBe("shifts.csv");
    expect(pickFileForKind([f("authorizations.csv")], "schedule")?.name).toBe(
      "authorizations.csv",
    );
  });

  it("returns the most recently modified match when several are candidates", () => {
    const files = [
      f("Caregiver_OLD.csv", 48),
      f("Caregiver_NEW.csv", 1),
      f("Caregiver_MID.csv", 12),
    ];
    expect(pickFileForKind(files, "caregiver")?.name).toBe("Caregiver_NEW.csv");
  });

  it("returns null when nothing matches", () => {
    expect(pickFileForKind([f("random.csv")], "caregiver")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(pickFileForKind([f("AIDE_EXPORT.CSV")], "caregiver")?.name).toBe(
      "AIDE_EXPORT.CSV",
    );
  });
});

// ---------------------------------------------------------------------------
// Importers via buffer (no SFTP) — focuses on dryRun + schedule linkage.
// ---------------------------------------------------------------------------
describe("importSchedules — links by AdmissionID OR PatientCode", () => {
  it("links a schedule row that has ONLY AdmissionID (no PatientCode)", async () => {
    storageMock.getClientByHhaxAdmissionId.mockImplementation(async (id: string) =>
      id === "ADM-1" ? ({ id: "client-1", officeId: "office-1" } as any) : undefined,
    );
    storageMock.getCaregiverByHhaxCode.mockResolvedValue({ id: "cg-1" } as any);

    const csv =
      "ScheduleID,AdmissionID,CaregiverCode,ScheduleDate,StartTime,EndTime\n" +
      "SCH-1,ADM-1,C-1,2025-06-01,09:00,17:00\n";

    const svc = new HhaxSftpService();
    const res = await svc.importSchedules({ buffer: Buffer.from(csv) });

    expect(res.recordsTotal).toBe(1);
    expect(res.recordsCreated).toBe(1);
    expect(res.recordsSkipped).toBe(0);
    expect(storageMock.createSchedule).toHaveBeenCalledTimes(1);
    expect(storageMock.createSchedule.mock.calls[0][0]).toMatchObject({
      clientId: "client-1",
      caregiverId: "cg-1",
    });
  });

  it("links a schedule row that has ONLY PatientCode (no AdmissionID)", async () => {
    storageMock.getClientByHhaxPatientCode.mockImplementation(async (code: string) =>
      code === "PAT-9" ? ({ id: "client-9", officeId: "office-2" } as any) : undefined,
    );
    storageMock.getCaregiverByHhaxCode.mockResolvedValue({ id: "cg-9" } as any);

    const csv =
      "ScheduleID,PatientCode,CaregiverCode,ScheduleDate,StartTime,EndTime\n" +
      "SCH-9,PAT-9,C-9,2025-06-02,08:00,16:00\n";

    const svc = new HhaxSftpService();
    const res = await svc.importSchedules({ buffer: Buffer.from(csv) });

    expect(res.recordsTotal).toBe(1);
    expect(res.recordsCreated).toBe(1);
    expect(res.recordsSkipped).toBe(0);
    // We never had an AdmissionID, so that lookup should not have been called.
    expect(storageMock.getClientByHhaxAdmissionId).not.toHaveBeenCalled();
    expect(storageMock.getClientByHhaxPatientCode).toHaveBeenCalledWith("PAT-9");
    expect(storageMock.createSchedule.mock.calls[0][0]).toMatchObject({
      clientId: "client-9",
      caregiverId: "cg-9",
    });
  });

  it("falls back to AdmissionID-stored PatientCode (older imports)", async () => {
    // Old imports stored PatientCode in hhaxAdmissionId. findClient() must
    // try PatientCode against the admission lookup as a last resort.
    storageMock.getClientByHhaxPatientCode.mockResolvedValue(undefined);
    storageMock.getClientByHhaxAdmissionId.mockImplementation(async (id: string) =>
      id === "PAT-LEGACY" ? ({ id: "client-legacy", officeId: null } as any) : undefined,
    );
    storageMock.getCaregiverByHhaxCode.mockResolvedValue({ id: "cg-legacy" } as any);

    const csv =
      "ScheduleID,PatientCode,CaregiverCode,ScheduleDate,StartTime,EndTime\n" +
      "SCH-L,PAT-LEGACY,C-L,2025-06-03,09:00,17:00\n";

    const svc = new HhaxSftpService();
    const res = await svc.importSchedules({ buffer: Buffer.from(csv) });

    expect(res.recordsCreated).toBe(1);
    expect(storageMock.createSchedule.mock.calls[0][0]).toMatchObject({
      clientId: "client-legacy",
    });
  });
});

describe("dryRun mode performs ZERO destructive writes", () => {
  it("importCaregivers({ dryRun: true }) — no createCaregiver/updateCaregiver calls", async () => {
    const csv =
      "CaregiverCode,FirstName,LastName,State,Status\n" +
      "C-A,Alice,Adams,PA,Active\n" +
      "C-B,Bob,Brown,NJ,Inactive\n";

    const svc = new HhaxSftpService();
    const res = await svc.importCaregivers({ buffer: Buffer.from(csv), dryRun: true });

    expect(res.dryRun).toBe(true);
    expect(res.recordsTotal).toBe(2);
    // Both rows are "new" because the mock returns undefined for existing-by-code.
    expect(res.recordsCreated).toBe(2);
    expect(res.recordsUpdated).toBe(0);
    expect(storageMock.createCaregiver).not.toHaveBeenCalled();
    expect(storageMock.updateCaregiver).not.toHaveBeenCalled();
  });

  it("importClients({ dryRun: true }) — no createClient/updateClient calls", async () => {
    const csv =
      "PatientCode,AdmissionID,FirstName,LastName,Status\n" +
      "P-A,ADM-A,Carol,Cole,Active\n";

    const svc = new HhaxSftpService();
    const res = await svc.importClients({ buffer: Buffer.from(csv), dryRun: true });

    expect(res.dryRun).toBe(true);
    expect(res.recordsTotal).toBe(1);
    expect(res.recordsCreated).toBe(1);
    expect(storageMock.createClient).not.toHaveBeenCalled();
    expect(storageMock.updateClient).not.toHaveBeenCalled();
  });

  it("importSchedules({ dryRun: true }) — no createSchedule calls", async () => {
    storageMock.getClientByHhaxAdmissionId.mockResolvedValue({
      id: "client-x",
      officeId: null,
    } as any);
    storageMock.getCaregiverByHhaxCode.mockResolvedValue({ id: "cg-x" } as any);

    const csv =
      "ScheduleID,AdmissionID,CaregiverCode,ScheduleDate,StartTime,EndTime\n" +
      "S-A,ADM-X,C-X,2025-06-04,09:00,17:00\n";

    const svc = new HhaxSftpService();
    const res = await svc.importSchedules({ buffer: Buffer.from(csv), dryRun: true });

    expect(res.dryRun).toBe(true);
    expect(res.recordsTotal).toBe(1);
    expect(res.recordsCreated).toBe(1);
    expect(storageMock.createSchedule).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Bonus: end-to-end caregiver import (non dry-run) proves State (address)
// is preserved correctly in the data passed to storage.createCaregiver.
// ---------------------------------------------------------------------------
describe("importCaregivers — State (address) is preserved alongside Status", () => {
  it("writes both fields independently to storage", async () => {
    const csv =
      "CaregiverCode,FirstName,LastName,State,Status\n" +
      "C-Z,Zoe,Zhang,PA,Active\n";

    const svc = new HhaxSftpService();
    const res = await svc.importCaregivers({ buffer: Buffer.from(csv) });

    expect(res.recordsCreated).toBe(1);
    expect(storageMock.createCaregiver).toHaveBeenCalledTimes(1);
    const persisted = storageMock.createCaregiver.mock.calls[0][0];
    expect(persisted.state).toBe("PA");
    expect(persisted.status).toBe("active");
  });
});
