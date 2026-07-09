export type GeoCoords = { lat: string; lng: string; accuracy?: string | null };

export async function getGeoCoords(forceFresh = false): Promise<{
  lat: string | null;
  lng: string | null;
  accuracy: string | null;
}> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { lat: null, lng: null, accuracy: null };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          accuracy: Number.isFinite(pos.coords.accuracy) ? String(pos.coords.accuracy) : null,
        }),
      (err) => {
        console.warn("[geolocation]", err.code, err.message);
        resolve({ lat: null, lng: null, accuracy: null });
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
    return { lat: fresh.lat, lng: fresh.lng, accuracy: fresh.accuracy };
  }

  if (!forceFresh) {
    return resolveGeoCoords(cached, true);
  }

  return null;
}

export const GEO_LOCATION_HINT_MESSAGE =
  "Location helps the owner find the spot. You can still report without GPS — we'll note location as unavailable.";
