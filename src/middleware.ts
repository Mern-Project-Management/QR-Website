import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protect routes that require an authenticated session.
//
// We intentionally implement this manually instead of using
// `next-auth/middleware`'s `withAuth`, because withAuth builds the sign-in
// redirect URL from the NEXTAUTH_URL env var, which is easy to misconfigure on
// the live server (e.g. left pointing at http://localhost:3059). By building
// the redirect URL from the incoming request, the redirect always uses the
// same origin the user is browsing on — production, staging or local.
export async function middleware(request: NextRequest) {
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) return NextResponse.next();

    // Build a same-origin redirect to our custom /login page.
    const callbackPath = request.nextUrl.pathname + request.nextUrl.search;

    // Prefer x-forwarded-* (set by reverse proxies like Nginx) so we don't
    // accidentally redirect to the internal host:port behind the proxy.
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const host = forwardedHost || request.headers.get('host') || request.nextUrl.host;
    const proto = forwardedProto || request.nextUrl.protocol.replace(':', '');

    const loginUrl = new URL(`${proto}://${host}/login`);
    loginUrl.searchParams.set('callbackUrl', callbackPath);

    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/checkout', '/checkout-2'],
};
