
const DEFAULT_PRODUCTION_ADMIN_ORIGIN = "https://odokho.com";
const DEFAULT_DEV_ADMIN_ORIGIN = "http://localhost:3060";

/** Fixed origin for admin-hosted images (categories, QR assets, uploads). */
export const ADMIN_IMAGE_ORIGIN = "https://admin.odokho.com";

export function getAdminImageOrigin(): string {
  return ADMIN_IMAGE_ORIGIN;
}

export function getAdminOrigin(): string {
  const explicit =
    process.env.ADMIN_ORIGIN?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/$/, "");
  if (explicit) return explicit;

  const apiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL;
  if (apiUrl) {
    try {
      return new URL(apiUrl).origin;
    } catch {
      /* ignore invalid URL */
    }
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_ADMIN_ORIGIN;
  }
  return DEFAULT_DEV_ADMIN_ORIGIN;
}
