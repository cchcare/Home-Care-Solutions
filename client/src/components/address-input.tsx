import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

export type AddressField =
  | "address"
  | "address2"
  | "city"
  | "state"
  | "zipCode"
  | "county";

interface AddressInputProps {
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
  onChange: (field: AddressField, value: string) => void;
  disabled?: boolean;
}

// Server-side suggestion shape (see server/geocoding-service.ts).
interface AddressSuggestion {
  id: number;
  displayName: string;
  street: string;
  city: string;
  state: string; // full name e.g. "Illinois"
  zipCode: string;
  county: string; // raw, may end with " County"
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

// Build a "Illinois" -> "IL" lookup once.
const STATE_NAME_TO_CODE: Record<string, string> = US_STATES.reduce(
  (acc, s) => {
    acc[s.label.toLowerCase()] = s.value;
    return acc;
  },
  {} as Record<string, string>,
);

function stateNameToCode(name: string): string {
  if (!name) return "";
  return STATE_NAME_TO_CODE[name.toLowerCase()] || "";
}

function stripCountySuffix(c: string): string {
  // Server returns raw county "Sangamon County" — most US forms expect just "Sangamon".
  return c.replace(/\s+County$/i, "").trim();
}

export function AddressInput({
  streetAddress,
  streetAddress2,
  city,
  state,
  zipCode,
  county = "",
  onChange,
  disabled = false,
}: AddressInputProps) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  // Address autocomplete via the server-side proxy at /api/geocoding/search.
  const [searchResults, setSearchResults] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSelectedRef = useRef<string>("");

  const lookupZipCode = useCallback(
    async (zip: string) => {
      if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;

      setIsLookingUp(true);
      setZipError(null);
      try {
        const response = await fetch(
          `/api/geocoding/zip?zip=${encodeURIComponent(zip)}`,
          { credentials: "include" },
        );
        if (response.status === 404) {
          setZipError("ZIP not found — please enter city/state manually.");
          return;
        }
        if (response.status === 429) {
          setZipError("Too many lookups. Please wait a moment.");
          return;
        }
        if (!response.ok) {
          setZipError("ZIP lookup failed — please enter city/state manually.");
          return;
        }
        const data: { city: string; state: string; county?: string } = await response.json();
        if (data.city) onChange("city", data.city);
        if (data.state) onChange("state", data.state);
        if (data.county) onChange("county", stripCountySuffix(data.county));
      } catch {
        setZipError("Network error — please enter city/state manually.");
      } finally {
        setIsLookingUp(false);
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (zipCode && zipCode.length === 5 && !city && !state) {
      lookupZipCode(zipCode);
    }
  }, [zipCode, city, state, lookupZipCode]);

  const handleZipChange = (value: string) => {
    const cleanedZip = value.replace(/\D/g, "").slice(0, 5);
    onChange("zipCode", cleanedZip);
    setZipError(null);

    if (cleanedZip.length === 5) {
      lookupZipCode(cleanedZip);
    }
  };

  const searchAddress = useCallback(async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query)}`,
        { credentials: "include" },
      );
      if (response.status === 429) {
        setSearchError("Slow down — too many address searches.");
        setSearchResults([]);
        return;
      }
      if (!response.ok) {
        setSearchError("Address search is temporarily unavailable.");
        setSearchResults([]);
        return;
      }
      const data: AddressSuggestion[] = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
      setShowSuggestions(true);
    } catch {
      setSearchError("Network error — please type your address manually.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleStreetChange = (value: string) => {
    onChange("address", value);
    setSearchError(null);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    // Don't re-search the value the user just picked from the dropdown.
    if (value === lastSelectedRef.current) {
      setShowSuggestions(false);
      return;
    }

    if (value.trim().length < 4) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      void searchAddress(value.trim());
    }, 500);
  };

  const handleSelectSuggestion = (result: AddressSuggestion) => {
    const street = result.street || streetAddress;
    const pickedStateCode = stateNameToCode(result.state);
    const pickedCounty = stripCountySuffix(result.county);

    lastSelectedRef.current = street;

    onChange("address", street);
    if (result.city) onChange("city", result.city);
    if (pickedStateCode) onChange("state", pickedStateCode);
    if (result.zipCode) onChange("zipCode", result.zipCode);
    if (pickedCounty) onChange("county", pickedCounty);

    setShowSuggestions(false);
    setSearchResults([]);
  };

  // Close suggestions on outside click.
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  // Cleanup pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative">
        <Label className="text-muted-foreground text-sm flex items-center gap-1">
          Street Address
          {isSearching && <Loader2 className="w-3 h-3 animate-spin" />}
        </Label>
        <div className="relative">
          <Input
            data-testid="input-street-address"
            value={streetAddress}
            onChange={(e) => handleStreetChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSuggestions(true);
            }}
            placeholder="Start typing an address…"
            autoComplete="off"
            disabled={disabled}
            className="pr-8"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {showSuggestions && searchResults.length > 0 && (
          <ul
            data-testid="address-suggestions"
            className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            {searchResults.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  data-testid={`address-suggestion-${result.id}`}
                  onClick={() => handleSelectSuggestion(result)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchError ? (
          <p
            className="text-xs text-destructive mt-1"
            data-testid="address-search-error"
          >
            {searchError}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Suggestions powered by OpenStreetMap. Pick a result to auto-fill
            city, state, ZIP, and county.
          </p>
        )}
      </div>
      
      <div>
        <Label className="text-muted-foreground text-sm">Street Address 2</Label>
        <Input
          data-testid="input-street-address-2"
          value={streetAddress2}
          onChange={(e) => onChange("address2", e.target.value)}
          placeholder="Apt, Suite, Unit, etc."
          autoComplete="address-line2"
          disabled={disabled}
        />
      </div>
      
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-2">
          <Label className="text-muted-foreground text-sm flex items-center gap-1">
            Zip Code
            {isLookingUp && <Loader2 className="w-3 h-3 animate-spin" />}
          </Label>
          <Input
            data-testid="input-zip-code"
            value={zipCode}
            onChange={(e) => handleZipChange(e.target.value)}
            placeholder="12345"
            autoComplete="postal-code"
            maxLength={5}
            disabled={disabled}
          />
          {zipError && (
            <p
              className="text-xs text-destructive mt-1"
              data-testid="zip-lookup-error"
            >
              {zipError}
            </p>
          )}
        </div>
        
        <div className="col-span-2">
          <Label className="text-muted-foreground text-sm">City</Label>
          <Input
            data-testid="input-city"
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="City"
            autoComplete="address-level2"
            disabled={disabled}
          />
        </div>
        
        <div className="col-span-2">
          <Label className="text-muted-foreground text-sm">State</Label>
          <Select
            value={state}
            onValueChange={(value) => onChange("state", value)}
            disabled={disabled}
          >
            <SelectTrigger data-testid="select-state">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.value} - {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground text-sm">County</Label>
        <Input
          data-testid="input-county"
          value={county}
          onChange={(e) => onChange("county", e.target.value)}
          placeholder="County"
          autoComplete="address-level3"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
