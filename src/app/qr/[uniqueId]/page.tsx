"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, Phone, MessageCircle, AlertTriangle, BadgeCheck, Headset, Lock, Send, AlertCircle, ChevronDown, CheckCircle2 } from "lucide-react";
import { getAdminOrigin } from "@/lib/adminOrigin";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";
import { isStaffSession } from "@/lib/resolveUserRole";
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
  viewerIsStaff?: boolean;
}

const Footer = () => (
  <div className="mt-8 pb-6 text-center space-y-4 px-4">
    <p className="text-[11px] text-gray-500 font-medium">
      Your privacy is protected.<br />
      Phone numbers are never shared.
    </p>
    <p className="text-[11px] font-medium text-gray-400">
      Powered by <span className="text-blue-600 font-bold">Odokho Digital Service</span>
    </p>
  </div>
);

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
  const [adminStaff, setAdminStaff] = useState(false);
  const ADMIN_ORIGIN = getAdminOrigin();

  const [deviceId] = useState(() => {
    if (typeof window === "undefined") return "";
    const key = "qr_device_id";
    try {
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;
      const v = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(key, v);
      return v;
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  });

  const isStaffFromWebsiteSession = useMemo(() => isStaffSession(session), [session]);
  const isStaff = adminStaff || !!data?.viewerIsStaff || isStaffFromWebsiteSession;

  // Admin session lives on admin.odokho.com (separate cookie). Detect staff via
  // cross-origin request so we never overwrite the admin cookie on the website.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const checkStaff = async (url: string, init?: RequestInit) => {
        const res = await fetch(url, { cache: "no-store", ...init });
        if (!res.ok) return false;
        const json = (await res.json()) as { isStaff?: boolean };
        return !!json.isStaff;
      };

      try {
        const fromAdmin = await checkStaff(`${ADMIN_ORIGIN}/api/auth/staff-check`, {
          credentials: "include",
          mode: "cors",
        });
        if (!cancelled && fromAdmin) {
          setAdminStaff(true);
          return;
        }
      } catch {
        // CORS or network — try same-origin fallback
      }

      try {
        const fromLocal = await checkStaff("/api/staff-session");
        if (!cancelled) setAdminStaff(fromLocal);
      } catch {
        // fall back to viewerIsStaff from QR API payload
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [ADMIN_ORIGIN]);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const headers: Record<string, string> = {};
      if (deviceId) headers["x-qr-device-id"] = deviceId;
      const res = await fetch(`/api/public/qr/${uniqueId}`, {
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
        const res = await fetch(`/api/public/qr/${uniqueId}`, {
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

    if (data.phase === "dispatch" && isStaff) {
      window.location.href = `${ADMIN_ORIGIN}/qr-dispatch/?qr=${uniqueId}`;
      return;
    }

    if (data.status === "Expired") {
      router.replace(`/qr/${uniqueId}/expired`);
      return;
    }
    if (data.status === "Disabled") {
      router.replace(`/qr/${uniqueId}/disabled`);
    }
  }, [data, router, uniqueId, isStaff, ADMIN_ORIGIN]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 px-6 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-red-600">Something went wrong</p>
          <p className="mt-2 text-sm text-gray-600">{err || "This QR could not be loaded."}</p>
          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => { setErr(null); reload(); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // QR not yet dispatched OR explicitly blocked → show the "Not Active" screen
  // (matches the design: no admin/dispatch text, no footer).
  const isNotActive = data.phase === "blocked" || data.phase === "dispatch";

  return (
    <div className="mx-auto max-w-md bg-white min-h-screen">
      {isNotActive && <BlockedSection />}
      {data.phase === "activate" && (
        <ActivateSection uniqueId={uniqueId} category={data.category} prefill={data.prefill} />
      )}
      {data.phase === "contact" && (
        <ContactSection uniqueId={uniqueId} data={data} />
      )}
      {!isNotActive && <Footer />}
    </div>
  );
}

function BlockedSection() {
  return (
    <div className="flex flex-col items-center pt-12 px-6">
      <div className="h-24 w-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">This QR Code is<br />Not Active</h2>
      <p className="text-center text-gray-500 mb-8 px-4 text-sm leading-relaxed">
        This QR hasn&apos;t been linked to an owner yet or is temporarily disabled.
      </p>
      <div className="w-full space-y-3">
        <button className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2">
          <Headset className="w-5 h-5" />
          Contact Support
        </button>
        <button className="w-full bg-white border border-blue-200 text-blue-600 rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-sm">
          <Phone className="w-5 h-5" />
          Call Support
        </button>
      </div>
      <div className="w-full mt-8 flex items-center justify-center gap-3 bg-[#F4F7FF] p-4 rounded-xl">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        <p className="text-xs text-gray-600 font-medium leading-tight">Only verified owners can<br />activate Odokho QR</p>
      </div>
    </div>
  );
}

// Reusable input styles
const fieldClass =
  "w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium placeholder-gray-400 shadow-sm";
const labelClass = "block text-[11px] font-bold text-gray-900 mb-1.5";
const sectionTitleClass =
  "flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-3";

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className={sectionTitleClass}>
      <span className="bg-blue-50 text-blue-700 rounded-md p-1">{icon}</span>
      {title}
    </div>
  );
}

type ContactView = "contact" | "verify" | "emergency";

interface ActivateSectionProps {
  uniqueId: string;
  category: string;
  prefill: LandingData["prefill"];
}

function ActivateSection({ uniqueId, category, prefill }: ActivateSectionProps) {
  const isVehicle = isVehicleQrCategory(category);
  const isPet = isPetQrCategory(category);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [activated, setActivated] = useState(false);
  const didSuccessAlertRef = React.useRef(false);

  // personal
  const [fullName, setFullName] = useState<string>(prefill?.name || "");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>(prefill?.email || "");
  const [address, setAddress] = useState<string>("");

  // vehicle
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleNickname, setVehicleNickname] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");

  // pet
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petNotes, setPetNotes] = useState("");

  // emergency
  const [emergency1, setEmergency1] = useState("");
  const [emergency2, setEmergency2] = useState("");

  const heading = isVehicle
    ? "Activate Your Vehicle QR"
    : isPet
      ? "Activate Your Pet QR"
      : "Activate Your Smart QR";

  const subheading = isVehicle
    ? "Let people reach you about your vehicle without exposing your number."
    : isPet
      ? "If your pet is found, the finder can reach you safely and instantly."
      : "Help people contact you securely if your tagged item is found.";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!emergency1.trim() || !emergency2.trim()) {
      setError("Please enter both emergency contact numbers.");
      return;
    }
    if (emergency1.replace(/\D/g, "") === emergency2.replace(/\D/g, "")) {
      setError("Emergency Contact 1 and 2 must be different numbers.");
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergencyPhones: [emergency1.trim(), emergency2.trim()],
      };

      if (isVehicle) {
        payload.vehicleMake = vehicleMake.trim();
        payload.vehicleModel = vehicleModel.trim();
        payload.vehicleReg = vehicleReg.trim();
        if (vehicleNickname.trim()) payload.vehicleNickname = vehicleNickname.trim();
        if (vehicleColor.trim()) payload.vehicleColor = vehicleColor.trim();
        if (vehicleYear.trim()) payload.vehicleYear = vehicleYear.trim();
      }

      if (isPet) {
        payload.petName = petName.trim();
        if (petSpecies.trim()) payload.petSpecies = petSpecies.trim();
        if (petBreed.trim()) payload.petBreed = petBreed.trim();
        if (petNotes.trim()) payload.petNotes = petNotes.trim();
      }

      const res = await fetch(`/api/public/qr/${uniqueId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message || "Activation failed");
        return;
      }
      setActivated(true);
      if (!didSuccessAlertRef.current) {
        didSuccessAlertRef.current = true;
        // User requested an explicit alert on successful activation.
        window.alert("QR activated successfully. A welcome email has been sent — please check your inbox.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (activated) {
    return (
      <div className="flex flex-col px-5 pt-12 pb-10">
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">QR Activated Successfully</h2>
          <p className="mt-2 text-sm font-medium text-gray-600">
            We&apos;ve sent a welcome email with the login link. Please check your inbox (and spam folder).
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3">
            <Link
              href="/login"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-extrabold text-white hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
            <Link
              href="/"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-bold text-gray-800 hover:bg-gray-50 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-5 pt-8 pb-6">
      {/* Hero */}
      <div className="mb-6">
        <h2 className="text-[26px] font-bold text-gray-900 leading-tight tracking-tight">{heading}</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{subheading}</p>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { icon: <Lock className="w-4 h-4 text-white" />, label: "Privacy\nProtected" },
          { icon: <Phone className="w-4 h-4 text-white" />, label: "Secure\nCalling" },
          { icon: <ShieldCheck className="w-4 h-4 text-white" />, label: "Enhanced\nSafety" },
        ].map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-2 text-center bg-blue-50/60 rounded-xl py-3">
            <div className="bg-blue-600 rounded-lg p-1.5">{b.icon}</div>
            <span className="text-[10px] font-bold text-gray-700 whitespace-pre-line leading-tight">
              {b.label}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-7">
        {/* Personal */}
        <section>
          <SectionHeader icon={<BadgeCheck className="w-3.5 h-3.5" />} title="Personal Information" />
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={fieldClass}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className={labelClass}>Mobile Number</label>
              <div className="flex gap-2 shadow-sm rounded-xl">
                <div className="relative w-[85px]">
                  <select className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3.5 text-[13px] bg-white font-bold text-gray-900 outline-none">
                    <option>+91</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900" />
                </div>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3.5 text-[13px] outline-none bg-white font-medium placeholder-gray-400"
                  placeholder="Enter mobile number"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email <span className="text-gray-400 font-medium">(optional)</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={labelClass}>Address <span className="text-gray-400 font-medium">(optional)</span></label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={fieldClass}
                placeholder="House/Street, City"
              />
            </div>
          </div>
        </section>

        {/* Vehicle Details */}
        {isVehicle && (
          <section>
            <SectionHeader icon={<CheckCircle2 className="w-3.5 h-3.5" />} title="Vehicle Details" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Make</label>
                  <input
                    required
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. Hyundai"
                  />
                </div>
                <div>
                  <label className={labelClass}>Model</label>
                  <input
                    required
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. i20"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Registration Number</label>
                <input
                  required
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                  className={fieldClass}
                  placeholder="e.g. GJ01AB1234"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Nickname <span className="text-gray-400 font-medium">(optional)</span>
                </label>
                <input
                  value={vehicleNickname}
                  onChange={(e) => setVehicleNickname(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. My Daily Ride"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    Color <span className="text-gray-400 font-medium">(optional)</span>
                  </label>
                  <input
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. White"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Year <span className="text-gray-400 font-medium">(optional)</span>
                  </label>
                  <input
                    inputMode="numeric"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={fieldClass}
                    placeholder="e.g. 2022"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Pet Details */}
        {isPet && (
          <section>
            <SectionHeader icon={<CheckCircle2 className="w-3.5 h-3.5" />} title="Pet Details" />
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Pet Name</label>
                <input
                  required
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. Bruno"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    Species <span className="text-gray-400 font-medium">(optional)</span>
                  </label>
                  <input
                    value={petSpecies}
                    onChange={(e) => setPetSpecies(e.target.value)}
                    className={fieldClass}
                    placeholder="Dog / Cat / Other"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Breed <span className="text-gray-400 font-medium">(optional)</span>
                  </label>
                  <input
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. Labrador"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Notes for Finder <span className="text-gray-400 font-medium">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={petNotes}
                  onChange={(e) => setPetNotes(e.target.value)}
                  className={`${fieldClass} resize-none`}
                  placeholder="e.g. Friendly, not microchipped, on medication"
                />
              </div>
            </div>
          </section>
        )}

        {/* Emergency Contacts */}
        <section>
          <SectionHeader icon={<AlertCircle className="w-3.5 h-3.5" />} title="Emergency Contacts" />
          <p className="text-[12px] text-gray-500 -mt-1 mb-3">
            Two different numbers we can alert if something happens.
          </p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Emergency Contact 1</label>
              <input
                required
                type="tel"
                inputMode="numeric"
                value={emergency1}
                onChange={(e) => setEmergency1(e.target.value.replace(/\D/g, "").slice(0, 15))}
                className={fieldClass}
                placeholder="Enter number"
              />
            </div>
            <div>
              <label className={labelClass}>Emergency Contact 2</label>
              <input
                required
                type="tel"
                inputMode="numeric"
                value={emergency2}
                onChange={(e) => setEmergency2(e.target.value.replace(/\D/g, "").slice(0, 15))}
                className={fieldClass}
                placeholder="Enter number"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1E62F1] hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-4 text-[15px] font-bold shadow-md transition"
          >
            {saving ? "Activating…" : "Activate QR"}
          </button>
          <p className="text-[11px] text-center text-gray-400 mt-3">
            By activating you agree to our privacy-first contact flow.
          </p>
        </div>
      </form>
    </div>
  );
}

interface ContactSectionProps {
  uniqueId: string;
  data: LandingData;
}

const REASONS = ["Wrong Parking", "Lights On", "Door Open", "Tow Alert", "Accident", "Other"] as const;

function ContactSection({ uniqueId, data }: ContactSectionProps) {
  const [view, setView] = useState<ContactView>("contact");
  const [selectedReason, setSelectedReason] = useState<(typeof REASONS)[number]>("Wrong Parking");

  const defaultQrImageSrc = "/images/default-qr.png";
  const bgImg = data?.defaultImagePath ? resolveBackendImageSrc(data.defaultImagePath, defaultQrImageSrc) : defaultQrImageSrc;

  if (view === "verify") return <VerifyNumberView setView={setView} />;
  if (view === "emergency") return <ReportEmergencyView setView={setView} uniqueId={uniqueId} />;

  return (
    <div className="flex flex-col px-4 pt-4 space-y-5">
      {/* Top Card */}
      <div className="rounded-[20px] bg-gradient-to-br from-[#1E62F1] to-[#0A41B5] p-4 flex gap-4 text-white shadow-lg relative overflow-hidden items-center h-[120px]">
        <div className="w-[100px] h-[88px] bg-white/10 rounded-xl flex-shrink-0 flex items-center justify-center relative z-10 overflow-hidden shadow-inner">
          <Image src={bgImg as string} alt="Vehicle" layout="fill" objectFit="cover" className="rounded-xl" />
        </div>
        <div className="flex flex-col justify-center z-10 pt-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <h3 className="text-xl font-bold tracking-tight">{data?.assetName || "GJ01AB1234"}</h3>
            <div className="bg-white rounded-full flex items-center justify-center w-5 h-5">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-blue-100 text-[13px] font-medium leading-snug">Hyundai i20<br />White</p>
        </div>
      </div>

      {/* Owner Message */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 px-1">
          <MessageCircle className="w-4 h-4 text-blue-600 fill-blue-600" />
          <span className="text-[13px] font-bold text-gray-900">Owner Message</span>
        </div>
        <div className="bg-[#F4F7FF] text-gray-800 text-[13px] font-medium p-4 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed">
          Thanks for caring! Please let me know if there&apos;s an issue with my vehicle. 🙏
        </div>
      </div>

      {/* Contact Reasons */}
      <div className="space-y-2.5">
        <h4 className="text-[13px] font-bold text-gray-900 px-1">Why are you contacting the owner?</h4>
        <div className="flex flex-wrap gap-2">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setSelectedReason(r)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all shadow-sm ${selectedReason === r ? 'bg-[#1E62F1] text-white border border-[#1E62F1]' : 'bg-white border border-gray-200 text-gray-700'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-1">
        <button onClick={() => setView('verify')} className="w-full bg-[#22C55E] text-white rounded-xl py-3 flex flex-col items-center justify-center gap-0.5 shadow-md border-b-4 border-green-600/30">
          <div className="flex items-center gap-2 font-bold text-[15px]">
            <Phone className="w-[18px] h-[18px] fill-white" />
            Call Owner Securely
          </div>
          <span className="text-[11px] text-green-100 font-medium tracking-wide">Connect via masked number</span>
        </button>
        <button onClick={() => setView('verify')} className="w-full bg-[#F97316] text-white rounded-xl py-3 flex flex-col items-center justify-center gap-0.5 shadow-md border-b-4 border-orange-600/30">
          <div className="flex items-center gap-2 font-bold text-[15px]">
            <MessageCircle className="w-[18px] h-[18px] fill-white" />
            SMS Owner Securely
          </div>
          <span className="text-[11px] text-orange-100 font-medium tracking-wide">Send a private SMS securely</span>
        </button>
        <button onClick={() => setView('emergency')} className="w-full bg-[#EF4444] text-white rounded-xl py-3 flex flex-col items-center justify-center gap-0.5 shadow-md border-b-4 border-red-600/30">
          <div className="flex items-center gap-2 font-bold text-[15px]">
            <AlertTriangle className="w-[18px] h-[18px] fill-white" />
            Report Emergency
          </div>
          <span className="text-[11px] text-red-100 font-medium tracking-wide">Use only in urgent situations</span>
        </button>
      </div>

      {/* Info */}
      <div className="flex items-center justify-center gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-gray-100 mt-2">
        <ShieldCheck className="w-[22px] h-[22px] text-blue-600 flex-shrink-0" />
        <p className="text-[11px] text-gray-700 font-medium leading-relaxed">
          Your number is never shared.<br />Calls are masked for your privacy.
        </p>
      </div>
    </div>
  );
}

interface VerifyNumberViewProps {
  setView: React.Dispatch<React.SetStateAction<ContactView>>;
}

function VerifyNumberView({ setView }: VerifyNumberViewProps) {
  return (
    <div className="flex flex-col pt-12 px-5">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 bg-[#F0F5FF] rounded-full flex items-center justify-center relative z-10 shadow-inner">
            <ShieldCheck className="w-10 h-10 text-blue-600" />
          </div>
          <div className="absolute top-2 -right-4 w-6 h-6 bg-blue-100 rounded-full opacity-60"></div>
          <div className="absolute bottom-0 -left-6 w-10 h-10 bg-blue-50 rounded-full opacity-80"></div>
        </div>
      </div>
      <h2 className="text-[26px] font-bold text-gray-900 text-center mb-1">Verify Your Number</h2>
      <p className="text-center text-gray-500 mb-10 px-2 text-[13px] leading-relaxed">
        We verify your number to prevent<br />misuse and enable secure communication.
      </p>

      <form className="space-y-6">
        <div>
          <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Mobile Number</label>
          <div className="flex gap-2 shadow-sm rounded-xl">
            <div className="relative w-[85px]">
              <select className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-4 text-[14px] bg-white font-bold text-gray-900 outline-none">
                <option>+91</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900" />
            </div>
            <input className="flex-1 border border-gray-200 rounded-xl px-4 py-4 text-[14px] outline-none bg-white font-medium placeholder-gray-400" placeholder="Enter mobile number" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Enter OTP</label>
          <input className="w-full border border-gray-200 rounded-xl px-4 py-4 text-[14px] outline-none bg-white font-medium placeholder-gray-400 shadow-sm" placeholder="Enter 6-digit OTP" />
          <div className="mt-2 text-right">
            <button type="button" className="text-[12px] font-bold text-[#1E62F1]">Resend OTP (00:30)</button>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <button type="button" className="w-full bg-[#1E62F1] text-white rounded-xl py-4 font-bold shadow-md text-[15px]">
            Verify & Continue
          </button>
          <button
            type="button"
            onClick={() => setView("contact")}
            className="w-full text-[13px] font-bold text-gray-500 py-2"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-8 flex items-center justify-center gap-3 bg-[#F4F7FF] p-4 rounded-xl">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-[12px] font-medium text-gray-800 leading-relaxed">
          We never share your number<br />with the vehicle owner.
        </p>
      </div>
    </div>
  );
}

interface ReportEmergencyViewProps {
  setView: React.Dispatch<React.SetStateAction<ContactView>>;
  uniqueId: string;
}

function ReportEmergencyView({ setView, uniqueId }: ReportEmergencyViewProps) {
  const issues = [
    { id: "accident", label: "Accident" },
    { id: "damage", label: "Vehicle Damage" },
    { id: "blocking", label: "Blocking Access" },
    { id: "other", label: "Other" },
  ];

  const [step, setStep] = useState<"form" | "verify">("form");
  const [selectedIssue, setSelectedIssue] = useState("accident");
  const [useLocation, setUseLocation] = useState(true);
  const [coords, setCoords] = useState<{ lat: string | null; lng: string | null }>({ lat: null, lng: null });

  const [contactPhone, setContactPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const getCoords = useCallback(async (): Promise<{ lat: string | null; lng: string | null }> => {
    if (!useLocation || typeof navigator === "undefined" || !navigator.geolocation) {
      return { lat: null, lng: null };
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 6000 },
      );
    });
  }, [useLocation]);

  const issueLabel = issues.find((i) => i.id === selectedIssue)?.label || "Emergency";

  const requestOtp = async () => {
    setError("");
    setSuccess("");
    if (!/^\d{8,15}$/.test(contactPhone)) {
      setError("Enter a valid mobile number (8–15 digits).");
      return;
    }

    setBusy(true);
    try {
      const c = await getCoords();
      setCoords(c);

      const res = await fetch(`/api/public/qr/${uniqueId}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPhone,
          latitude: c.lat,
          longitude: c.lng,
          locationLabel: issueLabel,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        if (typeof j.cooldown === "number") setCooldown(Number(j.cooldown));
        setError(j.message || "Failed to send OTP. Try again.");
        return;
      }
      setStep("verify");
      setSuccess("OTP sent to your phone");
      setCooldown(30);
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyAndSend = async () => {
    setError("");
    setSuccess("");
    if (!/^\d{4,8}$/.test(otp)) {
      setError("Enter the OTP sent to your phone.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/public/qr/${uniqueId}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPhone,
          otp,
          latitude: coords.lat,
          longitude: coords.lng,
          locationLabel: issueLabel,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.message || "Verification failed");
        return;
      }
      setSuccess("Emergency alert sent. Help is on the way.");
      setTimeout(() => setView("contact"), 1800);
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col pt-10 px-5 pb-8">
      <div className="flex justify-center mb-5">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
      </div>

      <h2 className="text-[24px] font-bold text-gray-900 text-center mb-2">Report Emergency</h2>
      <p className="text-center text-gray-500 mb-8 px-4 text-[13px] leading-relaxed">
        Help the owner and emergency contacts<br />by reporting the situation.
      </p>

      {step === "form" && (
        <>
          <div className="space-y-3 mb-6">
            <h4 className="text-[13px] font-bold text-gray-900 mb-2">What&apos;s the issue?</h4>
            <div className="space-y-2">
              {issues.map((issue) => {
                const isSelected = selectedIssue === issue.id;
                return (
                  <label
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue.id)}
                    className={`flex items-center justify-between p-3.5 rounded-[14px] border cursor-pointer transition-all ${
                      isSelected ? "border-red-400 bg-red-50/50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-red-100" : "bg-gray-100"
                        }`}
                      >
                        {isSelected ? (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <span className={`text-[14px] font-bold ${isSelected ? "text-gray-900" : "text-gray-700"}`}>
                        {issue.label}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        isSelected ? "border-blue-600 bg-white" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-[13px] font-bold text-gray-900 mb-1">Your contact number</h4>
            <p className="text-[11px] text-gray-500 mb-3 font-medium">
              We&apos;ll send a one-time code to verify it&apos;s really you.
            </p>
            <input
              type="tel"
              inputMode="numeric"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
              className={fieldClass}
              placeholder="Enter mobile number"
            />
          </div>

          <div className="mb-6">
            <h4 className="text-[13px] font-bold text-gray-900 mb-1">Share Location</h4>
            <p className="text-[11px] text-gray-500 mb-3 font-medium">
              Location access helps notify the owner and nearby help faster.
            </p>
            <div className="flex items-center justify-between p-3.5 border border-gray-200 rounded-[14px] bg-white">
              <span className="text-[13px] font-bold text-gray-800">Use my current location</span>
              <button
                type="button"
                onClick={() => setUseLocation((v) => !v)}
                className={`w-[42px] h-6 rounded-full p-[2px] transition-colors ${useLocation ? "bg-blue-600" : "bg-gray-300"}`}
                aria-label="Toggle location"
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${useLocation ? "translate-x-[18px]" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700 mb-4">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={requestOtp}
            disabled={busy || cooldown > 0}
            className="w-full bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white rounded-xl py-4 font-bold shadow-md flex items-center justify-center gap-2 text-[15px] mb-3 transition"
          >
            <Send className="w-4 h-4" />
            {busy ? "Sending OTP…" : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP & Continue"}
          </button>

          <button
            type="button"
            onClick={() => setView("contact")}
            className="w-full text-[13px] font-bold text-gray-500 py-2"
          >
            Cancel
          </button>
        </>
      )}

      {step === "verify" && (
        <>
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 mb-5">
            <p className="text-[12px] text-gray-700">
              We sent a code to <span className="font-bold">+91 {contactPhone}</span>.
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-blue-700 font-bold ml-1 hover:underline"
              >
                Change
              </button>
            </p>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Enter OTP</label>
            <input
              type="tel"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className={fieldClass}
              placeholder="6-digit OTP"
              autoFocus
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={requestOtp}
                disabled={busy || cooldown > 0}
                className="text-[12px] font-bold text-[#1E62F1] disabled:text-gray-400"
              >
                {cooldown > 0 ? `Resend OTP (${String(cooldown).padStart(2, "0")}s)` : "Resend OTP"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-medium text-green-700 mb-4">
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={verifyAndSend}
            disabled={busy}
            className="w-full bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white rounded-xl py-4 font-bold shadow-md flex items-center justify-center gap-2 text-[15px] mb-3 transition"
          >
            <Send className="w-4 h-4" />
            {busy ? "Sending alert…" : "Verify & Send Alert"}
          </button>

          <button
            type="button"
            onClick={() => setView("contact")}
            className="w-full text-[13px] font-bold text-gray-500 py-2"
          >
            Cancel
          </button>
        </>
      )}

      <div className="mt-6 flex items-center justify-center gap-3 border border-blue-100 bg-[#F4F7FF] p-4 rounded-xl">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-[12px] font-medium text-gray-700 leading-relaxed">
          Alert will be sent to the owner and<br />their emergency contacts immediately.
        </p>
      </div>
    </div>
  );
}
