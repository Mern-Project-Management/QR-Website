import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isStaffRole, normalizeRoleValue } from "@/lib/resolveUserRole";
import { adminSessionCookieName } from "@/lib/session-cookies";

/**
 * Fallback staff detection when admin cookie is sent to the website host
 * (e.g. COOKIE_DOMAIN=.odokho.com). Prefer client fetch to
 * `${ADMIN_ORIGIN}/api/auth/staff-check` with credentials.
 */
export async function GET(req: NextRequest) {
  const adminSecret =
    process.env.ADMIN_NEXTAUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";

  if (!adminSecret) {
    return NextResponse.json({ isStaff: false, role: null });
  }

  const token = await getToken({
    req,
    secret: adminSecret,
    cookieName: adminSessionCookieName(),
  });

  const role = normalizeRoleValue(token?.role);
  return NextResponse.json({
    isStaff: isStaffRole(role),
    role,
  });
}
