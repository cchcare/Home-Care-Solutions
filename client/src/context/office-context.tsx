import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface OfficeContextType {
  selectedOfficeId: string;
  setSelectedOfficeId: (officeId: string) => void;
}

const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

const OFFICE_STORAGE_KEY = "selectedOfficeId";

export function OfficeProvider({ children }: { children: ReactNode }) {
  const [selectedOfficeId, setSelectedOfficeIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(OFFICE_STORAGE_KEY) || "all";
    }
    return "all";
  });

  const setSelectedOfficeId = (officeId: string) => {
    setSelectedOfficeIdState(officeId);
    if (typeof window !== "undefined") {
      localStorage.setItem(OFFICE_STORAGE_KEY, officeId);
    }
  };

  return (
    <OfficeContext.Provider value={{ selectedOfficeId, setSelectedOfficeId }}>
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice() {
  const context = useContext(OfficeContext);
  if (context === undefined) {
    throw new Error("useOffice must be used within an OfficeProvider");
  }
  return context;
}
