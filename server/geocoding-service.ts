/**
 * Server-side geocoding proxy.
 *
 * The browser must NOT call third-party geocoding services directly with
 * caregiver / client home addresses — those are PII (and in a HIPAA context
 * potentially PHI). Instead, the client calls these proxy endpoints and the
 * server forwards the request to OpenStreetMap Nominatim (address search) or
 * Zippopotam.us (ZIP → city/state) with:
 *   - a stable, identifying User-Agent (required by Nominatim policy)
 *   - per-user rate limiting (Nominatim asks ≤1 req/s)
 *   - response normalization so we only return the address fields the UI
 *     actually needs (no full free-form display strings beyond what's needed)
 *   - no request-body logging (so home addresses don't end up in app logs)
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const ZIPPOPOTAM_URL = "https://api.zippopotam.us/us";

const USER_AGENT =
  process.env.GEOCODING_USER_AGENT ||
  "CCHC-HomeCare/1.0 (contact: support@cchc.local)";

// Per-user rate limit state. In-memory is fine here — a single request burst
// from one browser tab is what we're protecting against, not a horizontal-scale
// abuse vector.
interface RateState {
  lastRequestMs: number;
  windowStartMs: number;
  windowCount: number;
}
const rateByKey = new Map<string, RateState>();

const MIN_GAP_MS = 1000; // Nominatim policy: max 1 req/sec
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

export interface RateCheckResult {
  ok: boolean;
  retryAfterMs: number;
}

export function checkGeocodingRate(key: string): RateCheckResult {
  const now = Date.now();
  const state = rateByKey.get(key);

  if (!state) {
    rateByKey.set(key, {
      lastRequestMs: now,
      windowStartMs: now,
      windowCount: 1,
    });
    return { ok: true, retryAfterMs: 0 };
  }

  // Sliding window reset.
  if (now - state.windowStartMs >= WINDOW_MS) {
    state.windowStartMs = now;
    state.windowCount = 0;
  }

  const sinceLast = now - state.lastRequestMs;
  if (sinceLast < MIN_GAP_MS) {
    return { ok: false, retryAfterMs: MIN_GAP_MS - sinceLast };
  }
  if (state.windowCount >= MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfterMs: WINDOW_MS - (now - state.windowStartMs),
    };
  }

  state.lastRequestMs = now;
  state.windowCount += 1;
  return { ok: true, retryAfterMs: 0 };
}

// ---------------------------------------------------------------------------
// Nominatim address autocomplete
// ---------------------------------------------------------------------------

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
}

interface RawNominatimResult {
  place_id: number;
  display_name: string;
  address: NominatimAddress;
}

export interface AddressSuggestion {
  id: number;
  displayName: string;
  street: string;
  city: string;
  state: string; // full state name; client maps to 2-letter code
  zipCode: string;
  county: string;
}

function buildStreet(addr: NominatimAddress): string {
  const road = addr.road || addr.pedestrian || "";
  if (!road) return "";
  return addr.house_number ? `${addr.house_number} ${road}` : road;
}

function buildCity(addr: NominatimAddress): string {
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    ""
  );
}

export async function searchAddresses(
  query: string,
): Promise<AddressSuggestion[]> {
  const url =
    `${NOMINATIM_URL}?q=${encodeURIComponent(query)}` +
    "&format=json&addressdetails=1&countrycodes=us&limit=5";

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Address search upstream returned ${response.status}`,
    );
  }

  const raw = (await response.json()) as RawNominatimResult[];
  if (!Array.isArray(raw)) return [];

  return raw.map((r) => ({
    id: r.place_id,
    displayName: r.display_name,
    street: buildStreet(r.address),
    city: buildCity(r.address),
    state: r.address.state || "",
    zipCode: r.address.postcode || "",
    county: r.address.county || "",
  }));
}

// ---------------------------------------------------------------------------
// ZIP → City/State (Zippopotam.us, free, no API key)
// ---------------------------------------------------------------------------

interface RawZipResponse {
  places?: Array<{
    "place name"?: string;
    "state abbreviation"?: string;
  }>;
}

export interface ZipLookupResult {
  city: string;
  state: string;
  county: string;
}

// Zippopotam.us (used above for city/state) doesn't return county at all.
// Nominatim's structured postalcode search does, so it's used here as a
// best-effort supplement — county is left blank rather than failing the
// whole lookup if this second upstream call errors or comes back empty.
async function lookupCountyForZip(zip: string): Promise<string> {
  try {
    const url =
      `${NOMINATIM_URL}?postalcode=${encodeURIComponent(zip)}&country=us` +
      "&format=json&addressdetails=1&limit=1";
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) return "";
    const raw = (await response.json()) as RawNominatimResult[];
    return raw?.[0]?.address?.county || "";
  } catch {
    return "";
  }
}

export async function lookupZip(zip: string): Promise<ZipLookupResult | null> {
  if (!/^\d{5}$/.test(zip)) {
    throw new Error("ZIP must be exactly 5 digits");
  }
  const response = await fetch(`${ZIPPOPOTAM_URL}/${zip}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`ZIP lookup upstream returned ${response.status}`);
  }
  const data = (await response.json()) as RawZipResponse;
  const place = data.places?.[0];
  if (!place) return null;

  const county = await lookupCountyForZip(zip);

  return {
    city: place["place name"] || "",
    state: place["state abbreviation"] || "",
    county,
  };
}
