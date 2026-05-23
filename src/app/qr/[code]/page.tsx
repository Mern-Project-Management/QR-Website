"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminOrigin } from "@/lib/adminOrigin";

export default function QRRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const ADMIN_ORIGIN = getAdminOrigin();

  useEffect(() => {
    if (!code) return;

    const checkQR = async () => {
      try {
        const res = await fetch(`https://admin.odokho.com/api/public/qr/${code}`);

        console.log(res, "RES RES RES RES RES");


      } catch (err) {
        // router.replace("/404");
      }
    };

    checkQR();
  }, [code, router, ADMIN_ORIGIN]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 20,
      }}
    >
      Loading QR...
    </div>
  );
}
