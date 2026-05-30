// src/app/api/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminOrigin } from "@/lib/adminOrigin";

const ADMIN_ORIGIN = getAdminOrigin();
const GOOGLE_REVIEWS_PUBLIC_TOKEN = process.env.GOOGLE_REVIEWS_PUBLIC_TOKEN;

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const url = `${ADMIN_ORIGIN}/api/${path.join("/")}${req.nextUrl.search}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const cookie = req.headers.get("cookie");
    if (cookie) headers.cookie = cookie;

    // Attach public token only for Google Reviews API calls
    if (path[0] === "google-reviews" && GOOGLE_REVIEWS_PUBLIC_TOKEN) {
        headers["x-public-token"] = GOOGLE_REVIEWS_PUBLIC_TOKEN;
    }

    const res = await fetch(url, {
        method: req.method,
        headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
        redirect: "follow", // ← server follows redirect, browser never sees it
    });

    const data = await res.text();
    return new NextResponse(data, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
    });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;