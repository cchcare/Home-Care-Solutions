import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserSavedView } from "@shared/schema";

const DEFAULT_VIEW_NAME = "__default";

export type ColumnPrefs = Record<string, boolean>;

export function useSavedViews(page: string) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["/api/saved-views", page] as const, [page]);

  const { data: views = [], isLoading } = useQuery<UserSavedView[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/saved-views?page=${encodeURIComponent(page)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load saved views");
      return res.json();
    },
  });

  const namedViews = useMemo(
    () => views.filter((v) => v.name !== DEFAULT_VIEW_NAME),
    [views]
  );

  const defaultView = useMemo(
    () => views.find((v) => v.name === DEFAULT_VIEW_NAME),
    [views]
  );

  const columnPrefs: ColumnPrefs = useMemo(
    () => (defaultView?.columns as ColumnPrefs | undefined) ?? {},
    [defaultView]
  );

  const saveView = useMutation({
    mutationFn: async (input: {
      name: string;
      filters: Record<string, unknown>;
      columns?: ColumnPrefs;
    }) => {
      const res = await apiRequest("POST", "/api/saved-views", { ...input, page });
      return res.json() as Promise<UserSavedView>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-views/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const renameView = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/saved-views/${input.id}`, {
        name: input.name,
      });
      return res.json() as Promise<UserSavedView>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const setColumnPrefs = useMutation({
    mutationFn: async (cols: ColumnPrefs) => {
      const res = await apiRequest("POST", "/api/saved-views", {
        page,
        name: DEFAULT_VIEW_NAME,
        filters: {},
        columns: cols,
        __columnPrefs: true,
      });
      return res.json() as Promise<UserSavedView>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  return {
    views: namedViews,
    isLoading,
    columnPrefs,
    saveView,
    deleteView,
    renameView,
    setColumnPrefs,
    DEFAULT_VIEW_NAME,
  };
}
