/**
 * UI test for the saved-audit-comparison "rename" flow (the pencil-icon
 * button + dialog used on the Audit Assessment page).
 *
 * This is the client-side companion to
 * server/__tests__/audit-saved-comparison-rename.test.ts. It simulates the
 * exact gesture described in Task #89:
 *
 *   1. The user is looking at a saved comparison (rendered by a tiny test
 *      harness that re-creates the list-row + pencil button).
 *   2. The user clicks the pencil icon -> the rename dialog opens with the
 *      current name pre-filled.
 *   3. The user edits the name and clicks "Rename".
 *   4. The component issues PATCH /api/doh-saved-comparisons/:id with the
 *      new name; on success it invalidates the saved-comparisons query and
 *      the refetched list shows the new name (proving persistence).
 *
 * The test file is .ts (not .tsx) and uses React.createElement directly so
 * it avoids depending on a JSX transform for the test harness itself. The
 * component under test is a real .tsx imported normally — vite's React
 * plugin transforms it as it is loaded.
 *
 * `fetch` is mocked at the module level so the real network is never hit.
 * The mock backs a tiny in-memory store keyed by comparison id.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { SavedComparisonRenameButton } from "./SavedComparisonRenameButton";
import { queryClient } from "@/lib/queryClient";

type SavedComparison = {
  id: string;
  officeId: string;
  name: string;
  auditId1: string;
  auditId2: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

const OFFICE_ID = "office-A";

// In-memory store backing the mocked fetch — represents the server.
const store = new Map<string, SavedComparison>();

function seedStore() {
  store.clear();
  store.set("sc-1", {
    id: "sc-1",
    officeId: OFFICE_ID,
    name: "Q1 vs Q2",
    auditId1: "audit-1",
    auditId2: "audit-2",
    createdBy: "user-A",
    createdByName: "Alice",
    createdAt: new Date().toISOString(),
  });
}

// Mocked fetch: handles GET (list) and PATCH (rename) for the
// saved-comparisons endpoints. Everything else is rejected so the test
// fails loudly if the component ever calls a URL it shouldn't.
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  const method = (init?.method ?? "GET").toUpperCase();

  if (method === "GET" && url.startsWith(`/api/doh-saved-comparisons?officeId=${OFFICE_ID}`)) {
    const rows = Array.from(store.values()).filter((c) => c.officeId === OFFICE_ID);
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const patchMatch = url.match(/^\/api\/doh-saved-comparisons\/([^/?]+)$/);
  if (method === "PATCH" && patchMatch) {
    const id = patchMatch[1];
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const existing = store.get(id);
    if (!existing) {
      return new Response(JSON.stringify({ message: "Saved comparison not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const updated = { ...existing, name: String(body.name) };
    store.set(id, updated);
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: `Unexpected ${method} ${url}` }), { status: 500 });
});

beforeEach(() => {
  seedStore();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  // The component invalidates the singleton query client imported from
  // @/lib/queryClient, so the harness must mount that same client (not a
  // fresh one) for invalidateQueries to refetch our query. Reset cache so
  // tests don't leak state into each other.
  queryClient.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tiny harness: simulates a saved-comparisons list row on the
// audit-assessment page. It uses the same query key as the real page so
// the rename mutation's invalidateQueries causes a refetch here too.
// ---------------------------------------------------------------------------

function SavedComparisonRow(props: { comparisonId: string }) {
  const { data } = useQuery<SavedComparison[]>({
    queryKey: ["/api/doh-saved-comparisons", OFFICE_ID],
    queryFn: async () => {
      const res = await fetch(`/api/doh-saved-comparisons?officeId=${OFFICE_ID}`, {
        credentials: "include",
      });
      return res.ok ? res.json() : [];
    },
  });
  const sc = data?.find((c) => c.id === props.comparisonId);
  if (!sc) {
    return createElement("div", null, "Loading...");
  }
  return createElement(
    "div",
    { "data-testid": `saved-comparison-${sc.id}` },
    createElement(
      "span",
      { "data-testid": `saved-comparison-name-${sc.id}` },
      sc.name,
    ),
    createElement(SavedComparisonRenameButton, {
      comparisonId: sc.id,
      currentName: sc.name,
      officeId: sc.officeId,
    }),
  );
}

function renderHarness() {
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(SavedComparisonRow, { comparisonId: "sc-1" }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SavedComparisonRenameButton (UI)", () => {
  it("renames a comparison via the pencil dialog and shows the new name after refetch", async () => {
    const user = userEvent.setup();
    renderHarness();

    // Wait for the row to render with the seeded name.
    expect(await screen.findByTestId("saved-comparison-name-sc-1")).toHaveTextContent("Q1 vs Q2");

    // 1. Click the pencil icon.
    await user.click(screen.getByTestId("button-rename-saved-comparison-sc-1"));

    // 2. Dialog appears with the current name pre-filled.
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByTestId("input-rename-saved-comparison") as HTMLInputElement;
    expect(input).toHaveValue("Q1 vs Q2");

    // 3. Edit the name.
    await user.clear(input);
    await user.type(input, "Renamed via pencil");
    expect(input).toHaveValue("Renamed via pencil");

    // 4. Submit.
    await user.click(within(dialog).getByTestId("button-confirm-rename-saved-comparison"));

    // 5. PATCH must have been issued with the trimmed new name.
    await waitFor(() => {
      const patchCalls = fetchMock.mock.calls.filter(
        ([url, init]) =>
          typeof url === "string" &&
          url === "/api/doh-saved-comparisons/sc-1" &&
          (init as RequestInit | undefined)?.method?.toUpperCase() === "PATCH",
      );
      expect(patchCalls).toHaveLength(1);
      const body = JSON.parse(String((patchCalls[0][1] as RequestInit).body));
      expect(body).toEqual({ name: "Renamed via pencil" });
    });

    // 6. After invalidation + refetch, the row shows the new name.
    await waitFor(() => {
      expect(screen.getByTestId("saved-comparison-name-sc-1")).toHaveTextContent("Renamed via pencil");
    });

    // 7. The dialog is closed.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 8. The store actually mutated — proves persistence through the API.
    expect(store.get("sc-1")?.name).toBe("Renamed via pencil");
  });

  it("disables the Rename button when the name is empty / whitespace and never calls PATCH", async () => {
    const user = userEvent.setup();
    renderHarness();

    expect(await screen.findByTestId("saved-comparison-name-sc-1")).toHaveTextContent("Q1 vs Q2");
    await user.click(screen.getByTestId("button-rename-saved-comparison-sc-1"));

    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByTestId("input-rename-saved-comparison") as HTMLInputElement;

    // Empty
    await user.clear(input);
    expect(within(dialog).getByTestId("button-confirm-rename-saved-comparison")).toBeDisabled();

    // Whitespace only
    await user.type(input, "   ");
    expect(within(dialog).getByTestId("button-confirm-rename-saved-comparison")).toBeDisabled();

    // Clicking the disabled button must not issue a PATCH.
    await user.click(within(dialog).getByTestId("button-confirm-rename-saved-comparison"));
    const patchCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        url === "/api/doh-saved-comparisons/sc-1" &&
        (init as RequestInit | undefined)?.method?.toUpperCase() === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);

    // The stored name is unchanged.
    expect(store.get("sc-1")?.name).toBe("Q1 vs Q2");
  });

  it("submits via the Enter key", async () => {
    const user = userEvent.setup();
    renderHarness();

    expect(await screen.findByTestId("saved-comparison-name-sc-1")).toHaveTextContent("Q1 vs Q2");
    await user.click(screen.getByTestId("button-rename-saved-comparison-sc-1"));

    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByTestId("input-rename-saved-comparison") as HTMLInputElement;

    await user.clear(input);
    await user.type(input, "Enter-key rename{Enter}");

    await waitFor(() => {
      expect(store.get("sc-1")?.name).toBe("Enter-key rename");
    });
    await waitFor(() => {
      expect(screen.getByTestId("saved-comparison-name-sc-1")).toHaveTextContent("Enter-key rename");
    });
  });
});
