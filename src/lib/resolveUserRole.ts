/** Decode a JWT payload without verifying the signature (read claims only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : atob(padded);

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Normalize role from string, `{ name }`, or similar backend shapes. */
export function normalizeRoleValue(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? trimmed.toLowerCase() : null;
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["name", "slug", "code", "type"] as const) {
      const candidate = obj[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim().toLowerCase();
      }
    }
  }

  return null;
}

/** Extract role from a decoded JWT payload (supports common claim names). */
export function roleFromJwtPayload(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;

  const directCandidates = [
    payload.role,
    payload.userRole,
    payload.user_role,
    payload.roleName,
    payload.role_name,
  ];

  for (const candidate of directCandidates) {
    const role = normalizeRoleValue(candidate);
    if (role) return role;
  }

  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    const role = normalizeRoleValue(payload.roles[0]);
    if (role) return role;
  }

  if (payload.user && typeof payload.user === "object") {
    const userObj = payload.user as Record<string, unknown>;
    const nested = normalizeRoleValue(userObj.role ?? userObj.roleName ?? userObj.userRole);
    if (nested) return nested;
  }

  return null;
}

export function roleFromAccessToken(accessToken: string | null | undefined): string | null {
  if (!accessToken || typeof accessToken !== "string") return null;
  return roleFromJwtPayload(decodeJwtPayload(accessToken));
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "editor";
}

type SessionLike = {
  user?: { role?: unknown } | null;
  accessToken?: string | null;
} | null | undefined;

/** Resolve staff status from NextAuth session (session role + JWT fallback). */
export function isStaffSession(session: SessionLike): boolean {
  const sessionRole = normalizeRoleValue(session?.user?.role);
  console.log("sessionRole", sessionRole);
  if (isStaffRole(sessionRole)) return true;

  const jwtRole = roleFromAccessToken(session?.accessToken);
  return isStaffRole(jwtRole);
}

/** Pick the best role string for storing in the NextAuth JWT/session. */
export function resolveRoleForAuth(userRole: unknown, accessToken?: string | null): string {
  const fromUser = normalizeRoleValue(userRole);
  if (fromUser) return fromUser;

  const fromJwt = roleFromAccessToken(accessToken);
  if (fromJwt) return fromJwt;

  return "customer";
}
