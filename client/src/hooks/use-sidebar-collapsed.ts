import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "sidebar-collapsed-v1";
const EVENT_NAME = "sidebar-collapsed-change";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useSidebarCollapsed(): [boolean, (next: boolean) => void, () => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(readInitial);

  useEffect(() => {
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsedState(!!detail);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setCollapsedState(e.newValue === "1");
      }
    };
    window.addEventListener(EVENT_NAME, handleCustom as EventListener);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleCustom as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: next }));
    setCollapsedState(next);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return [collapsed, setCollapsed, toggle];
}
