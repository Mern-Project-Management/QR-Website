import { NextRequest, NextResponse } from "next/server";
import { getAdminOrigin } from "@/lib/adminOrigin";

const ADMIN_ORIGIN = getAdminOrigin();

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const customerToken = req.headers.get("x-customer-token") || "";
  const cookie = req.headers.get("cookie") || "";

  const res = await fetch(`${ADMIN_ORIGIN}/api/razorpay/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { authorization: auth } : {}),
      ...(customerToken ? { "x-customer-token": customerToken } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: await req.text(),
    redirect: "follow",
    cache: "no-store",
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

