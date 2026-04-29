import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

export type UrlValue = string | string[] | null | undefined;

export type UrlState = Record<string, UrlValue>;

function paramsToObject(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/**
 * URL-as-source-of-truth state. Reads/writes via wouter's useSearch + setLocation.
 * Multi-value params are stored as comma-separated strings.
 */
export function useUrlState(basePath: string) {
  const search = useSearch();
  const [, setLocation] = useLocation();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const values = useMemo(() => paramsToObject(params), [params]);

  const setMany = useCallback(
    (updates: UrlState) => {
      const next = new URLSearchParams(search);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            next.delete(key);
          } else {
            next.set(key, value.join(","));
          }
        } else {
          next.set(key, value);
        }
      }
      const qs = next.toString();
      setLocation(qs ? `${basePath}?${qs}` : basePath, { replace: true });
    },
    [search, setLocation, basePath]
  );

  const setOne = useCallback(
    (key: string, value: UrlValue) => setMany({ [key]: value }),
    [setMany]
  );

  const clearAll = useCallback(() => {
    setLocation(basePath, { replace: true });
  }, [basePath, setLocation]);

  const replaceAll = useCallback(
    (next: UrlState) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value)) {
          if (value.length > 0) params.set(key, value.join(","));
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      setLocation(qs ? `${basePath}?${qs}` : basePath, { replace: true });
    },
    [basePath, setLocation]
  );

  const getString = useCallback(
    (key: string, fallback = ""): string => values[key] ?? fallback,
    [values]
  );
  const getList = useCallback(
    (key: string): string[] => {
      const v = values[key];
      if (!v) return [];
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    },
    [values]
  );

  return { values, params, setMany, setOne, clearAll, replaceAll, getString, getList };
}
