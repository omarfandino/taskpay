import { parseLatLng, type LatLng } from "./geo";

export type ResolvedLocation = {
  normalized: string;
  coords: LatLng | null;
  label: string | null;
};

const MAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "maps.google.com",
  "google.com.co",
  "googleusercontent.com",
]);

/** Normalize user input: address, lat,lng, or Google Maps URL → storable string */
export function normalizeLocationInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const coords = extractCoordsFromMapsUrl(trimmed);
  if (coords) {
    return `${coords.lat},${coords.lng}`;
  }

  const place = extractPlaceLabelFromMapsUrl(trimmed);
  if (place) return place;

  return trimmed;
}

export function isMapsUrl(input: string): boolean {
  try {
    const host = new URL(input.trim()).hostname.replace(/^www\./, "");
    return (
      MAPS_HOSTS.has(host) ||
      host.endsWith(".google.com") ||
      host.endsWith(".goo.gl")
    );
  } catch {
    return false;
  }
}

export function isGoogleMapsShortLink(input: string): boolean {
  try {
    const host = new URL(input.trim()).hostname.replace(/^www\./, "");
    return host === "maps.app.goo.gl" || host === "goo.gl";
  } catch {
    return false;
  }
}

export function needsServerResolve(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || !isMapsUrl(trimmed)) return false;
  if (extractCoordsFromMapsUrl(trimmed)) return false;
  if (extractPlaceLabelFromMapsUrl(trimmed)) return false;
  return isGoogleMapsShortLink(trimmed) || isMapsUrl(trimmed);
}

/** Extract lat/lng from common Google Maps URL shapes (no API key). */
export function extractCoordsFromMapsUrl(input: string): LatLng | null {
  const direct = parseLatLng(input);
  if (direct) return direct;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (!isMapsUrl(input)) return null;

  const q = url.searchParams.get("q") ?? url.searchParams.get("query");
  if (q) {
    const fromQ = parseLatLng(q);
    if (fromQ) return fromQ;
  }

  const ll = url.searchParams.get("ll");
  if (ll) {
    const fromLl = parseLatLng(ll);
    if (fromLl) return fromLl;
  }

  const atMatch = `${url.pathname}${url.search}`.match(
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/
  );
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }

  const dataMatch = input.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }

  return null;
}

/** Place name or address from Maps URL when coords are unavailable. */
export function extractPlaceLabelFromMapsUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (!isMapsUrl(input)) return null;

  const q = url.searchParams.get("q") ?? url.searchParams.get("query");
  if (q && !parseLatLng(q)) {
    return decodeURIComponent(q.replace(/\+/g, " ")).trim() || null;
  }

  const placeMatch = url.pathname.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim() || null;
  }

  return null;
}

export function resolveLocationSync(raw: string): ResolvedLocation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { normalized: "", coords: null, label: null };
  }

  const coords = extractCoordsFromMapsUrl(trimmed);
  if (coords) {
    const normalized = `${coords.lat},${coords.lng}`;
    return {
      normalized,
      coords,
      label: "Pin on map",
    };
  }

  const place = extractPlaceLabelFromMapsUrl(trimmed);
  if (place) {
    return { normalized: place, coords: null, label: place };
  }

  if (parseLatLng(trimmed)) {
    const c = parseLatLng(trimmed)!;
    return {
      normalized: `${c.lat},${c.lng}`,
      coords: c,
      label: "Your current location",
    };
  }

  return { normalized: trimmed, coords: null, label: trimmed };
}

export async function resolveLocationInput(raw: string): Promise<ResolvedLocation> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { normalized: "", coords: null, label: null };
  }

  const sync = resolveLocationSync(trimmed);
  if (sync.coords || !needsServerResolve(trimmed)) {
    return sync;
  }

  try {
    const res = await fetch("/api/resolve-maps-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });

    if (!res.ok) {
      throw new Error("resolve failed");
    }

    const data = (await res.json()) as ResolvedLocation;
    return data;
  } catch {
    return {
      normalized: trimmed,
      coords: null,
      label: "Could not expand link — try the full Maps URL",
    };
  }
}

export function locationFieldHint(): string {
  return "Maps link, address, or coordinates";
}

export function canPreviewLocation(location: string): boolean {
  return Boolean(location.trim());
}
