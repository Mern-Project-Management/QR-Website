import { getSession } from "next-auth/react";

/** Normalize callbackUrl to a same-origin path (open-redirect safe). */
export function resolveCallbackUrl(raw: string | null, fallback = "/"): string {
  if (!raw?.trim()) return fallback;

  try {
    const trimmed = raw.trim();
    const url =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? new URL(trimmed)
        : new URL(
            trimmed.startsWith("/") ? trimmed : `/${trimmed}`,
            typeof window !== "undefined" ? window.location.origin : "http://localhost"
          );

    if (typeof window !== "undefined" && url.origin !== window.location.origin) {
      return fallback;
    }

    const path = url.pathname + url.search + url.hash;
    return path.startsWith("/") ? path : fallback;
  } catch {
    const trimmed = raw.trim();
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
    return fallback;
  }
}

/**
 * Wait for NextAuth session, then hard-navigate so middleware sees the JWT cookie.
 * Client-side router.push can run before the cookie is set and bounce back to /login.
 */
export async function redirectAfterAuth(callbackUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const session = await getSession();
    if (session?.user) {
      window.location.assign(callbackUrl);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  window.location.assign(callbackUrl);
}
