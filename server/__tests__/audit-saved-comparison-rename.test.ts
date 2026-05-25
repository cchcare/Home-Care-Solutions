/**
 * Vitest suite for the "rename saved audit comparison" feature.
 *
 * Covers the PATCH /api/doh-saved-comparisons/:id endpoint plus the
 * surrounding flow that the audit-assessment page exercises:
 *
 *   (a) Happy path: a comparison can be created (POST), then renamed via
 *       PATCH (the click-the-pencil flow), and the new name is returned by
 *       a follow-up GET — proving the change is persisted through the
 *       storage layer.
 *
 *   (b) Validation: an empty / whitespace / non-string name returns 400 and
 *       the storage layer is NEVER asked to update.
 *
 *   (c) Authorization: a user who belongs to a different office cannot
 *       rename someone else's saved comparison — the endpoint returns 403
 *       and the storage layer is NEVER asked to update.
 *
 *   (d) Auxiliary safety: missing comparison returns 404 and the trim/cap
 *       behavior on the name string is honored.
 *
 * The storage layer is fully mocked via `vi.mock`, so the suite has no DB
 * dependency. The routes are mounted onto a fresh Express app using the
 * extracted `registerDohSavedComparisonRoutes` helper.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express, type RequestHandler } from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// In-memory office + audit + saved-comparison stores. Mocked storage methods
// read from / mutate these so the test can simulate end-to-end persistence
// (POST creates a row, PATCH mutates it, GET returns the mutated row).
// ---------------------------------------------------------------------------

type Office = { id: string; organizationId: string | null };
type Audit = { id: string; officeId: string };
type SavedComparison = {
  id: string;
  officeId: string;
  name: string;
  auditId1: string;
  auditId2: string;
  createdBy: string | null;
  createdAt: Date;
};

const offices = new Map<string, Office>();
const audits = new Map<string, Audit>();
const savedComparisons = new Map<string, SavedComparison>();

function resetStores() {
  offices.clear();
  audits.clear();
  savedComparisons.clear();
  // Two offices in two different organizations.
  offices.set("office-A", { id: "office-A", organizationId: "org-1" });
  offices.set("office-B", { id: "office-B", organizationId: "org-2" });
  // Two audits per office.
  audits.set("audit-A1", { id: "audit-A1", officeId: "office-A" });
  audits.set("audit-A2", { id: "audit-A2", officeId: "office-A" });
  audits.set("audit-B1", { id: "audit-B1", officeId: "office-B" });
  audits.set("audit-B2", { id: "audit-B2", officeId: "office-B" });
}

let nextId = 1;
function makeId(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

// ---------------------------------------------------------------------------
// vi.mock is hoisted; the module under test sees the mocked storage.
// ---------------------------------------------------------------------------
vi.mock("../storage", () => {
  return {
    storage: {
      getOffice: vi.fn(async (id: string) => offices.get(id)),
      getDohAuditAssessment: vi.fn(async (id: string) => audits.get(id)),
      getDohSavedComparisons: vi.fn(async (officeId: string) =>
        Array.from(savedComparisons.values())
          .filter((c) => c.officeId === officeId)
          .map((c) => ({ ...c, createdByName: null })),
      ),
      getDohSavedComparison: vi.fn(async (id: string) => savedComparisons.get(id)),
      createDohSavedComparison: vi.fn(
        async (input: Omit<SavedComparison, "id" | "createdAt"> & { createdAt?: Date }) => {
          const row: SavedComparison = {
            id: makeId("sc"),
            createdAt: new Date(),
            ...input,
          };
          savedComparisons.set(row.id, row);
          return row;
        },
      ),
      updateDohSavedComparison: vi.fn(async (id: string, data: { name: string }) => {
        const existing = savedComparisons.get(id);
        if (!existing) return undefined;
        const updated = { ...existing, name: data.name };
        savedComparisons.set(id, updated);
        return updated;
      }),
      deleteDohSavedComparison: vi.fn(async (id: string) => {
        savedComparisons.delete(id);
      }),
    },
  };
});

import { registerDohSavedComparisonRoutes } from "../audit-saved-comparison-routes";
import { storage } from "../storage";

interface MockedStorage {
  getOffice: ReturnType<typeof vi.fn>;
  getDohAuditAssessment: ReturnType<typeof vi.fn>;
  getDohSavedComparisons: ReturnType<typeof vi.fn>;
  getDohSavedComparison: ReturnType<typeof vi.fn>;
  createDohSavedComparison: ReturnType<typeof vi.fn>;
  updateDohSavedComparison: ReturnType<typeof vi.fn>;
  deleteDohSavedComparison: ReturnType<typeof vi.fn>;
}
const mockedStorage = storage as unknown as MockedStorage;

// ---------------------------------------------------------------------------
// Build a fresh Express app for each test. A simple test middleware injects
// `req.session.user` from a request header so the same app can simulate both
// the office-A user and the office-B user.
// ---------------------------------------------------------------------------
type TestUser = {
  id: string;
  role: string;
  organizationId: string | null;
  primaryOfficeId: string | null;
};

const TEST_USERS: Record<string, TestUser> = {
  "user-A": { id: "user-A", role: "supervisor", organizationId: "org-1", primaryOfficeId: "office-A" },
  "user-B": { id: "user-B", role: "supervisor", organizationId: "org-2", primaryOfficeId: "office-B" },
  "user-admin-A": { id: "user-admin-A", role: "admin", organizationId: "org-1", primaryOfficeId: null },
  "user-super": { id: "user-super", role: "super_admin", organizationId: null, primaryOfficeId: null },
};

const isAuthenticatedTest: RequestHandler = (_req, _res, next) => next();

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const userId = req.header("x-test-user");
    req.session = userId && TEST_USERS[userId] ? { user: TEST_USERS[userId] } : {};
    next();
  });
  registerDohSavedComparisonRoutes(app, isAuthenticatedTest);
  return app;
}

let app: Express;

beforeEach(() => {
  resetStores();
  nextId = 1;
  // Reset call history for every mocked storage method so per-test assertions
  // don't see counts from prior tests.
  for (const key of Object.keys(mockedStorage) as (keyof MockedStorage)[]) {
    mockedStorage[key].mockClear();
  }
  app = buildApp();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) Happy-path rename flow — mirrors the UI gesture: save a comparison,
//     click the pencil, type a new name, confirm. We then re-read the
//     comparison via GET to prove persistence.
// ---------------------------------------------------------------------------
describe("PATCH /api/doh-saved-comparisons/:id - happy path (rename flow)", () => {
  it("saves a comparison, renames it, and confirms the new name is persisted", async () => {
    // Step 1: save a comparison (the "Save comparison" button on the page).
    const createRes = await request(app)
      .post("/api/doh-saved-comparisons")
      .set("x-test-user", "user-A")
      .send({ name: "Original name", auditId1: "audit-A1", auditId2: "audit-A2" });
    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      name: "Original name",
      officeId: "office-A",
      auditId1: "audit-A1",
      auditId2: "audit-A2",
      createdBy: "user-A",
    });
    const createdId: string = createRes.body.id;
    expect(createdId).toBeTruthy();

    // Step 2: click the pencil icon -> open dialog -> type new name -> Rename.
    const renameRes = await request(app)
      .patch(`/api/doh-saved-comparisons/${createdId}`)
      .set("x-test-user", "user-A")
      .send({ name: "Renamed comparison" });
    expect(renameRes.status).toBe(200);
    expect(renameRes.body).toMatchObject({ id: createdId, name: "Renamed comparison" });
    expect(mockedStorage.updateDohSavedComparison).toHaveBeenCalledWith(createdId, {
      name: "Renamed comparison",
    });

    // Step 3: re-read the saved comparisons list — the new name must persist.
    const listRes = await request(app)
      .get("/api/doh-saved-comparisons?officeId=office-A")
      .set("x-test-user", "user-A");
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0]).toMatchObject({ id: createdId, name: "Renamed comparison" });
  });

  it("trims surrounding whitespace and caps the new name at 200 characters", async () => {
    const createRes = await request(app)
      .post("/api/doh-saved-comparisons")
      .set("x-test-user", "user-A")
      .send({ name: "Original", auditId1: "audit-A1", auditId2: "audit-A2" });
    const createdId: string = createRes.body.id;

    // Surrounding whitespace must be stripped before persisting.
    const trimmedRes = await request(app)
      .patch(`/api/doh-saved-comparisons/${createdId}`)
      .set("x-test-user", "user-A")
      .send({ name: "   Padded name   " });
    expect(trimmedRes.status).toBe(200);
    expect(trimmedRes.body.name).toBe("Padded name");

    // Names longer than 200 characters must be truncated.
    const longInput = "x".repeat(250);
    const longRes = await request(app)
      .patch(`/api/doh-saved-comparisons/${createdId}`)
      .set("x-test-user", "user-A")
      .send({ name: longInput });
    expect(longRes.status).toBe(200);
    expect(longRes.body.name).toHaveLength(200);
    expect(longRes.body.name).toBe("x".repeat(200));
  });
});

// ---------------------------------------------------------------------------
// (b) Validation — empty / whitespace / non-string names return 400 and
//     the storage layer is never asked to update.
// ---------------------------------------------------------------------------
describe("PATCH /api/doh-saved-comparisons/:id - name validation (400)", () => {
  async function seed(): Promise<string> {
    const createRes = await request(app)
      .post("/api/doh-saved-comparisons")
      .set("x-test-user", "user-A")
      .send({ name: "Original", auditId1: "audit-A1", auditId2: "audit-A2" });
    return createRes.body.id;
  }

  it("rejects an empty name with 400 and does not call the storage update", async () => {
    const id = await seed();
    mockedStorage.updateDohSavedComparison.mockClear();

    const res = await request(app)
      .patch(`/api/doh-saved-comparisons/${id}`)
      .set("x-test-user", "user-A")
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "name is required" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only name with 400", async () => {
    const id = await seed();
    mockedStorage.updateDohSavedComparison.mockClear();

    const res = await request(app)
      .patch(`/api/doh-saved-comparisons/${id}`)
      .set("x-test-user", "user-A")
      .send({ name: "     " });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "name is required" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();
  });

  it("rejects a missing name field with 400", async () => {
    const id = await seed();
    mockedStorage.updateDohSavedComparison.mockClear();

    const res = await request(app)
      .patch(`/api/doh-saved-comparisons/${id}`)
      .set("x-test-user", "user-A")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "name is required" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();
  });

  it("rejects a non-string name (e.g. a number) with 400", async () => {
    const id = await seed();
    mockedStorage.updateDohSavedComparison.mockClear();

    const res = await request(app)
      .patch(`/api/doh-saved-comparisons/${id}`)
      .set("x-test-user", "user-A")
      .send({ name: 12345 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "name is required" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (c) Authorization — a user from a different office is forbidden, and
//     admins may only act inside their own organization.
// ---------------------------------------------------------------------------
describe("PATCH /api/doh-saved-comparisons/:id - authorization (403)", () => {
  it("returns 403 when a user from another office tries to rename", async () => {
    // user-A creates a comparison on office-A.
    const createRes = await request(app)
      .post("/api/doh-saved-comparisons")
      .set("x-test-user", "user-A")
      .send({ name: "Original", auditId1: "audit-A1", auditId2: "audit-A2" });
    const createdId: string = createRes.body.id;
    mockedStorage.updateDohSavedComparison.mockClear();

    // user-B (different office and different organization) tries to rename it.
    const renameRes = await request(app)
      .patch(`/api/doh-saved-comparisons/${createdId}`)
      .set("x-test-user", "user-B")
      .send({ name: "Hijacked name" });

    expect(renameRes.status).toBe(403);
    expect(renameRes.body).toEqual({ message: "Access denied" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();

    // The stored row was NOT mutated.
    const stillOriginal = await request(app)
      .get("/api/doh-saved-comparisons?officeId=office-A")
      .set("x-test-user", "user-A");
    expect(stillOriginal.body[0].name).toBe("Original");
  });

  it("returns 403 when an admin from a different organization tries to rename", async () => {
    // Comparison saved on office-B (organization org-2).
    const createRes = await request(app)
      .post("/api/doh-saved-comparisons")
      .set("x-test-user", "user-B")
      .send({ name: "B's comparison", auditId1: "audit-B1", auditId2: "audit-B2" });
    const createdId: string = createRes.body.id;
    mockedStorage.updateDohSavedComparison.mockClear();

    // admin from org-1 tries to rename a comparison owned by org-2.
    const renameRes = await request(app)
      .patch(`/api/doh-saved-comparisons/${createdId}`)
      .set("x-test-user", "user-admin-A")
      .send({ name: "Cross-org rename" });

    expect(renameRes.status).toBe(403);
    expect(renameRes.body).toEqual({ message: "Access denied" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();
  });

  it("allows a super_admin to rename any office's comparison", async () => {
    const createRes = await request(app)
      .post("/api/doh-saved-comparisons")
      .set("x-test-user", "user-A")
      .send({ name: "Original", auditId1: "audit-A1", auditId2: "audit-A2" });
    const createdId: string = createRes.body.id;

    const renameRes = await request(app)
      .patch(`/api/doh-saved-comparisons/${createdId}`)
      .set("x-test-user", "user-super")
      .send({ name: "Renamed by super_admin" });

    expect(renameRes.status).toBe(200);
    expect(renameRes.body.name).toBe("Renamed by super_admin");
  });

  it("returns 401 when the request has no session user", async () => {
    const createRes = await request(app)
      .post("/api/doh-saved-comparisons")
      .set("x-test-user", "user-A")
      .send({ name: "Original", auditId1: "audit-A1", auditId2: "audit-A2" });
    const createdId: string = createRes.body.id;
    mockedStorage.updateDohSavedComparison.mockClear();

    const renameRes = await request(app)
      .patch(`/api/doh-saved-comparisons/${createdId}`)
      .send({ name: "Anonymous rename" });

    expect(renameRes.status).toBe(401);
    expect(renameRes.body).toEqual({ message: "Not authenticated" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (d) Missing comparison — 404 and no storage update.
// ---------------------------------------------------------------------------
describe("PATCH /api/doh-saved-comparisons/:id - missing comparison (404)", () => {
  it("returns 404 when the comparison does not exist", async () => {
    const res = await request(app)
      .patch("/api/doh-saved-comparisons/does-not-exist")
      .set("x-test-user", "user-A")
      .send({ name: "Anything" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Saved comparison not found" });
    expect(mockedStorage.updateDohSavedComparison).not.toHaveBeenCalled();
  });
});
