"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAdminOrigin } from "@/lib/adminOrigin";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";
import Image from "next/image";

const isPetQrCategory = (cat: string) => /pet|dog|cat/i.test(cat);
const isVehicleQrCategory = (cat: string) => /vehicle|car|bike|motor/i.test(cat);

type Phase = "dispatch" | "activate" | "contact" | "blocked";

interface LandingData {
  uniqueId: string;
  category: string;
  status: string;
  phase: Phase;
  scans: number;
  defaultImagePath: string;
  assetName: string | null;
  createdAt: string;
  scanUrl: string;
  prefill: { name: string; email: string } | null;
  expiresAt?: string | null;
  expiredContactName?: string | null;
  expiredContactEmail?: string | null;
  expiredContactPhone?: string | null;
  expiredMessage?: string | null;
}

const CONTACT_REASONS = [
  { value: "FOUND", label: "Found item / property" },
  { value: "RETURN", label: "Return / handover" },
  { value: "DAMAGED", label: "Damage concern" },
  { value: "GENERAL", label: "General inquiry" },
  { value: "OTHER", label: "Other" },
];

export default function QRLandingPage() {
  const params = useParams();
  const rawId = params?.uniqueId as string;
  if (!rawId) return null;
  return <QrLandingClient uniqueId={rawId} />;
}

function QrLandingClient({ uniqueId: raw }: { uniqueId: string }) {
  const uniqueId = raw.trim().toUpperCase();
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<LandingData | null>(null);
  const ADMIN_ORIGIN = getAdminOrigin();

  const [deviceId] = useState(() => {
    if (typeof window === "undefined") return "";
    const key = "qr_device_id";
    try {
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;
      const v =
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(key, v);
      return v;
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  });

  const isStaff = useMemo(() => {
    const rawRole = (session?.user as { role?: unknown })?.role;
    const roleName =
      typeof rawRole === "string"
        ? rawRole
        : typeof rawRole?.name === "string"
          ? rawRole.name
          : "";
    return roleName === "admin" || roleName === "editor";
  }, [session]);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const headers: Record<string, string> = {};
      if (deviceId) headers["x-qr-device-id"] = deviceId;
      const res = await fetch(`${ADMIN_ORIGIN}/api/public/qr/${uniqueId}`, {
        headers: Object.keys(headers).length ? headers : undefined,
      });
      const json = await res.json();
      if (!json.success) {
        setErr(json.message || "Failed to load");
        setData(null);
      } else {
        setData(json.data);
      }
    } catch {
      setErr("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      if (!isMounted) return;
      setLoading(true);
      setErr(null);
      try {
        const headers: Record<string, string> = {};
        if (deviceId) headers["x-qr-device-id"] = deviceId;
        const res = await fetch(`${ADMIN_ORIGIN}/api/public/qr/${uniqueId}`, {
          headers: Object.keys(headers).length ? headers : undefined,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!isMounted) return;
        if (!json.success) {
          setErr(json.message || "Failed to load");
          setData(null);
        } else {
          setData(json.data);
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        if (error instanceof Error && error.name === "AbortError") return;
        setErr("Network error");
        setData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [uniqueId, deviceId, ADMIN_ORIGIN]);

  useEffect(() => {
    if (!data) return;
    if (data.status === "Expired") {
      router.replace(`/qr/${uniqueId}/expired`);
      return;
    }
    if (data.status === "Disabled") {
      router.replace(`/qr/${uniqueId}/disabled`);
    }
  }, [data, router, uniqueId]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 px-6 py-16">
        <div className="relative">
          <span
            className="absolute inset-0 animate-ping rounded-full bg-primary/20"
            aria-hidden
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            Loading QR
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Preparing your secure link…
          </p>
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-8 text-center shadow-sm dark:bg-red-500/10">
          <p className="text-lg font-semibold text-red-600">
            Something went wrong
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {err || "This QR could not be loaded."}
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 sm:w-auto"
            onClick={() => {
              setErr(null);
              reload();
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const defaultQrImageSrc = "/images/default-qr.png";

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:max-w-2xl sm:px-6 sm:py-12">
      <header className="mb-8 sm:mb-10">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/80 px-5 py-8 text-center shadow-md dark:border-white/10 dark:from-[#0e1726] dark:to-[#0b1420]">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-black/30 dark:ring-white/10">
            <Image
              src={resolveBackendImageSrc(data.defaultImagePath, defaultQrImageSrc) as string}
              alt=""
              width={96}
              height={96}
              className="rounded-xl object-cover sm:h-24 sm:w-24"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.endsWith("default-qr.png")) {
                  el.src = defaultQrImageSrc;
                }
              }}
            />
          </div>
          <p className="font-mono text-2xl font-bold tracking-[0.2em] text-primary sm:text-3xl">
            {data.uniqueId}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {data.category}
            </span>
            {data.assetName ? (
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {data.assetName}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Total scans recorded:{" "}
            <strong className="text-gray-900 dark:text-white">
              {data.scans}
            </strong>
          </p>
        </div>
      </header>

      {data.phase === "blocked" && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center dark:border-white/10 dark:bg-white/5">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            Unavailable
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This QR is not available — it may be disabled or expired.
          </p>
        </div>
      )}

      {data.phase === "dispatch" && !session && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
            Sign in required
          </p>
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">
            Contact admin to dispatch this QR This QR is not yet dispatched.
          </p>

        </div>
      )}

      {data.phase === "dispatch" && session && (
        <DispatchSection
          uniqueId={uniqueId}
          data={data}
          session={session}
          isStaff={isStaff}
          router={router}
          onDone={reload}
          adminOrigin={ADMIN_ORIGIN}
        />
      )}

      {data.phase === "activate" && (
        <ActivateSection
          uniqueId={uniqueId}
          category={data.category}
          router={router}
          adminOrigin={ADMIN_ORIGIN}
        />
      )}

      {data.phase === "contact" && (
        <ContactSection uniqueId={uniqueId} onDone={reload} adminOrigin={ADMIN_ORIGIN} />
      )}
    </div>
  );
}

type OrderListRow = {
  id: string;
  status: string;
  totalAmount: string | number | null;
  shippingName: string | null;
  customerName: string | null;
  items?: Array<{ name?: string | null; sku?: string | null; options?: unknown }> | null;
};

function DispatchSection({
  uniqueId,
  data,
  session,
  isStaff,
  router,
  onDone,
  adminOrigin,
}: {
  uniqueId: string;
  data: LandingData;
  session: ReturnType<typeof useSession>["data"];
  isStaff: boolean;
  router: ReturnType<typeof useRouter>;
  onDone: () => void;
  adminOrigin: string;
}) {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderListRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [manualOrderId, setManualOrderId] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError(null);
    (async () => {
      try {
        const category = String(data.category || "").trim().toLowerCase();
        const url = category
          ? `${adminOrigin}/api/orders?limit=150&page=1&category=${encodeURIComponent(
            category
          )}`
          : `${adminOrigin}/api/orders?limit=150&page=1`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data as OrderListRow[]);
        } else {
          setOrders([]);
          setOrdersError(json.message || "Could not load orders");
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
          setOrdersError("Could not load orders");
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, data.category, adminOrigin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${adminOrigin}/api/public/qr/${uniqueId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId.trim(),
          notes,
          metadata: {
            dispatcherName: session?.user?.name || data.prefill?.name,
            dispatcherEmail: session?.user?.email || data.prefill?.email,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg("Dispatched successfully.");
        if (isStaff) {
          router.push("/qr-dispatch");
          return;
        }
        onDone();
      } else {
        setMsg(json.message || "Failed");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#0e1726]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4 dark:border-white/10 dark:from-primary/10">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
            1
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Dispatch this QR
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Link this code to an order so the buyer can register and activate it.
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {!open ? (
          <button
            type="button"
            className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary/90 hover:shadow-md"
            onClick={() => {
              setOpen(true);
              setOrderId("");
              setNotes("");
              setMsg(null);
              setManualOrderId(false);
            }}
          >
            Start dispatch
          </button>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                Order
              </label>
              {ordersLoading ? (
                <div className="flex min-h-[46px] items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:bg-white/5">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                  Loading recent orders…
                </div>
              ) : !manualOrderId && orders.length > 0 ? (
                <>
                  <select
                    className="min-h-[46px] w-full rounded-xl border-gray-300 font-mono text-sm dark:border-white/10 dark:bg-[#131c2e] dark:text-white"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required
                  >
                    <option value="">Select an order…</option>
                    {orders.map((o) => {
                      const label = o.id.slice(0, 8).toUpperCase();
                      const who = o.shippingName || o.customerName || "Guest";
                      const total = parseFloat(String(o.totalAmount ?? 0)).toFixed(2);
                      return (
                        <option key={o.id} value={o.id}>
                          #{label}… · {who} · ₹{total} · {o.status}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                    onClick={() => {
                      setManualOrderId(true);
                      setOrderId("");
                    }}
                  >
                    Enter order ID manually instead
                  </button>
                </>
              ) : (
                <>
                  {ordersError && (
                    <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      {ordersError} — paste the full order UUID below.
                    </p>
                  )}
                  <input
                    className="min-h-[46px] w-full rounded-xl border-gray-300 font-mono text-sm dark:border-white/10 dark:bg-[#131c2e] dark:text-white"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    required
                    autoComplete="off"
                  />
                  {orders.length > 0 && (
                    <button
                      type="button"
                      className="mt-2 text-sm font-medium text-primary hover:underline"
                      onClick={() => {
                        setManualOrderId(false);
                        setOrderId("");
                      }}
                    >
                      Choose from list instead
                    </button>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                Notes <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <textarea
                className="min-h-[96px] w-full rounded-xl border-gray-300 dark:border-white/10 dark:bg-[#131c2e] dark:text-white"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal note for this dispatch…"
              />
            </div>
            {session?.user && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/90 px-4 py-3 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-white">
                  Signed in
                </span>{" "}
                — {session.user.name || session.user.email}. Dispatcher details
                will be stored with this dispatch.
              </div>
            )}
            {msg && (
              <p
                className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.includes("success") || msg.includes("Dispatched")
                    ? "bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  }`}
              >
                {msg}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 sm:w-auto sm:min-w-[120px]"
                onClick={() => {
                  setOpen(false);
                  setOrderId("");
                  setNotes("");
                  setMsg(null);
                  setManualOrderId(false);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-3 font-semibold text-white hover:bg-primary/90 sm:w-auto sm:min-w-[180px]"
                disabled={saving}
              >
                {saving ? "Saving…" : "Submit dispatch"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function ActivateSection({
  uniqueId,
  category,
  router,
  adminOrigin,
}: {
  uniqueId: string;
  category: string;
  router: ReturnType<typeof useRouter>;
  adminOrigin: string;
}) {
  const showVehicle = isVehicleQrCategory(category);
  const showPet = isPetQrCategory(category);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleNickname, setVehicleNickname] = useState("");
  const [vehicleVariant, setVehicleVariant] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleVin, setVehicleVin] = useState("");
  const [vehicleFuel, setVehicleFuel] = useState("");
  const [vehicleInsuranceNo, setVehicleInsuranceNo] = useState("");

  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petNotes, setPetNotes] = useState("");

  const [ecPhone1, setEcPhone1] = useState("");
  const [ecPhone2, setEcPhone2] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const categoryLabel = category.trim() || "This item";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${adminOrigin}/api/public/qr/${uniqueId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email: email || null,
          address,
          vehicleMake: showVehicle ? vehicleMake : undefined,
          vehicleModel: showVehicle ? vehicleModel : undefined,
          vehicleReg: showVehicle ? vehicleReg : undefined,
          vehicleNickname: showVehicle ? vehicleNickname || null : undefined,
          vehicleVariant: showVehicle ? vehicleVariant || null : undefined,
          vehicleYear: showVehicle ? vehicleYear || null : undefined,
          vehicleColor: showVehicle ? vehicleColor || null : undefined,
          vehicleVin: showVehicle ? vehicleVin || null : undefined,
          vehicleFuel: showVehicle ? vehicleFuel || null : undefined,
          vehicleInsuranceNo: showVehicle ? vehicleInsuranceNo || null : undefined,
          petName: showPet ? petName : undefined,
          petSpecies: showPet ? petSpecies || null : undefined,
          petBreed: showPet ? petBreed || null : undefined,
          petNotes: showPet ? petNotes || null : undefined,
          emergencyPhones: [ecPhone1.trim(), ecPhone2.trim()],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg("Profile saved. QR is now activated.");
        router.push(`/qr/${uniqueId}/profile`);
      } else {
        setMsg(json.message || "Failed");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "min-h-[48px] w-full rounded-xl border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary focus:ring-primary/20 dark:border-white/15 dark:bg-[#131c2e] dark:text-white px-3 py-2";

  const sectionShell =
    "relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#131c2e]/80 sm:p-6";
  const sectionTitle = "text-base font-bold text-gray-900 dark:text-white";
  const sectionHint = "mt-1 text-sm text-gray-500 dark:text-gray-400";
  const labelClass = "mb-2 block text-sm font-semibold text-gray-900 dark:text-white";

  return (
    <form
      id="qr-activate-form"
      onSubmit={submit}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0e1726]"
    >
      <div className="border-b border-gray-100 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5 dark:border-white/10 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-bold text-primary">
            2
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Register and activate
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Complete your details so finders can reach the right people. This QR is for{" "}
              <span className="font-semibold text-primary">{categoryLabel}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 pb-24 sm:space-y-6 sm:p-6 sm:pb-6">
        <div className={sectionShell}>
          <div className="border-l-4 border-primary pl-4">
            <h3 className={sectionTitle}>Your details</h3>
            <p className={sectionHint}>Primary owner or account holder for this QR.</p>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label className={labelClass}>
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                className={fieldClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Address <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary focus:ring-primary/20 dark:border-white/15 dark:bg-[#131c2e] dark:text-white px-3 py-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>
          </div>
        </div>

        {showVehicle && (
          <div className={sectionShell}>
            <div className="border-l-4 border-primary pl-4">
              <h3 className={sectionTitle}>Vehicle details</h3>
              <p className={sectionHint}>
                Required: make, model, and registration. Add the rest so responders have full context.
              </p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Make (brand) <span className="text-red-500">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  required={showVehicle}
                  placeholder="e.g. Maruti Suzuki"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  required={showVehicle}
                  placeholder="e.g. Swift"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Variant / trim <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleVariant}
                  onChange={(e) => setVehicleVariant(e.target.value)}
                  placeholder="e.g. ZXI+ AMT"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Year <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  maxLength={4}
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="e.g. 2022"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Registration number <span className="text-red-500">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                  required={showVehicle}
                  placeholder="e.g. KA01AB1234"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Colour <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  placeholder="e.g. Pearl white"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  VIN / chassis <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleVin}
                  onChange={(e) => setVehicleVin(e.target.value.toUpperCase())}
                  placeholder="17-character VIN if known"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Fuel type <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleFuel}
                  onChange={(e) => setVehicleFuel(e.target.value)}
                  placeholder="Petrol / Diesel / EV…"
                  autoComplete="off"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Vehicle nickname <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleNickname}
                  onChange={(e) => setVehicleNickname(e.target.value)}
                  placeholder="What you call this vehicle"
                  autoComplete="off"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Insurance policy number <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={vehicleInsuranceNo}
                  onChange={(e) => setVehicleInsuranceNo(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        )}

        {showPet && (
          <div className={sectionShell}>
            <div className="border-l-4 border-primary pl-4">
              <h3 className={sectionTitle}>Pet details</h3>
              <p className={sectionHint}>Help others identify your pet if this tag is found.</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Pet name <span className="text-red-500">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  required={showPet}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Species <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={petSpecies}
                  onChange={(e) => setPetSpecies(e.target.value)}
                  placeholder="Dog, cat…"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Breed <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  className={fieldClass}
                  value={petBreed}
                  onChange={(e) => setPetBreed(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Identifying notes <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  className="min-h-[88px] w-full rounded-xl border border-gray-300 bg-white text-gray-900 shadow-sm dark:border-white/15 dark:bg-[#131c2e] dark:text-white px-3 py-2"
                  value={petNotes}
                  onChange={(e) => setPetNotes(e.target.value)}
                  placeholder="Colour marks, medical notes finders should know…"
                />
              </div>
            </div>
          </div>
        )}

        <div className={sectionShell}>
          <div className="border-l-4 border-amber-500 pl-4">
            <h3 className={sectionTitle}>Emergency phone numbers</h3>
            <p className={sectionHint}>
              Enter <strong className="font-semibold text-gray-900 dark:text-white">two different phone numbers</strong> we can call or SMS if
              this QR is used in an emergency. Numbers only — both are required.
            </p>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label className={labelClass}>
                Emergency number 1 <span className="text-red-500">*</span>
              </label>
              <input
                className={fieldClass}
                value={ecPhone1}
                onChange={(e) => setEcPhone1(e.target.value)}
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 …"
              />
            </div>
            <div>
              <label className={labelClass}>
                Emergency number 2 <span className="text-red-500">*</span>
              </label>
              <input
                className={fieldClass}
                value={ecPhone2}
                onChange={(e) => setEcPhone2(e.target.value)}
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 …"
              />
            </div>
          </div>
        </div>

        {msg && (
          <p
            className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.includes("success") || msg.includes("activated") || msg.includes("Profile saved")
                ? "bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400"
              }`}
          >
            {msg}
          </p>
        )}
        <button
          type="submit"
          className="hidden w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-white shadow-md hover:bg-primary/90 sm:block"
          disabled={saving}
        >
          {saving ? "Saving…" : "Activate QR and open profile"}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/90 p-3 backdrop-blur dark:border-white/10 dark:bg-[#0e1726]/90 sm:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              Activating QR: <span className="font-mono font-semibold text-primary">{uniqueId}</span>
            </p>
          </div>
          <button
            form="qr-activate-form"
            type="submit"
            className="flex min-w-[180px] items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90"
            disabled={saving}
          >
            {saving ? "Saving…" : "Activate"}
          </button>
        </div>
      </div>
    </form>
  );
}

function ContactSection({ uniqueId, onDone, adminOrigin }: { uniqueId: string; onDone: () => void; adminOrigin: string }) {
  const [reason, setReason] = useState("GENERAL");
  const [message, setMessage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyBusy, setEmergencyBusy] = useState(false);
  const [emergencyNote, setEmergencyNote] = useState<string | null>(null);

  type CallState = "idle" | "submitting" | "allocated" | "calling" | "failed";
  const [callState, setCallState] = useState<CallState>("idle");
  const [callData, setCallData] = useState<{ did: string; connectionId: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deallocateMaskedCall = useCallback(
    async (connectionId: string) => {
      if (!connectionId) return;
      try {
        await fetch(`${adminOrigin}/api/public/qr/${uniqueId}/masked-call`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId }),
          keepalive: true,
        });
      } catch {
        // ignore
      } finally {
        setCallData(null);
        setCallState("idle");
      }
    },
    [uniqueId, adminOrigin]
  );

  const openDialer = useCallback((did: string) => {
    setCallState("calling");
    window.location.href = `tel:${did}`;
  }, []);

  useEffect(() => {
    const sendDeallocationBeacon = () => {
      if (!callData?.connectionId || typeof navigator === "undefined" || !navigator.sendBeacon) return;
      const body = JSON.stringify({ action: "deallocate", connectionId: callData.connectionId });
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`${adminOrigin}/api/public/qr/${uniqueId}/masked-call`, blob);
    };

    window.addEventListener("beforeunload", sendDeallocationBeacon);
    return () => window.removeEventListener("beforeunload", sendDeallocationBeacon);
  }, [callData?.connectionId, uniqueId, adminOrigin]);

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setCallState("submitting");
    setErrorMessage(null);
    setCallData(null);
    try {
      const res = await fetch(`${adminOrigin}/api/public/qr/${uniqueId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, message: message || null, contactPhone }),
      });
      const json = await res.json();
      if (!json.success) {
        setCallState("failed");
        setErrorMessage(json.message || "Failed to send contact request");
        return;
      }

      try {
        const callRes = await fetch(`${adminOrigin}/api/public/qr/${uniqueId}/masked-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callerNumber: contactPhone }),
        });

        const callJson = await callRes.json().catch(() => ({}));
        if (callRes.ok && callJson?.success) {
          const did = String(callJson?.did || "").trim();
          const connectionId = String(callJson?.connectionId || "").trim();
          if (did && connectionId) {
            setCallData({ did, connectionId });
            setCallState("allocated");
            if (typeof window !== "undefined") {
              try {
                const isCoarsePointer =
                  typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
                const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
                if (isCoarsePointer || isTouch) {
                  openDialer(did);
                }
              } catch {
                // ignore
              }
            }
          } else {
            setCallState("failed");
            setErrorMessage("Request recorded, but masked call allocation failed");
          }
        } else {
          setCallState("failed");
          setErrorMessage(
            callJson?.message
              ? `Request recorded, but masked call could not be started: ${callJson.message}`
              : "Request recorded, but masked call could not be started."
          );
        }
      } catch {
        setCallState("failed");
        setErrorMessage("Request recorded, but masked call could not be started.");
      }
    } catch {
      setCallState("failed");
      setErrorMessage("Network error");
    }
  };

  const sendEmergency = async () => {
    if (!emergencyPhone.trim()) {
      setEmergencyNote("Enter your contact number for emergency.");
      return;
    }
    setEmergencyBusy(true);
    setEmergencyNote(null);
    try {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 12000 }
        );
      });
      const lat = pos ? String(pos.coords.latitude) : null;
      const lng = pos ? String(pos.coords.longitude) : null;
      const res = await fetch(`${adminOrigin}/api/public/qr/${uniqueId}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPhone: emergencyPhone.trim(),
          latitude: lat,
          longitude: lng,
          locationLabel: pos ? "GPS fix" : "Location unavailable",
        }),
      });
      const json = await res.json();
      setEmergencyNote(json.success ? "Emergency alerts queued." : json.message || "Failed");
    } catch {
      setEmergencyNote("Network error");
    } finally {
      setEmergencyBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submitContact}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#0e1726]"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4 dark:border-white/10 dark:from-primary/10">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
              C
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                Contact the owner
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Send a short request. The owner may reach you on the number you provide.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
              Reason
            </label>
            <select
              className="min-h-[46px] w-full rounded-xl border border-gray-300 dark:border-white/10 dark:bg-[#131c2e] dark:text-white px-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {CONTACT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
              Message <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-xl border border-gray-300 dark:border-white/10 dark:bg-[#131c2e] dark:text-white px-3 py-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Briefly describe how you found this or what you need…"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
              Your phone number
            </label>
            <input
              className="min-h-[46px] w-full rounded-xl border border-gray-300 dark:border-white/10 dark:bg-[#131c2e] dark:text-white px-3"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
              inputMode="tel"
              placeholder="Used for a possible callback"
            />
          </div>
          {callState === "allocated" && callData && (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
              <p className="mb-3">Masked call ready. Dial {callData.did} to connect.</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="min-h-[42px] rounded-xl border border-gray-300 bg-white font-mono text-sm px-3 dark:border-white/10 dark:bg-black/20 sm:max-w-[190px]"
                  value={callData.did}
                  readOnly
                />
                <a
                  href={`tel:${callData.did}`}
                  onClick={() => openDialer(callData.did)}
                  className="w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-white sm:w-auto px-4"
                >
                  Call now
                </a>
                <button
                  type="button"
                  onClick={() => deallocateMaskedCall(callData.connectionId)}
                  className="w-full rounded-xl border border-red-500 py-2.5 text-center text-sm font-semibold text-red-600 sm:w-auto px-4 hover:bg-red-50"
                >
                  End call
                </button>
              </div>
            </div>
          )}
          {callState === "failed" && errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <p>{errorMessage}</p>
            </div>
          )}
          {callState === "calling" && (
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <p>Call in progress…</p>
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-white shadow-sm hover:bg-primary/90"
            disabled={callState === "submitting" || callState === "allocated" || callState === "calling"}
          >
            {callState === "submitting" ? "Calling Now…" : "Call Now"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border-2 border-red-500/40 bg-gradient-to-b from-red-500/[0.08] to-red-500/[0.04] p-5 shadow-md dark:border-red-500/50 dark:from-red-500/20 dark:to-red-500/10 sm:p-6">
        <div className="text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-600">
            Serious use only
          </span>
          <h3 className="mt-3 text-xl font-bold text-red-600">Emergency alert</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            Notifies all emergency contacts. Location is shared when you allow browser access.
          </p>
        </div>
        <div className="mx-auto mt-5 max-w-md space-y-3">
          <input
            className="min-h-[48px] w-full rounded-xl border border-red-300 px-3 py-2"
            placeholder="Your phone number (required)"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            inputMode="tel"
          />
          <button
            type="button"
            className="w-full rounded-xl bg-red-600 py-3.5 text-base font-bold text-white shadow-sm hover:bg-red-700"
            onClick={sendEmergency}
            disabled={emergencyBusy}
          >
            {emergencyBusy ? "Sending…" : "Notify emergency contacts"}
          </button>
          {emergencyNote && (
            <p className="rounded-xl bg-white/60 px-4 py-3 text-center text-sm text-gray-800 dark:bg-black/30 dark:text-gray-100">
              {emergencyNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
