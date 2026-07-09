import { NextRequest, NextResponse } from 'next/server';
import { getAdminOrigin } from '@/lib/adminOrigin';

/** Public map redirect — proxies to backend which resolves alert id → Google Maps. */
export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
        return new NextResponse('Not Found', { status: 404 });
    }

    const adminOrigin = getAdminOrigin().replace(/\/$/, '');
    const upstream = await fetch(`${adminOrigin}/api/public/m?id=${encodeURIComponent(id)}`, {
        redirect: 'manual',
        cache: 'no-store',
    });

    if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get('location');
        if (location) {
            return NextResponse.redirect(location, 302);
        }
    }

    return new NextResponse('Not Found', { status: 404 });
}
