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

        if (!res.ok) {
          router.replace("/404");
          return;
        }

        const data = await res.json();

        console.log(data, "QRRR statusssss DATATATTATATATAT");
        

        // check QR status
        if (data.status == "DISPATCHED") {
           window.location.href = `https://www.odokho.com/qr/${code}`;
        }

        window.location.href = `${ADMIN_ORIGIN}/qr/${code}`;
      } catch (err) {
        router.replace("/404");
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
