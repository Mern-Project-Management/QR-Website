import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isStaffRole, normalizeRoleValue } from "@/lib/resolveUserRole";

/**
 * Detect admin/editor staff by decoding the shared NextAuth session cookie
 * using the **admin app's** NEXTAUTH_SECRET.
 *
 * Admin (admin.odokho.com) and the customer website are separate NextAuth
 * apps. When staff log into the admin panel, the session cookie is set on
 * `.odokho.com`, but the website cannot decode it with its own secret.
 * This route uses ADMIN_NEXTAUTH_SECRET (must match admin NEXTAUTH_SECRET).
 */
export async function GET(req: NextRequest) {
  const adminSecret =
    process.env.ADMIN_NEXTAUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";

  if (!adminSecret) {
    return NextResponse.json({ isStaff: false, role: null });
  }

  const useSecure =
    process.env.NODE_ENV === "production" ||
    !!process.env.NEXTAUTH_URL?.startsWith("https://");

  const token = await getToken({
    req,
    secret: adminSecret,
    cookieName: useSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token",
  });

  const role = normalizeRoleValue(token?.role);
  return NextResponse.json({
    isStaff: isStaffRole(role),
    role,
  });
}
