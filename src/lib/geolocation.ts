export type GeoCoords = { lat: string; lng: string };

export async function getGeoCoords(forceFresh = false): Promise<{ lat: string | null; lng: string | null }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { lat: null, lng: null };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        }),
      (err) => {
        console.warn("[geolocation]", err.code, err.message);
        resolve({ lat: null, lng: null });
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: forceFresh ? 0 : 600000,
      },
    );
  });
}

export async function resolveGeoCoords(cached: GeoCoords | null, forceFresh = false): Promise<GeoCoords | null> {
  if (!forceFresh && cached) return cached;

  const fresh = await getGeoCoords(forceFresh);
  if (fresh.lat && fresh.lng) {
    return { lat: fresh.lat, lng: fresh.lng };
  }

  if (!forceFresh) {
    return resolveGeoCoords(cached, true);
  }

  return null;
}

export const GEO_LOCATION_REQUIRED_MESSAGE =
  "Could not detect your GPS location. Keep this tab in the foreground, confirm location is allowed for odokho.com in browser settings, then try again.";
