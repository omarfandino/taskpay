export type LatLng = { lat: number; lng: number };

export function parseLatLng(location: string): LatLng | null {
  const match = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

export function sortByDistance<T extends { location: string }>(
  tasks: T[],
  userLocation: LatLng
): T[] {
  return [...tasks].sort((a, b) => {
    const aCoords = parseLatLng(a.location);
    const bCoords = parseLatLng(b.location);
    const aDist = aCoords ? haversineKm(userLocation, aCoords) : Infinity;
    const bDist = bCoords ? haversineKm(userLocation, bCoords) : Infinity;
    return aDist - bDist;
  });
}
