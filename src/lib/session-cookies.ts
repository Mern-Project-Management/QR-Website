/** Production uses secure cookie names when NEXTAUTH_URL is https. */
export function isSecureAuthCookieEnv(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    !!process.env.NEXTAUTH_URL?.startsWith("https://")
  );
}

/** Customer website session — separate from admin dashboard. */
export function websiteSessionCookieName(): string {
  const custom = process.env.WEBSITE_SESSION_COOKIE_NAME?.trim();
  if (custom) return custom;
  return isSecureAuthCookieEnv()
    ? "__Secure-odokho-website.session-token"
    : "odokho-website.session-token";
}

/** Admin dashboard session cookie name (for staff detection on the website). */
export function adminSessionCookieName(): string {
  const custom = process.env.ADMIN_SESSION_COOKIE_NAME?.trim();
  if (custom) return custom;
  return isSecureAuthCookieEnv()
    ? "__Secure-odokho-admin.session-token"
    : "odokho-admin.session-token";
}

/**
 * Cookie domain: only when COOKIE_DOMAIN is set in env.
 * Default host-only so www.odokho.com does not share/overwrite admin cookies.
 */
export function getAuthCookieDomain(): string | undefined {
  const explicit = process.env.COOKIE_DOMAIN?.trim();
  return explicit || undefined;
}
