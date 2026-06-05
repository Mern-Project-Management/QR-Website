"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ShieldCheck,
  Phone,
  MessageCircle,
  AlertTriangle,
  Headset,
  Lock,
  Send,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  ArrowLeft,
  Car,
  PawPrint,
  QrCode,
  Sparkles,
  MapPin,
  User,
} from "lucide-react";
import { getAdminOrigin } from "@/lib/adminOrigin";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";
import { isStaffSession } from "@/lib/resolveUserRole";
import Image from "next/image";

const isPetQrCategory = (cat: string) => /pet|dog|cat/i.test(cat);
const isVehicleQrCategory = (cat: string) => /vehicle|car|bike|motor/i.test(cat);

type Phase = "dispatch" | "activate" | "contact" | "blocked";

interface AssetVehicle {
  make?: string | null;
  model?: string | null;
  registration?: string | null;
  nickname?: string | null;
  variant?: string | null;
  year?: string | null;
  color?: string | null;
  vin?: string | null;
  fuel?: string | null;
  insuranceNo?: string | null;
}

interface AssetPet {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  notes?: string | null;
}

interface AssetOwner {
  fullName?: string | null;
  address?: string | null;
  customMessage?: string | null;
}

interface AssetDetails {
  name?: string | null;
  imagePath?: string | null;
  category?: string | null;
  vehicle?: AssetVehicle | null;
  pet?: AssetPet | null;
  owner?: AssetOwner | null;
}

interface LandingData {
  uniqueId: string;
  category: string;
  status: string;
  phase: Phase;
  scans: number;
  defaultImagePath: string;
  assetName: string | null;
  assetDetails?: AssetDetails | null;
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

function getAssetImageSrc(imagePath: string | null | undefined, fallback = "/images/default-qr.png"): string {
  if (!imagePath?.trim()) return fallback;
  const path = imagePath.trim();
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/api/") || path.startsWith("/upload")) {
    return `${getAdminOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
  }
  const resolved = resolveBackendImageSrc(path, fallback);
  return typeof resolved === "string" ? resolved : fallback;
}

function buildContactDisplay(data: LandingData) {
  const details = data.assetDetails;
  const category = (details?.category || data.category || "").trim();
  const vehicle = details?.vehicle;
  const pet = details?.pet;
  const owner = details?.owner;
  const isVehicle = isVehicleQrCategory(category);
  const isPet = isPetQrCategory(category);

  let primaryTitle = (data.assetName || details?.name || "").trim();
  const subtitleLines: string[] = [];

  if (isVehicle && vehicle) {
    if (!primaryTitle) {
      primaryTitle =
        (vehicle.registration || vehicle.nickname || "").trim() || "Vehicle";
    }
    const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ").trim();
    const yearColor = [vehicle.year, vehicle.color].filter(Boolean).join(" · ").trim();
    if (makeModel) subtitleLines.push(makeModel);
    if (yearColor) subtitleLines.push(yearColor);
  } else if (isPet && pet) {
    if (!primaryTitle) {
      primaryTitle = (pet.name || "").trim() || "Pet";
    }
    const speciesBreed = [pet.species, pet.breed].filter(Boolean).join(" · ").trim();
    if (speciesBreed) subtitleLines.push(speciesBreed);
    if (pet.notes?.trim()) subtitleLines.push(pet.notes.trim());
  }

  if (!primaryTitle) {
    primaryTitle = data.uniqueId;
  }

  const defaultMessage = isVehicle
    ? "Thanks for caring! Please let me know if there's an issue with my vehicle."
    : isPet
      ? "Thanks for caring! Please let me know if you found my pet."
      : "Thanks for reaching out!";

  const ownerMessage = owner?.customMessage?.trim() || defaultMessage;
  const imageSrc = getAssetImageSrc(details?.imagePath || data.defaultImagePath);
  const ownerName = owner?.fullName?.trim() || "";

  return { primaryTitle, subtitleLines, ownerMessage, imageSrc, ownerName, category };
}

/* ─── Design system (QR scan experience) ─── */
const SHELL =
  "relative mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100 font-dm text-slate-900 sm:max-w-xl lg:max-w-2xl";
const PAGE = "flex flex-1 flex-col px-4 pb-10 pt-4 sm:px-6 sm:pt-6";
const CARD = "rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/40";
const CARD_PAD = "p-5 sm:p-6";
const LABEL = "mb-1.5 block text-xs font-semibold text-slate-700";
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const BTN_PRIMARY =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_SECONDARY =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400";
const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400";

function QrBrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
        <QrCode className="h-5 w-5" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-slate-900">Odokho</p>
        <p className="text-[11px] font-medium text-slate-500">Secure QR Contact</p>
      </div>
    </div>
  );
}

function QrPageHeader({
  title,
  subtitle,
  onBack,
  badge,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  badge?: string;
}) {
  return (
    <header className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className={BTN_GHOST} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <QrBrandMark />
        )}
        {badge && (
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
            {badge}
          </span>
        )}
      </div>
      {title && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}

function AlertBanner({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-blue-200 bg-blue-50 text-blue-900";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium leading-relaxed ${styles}`} role="alert">
      {children}
    </div>
  );
}

function PrivacyNote({ children }: { children?: React.ReactNode }) {
  return (
    <div className={`${CARD} flex items-start gap-3 ${CARD_PAD}`}>
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
      <p className="text-sm leading-relaxed text-slate-600">
        {children ?? (
          <>
            Your phone number is <span className="font-semibold text-slate-800">never shared</span> with the owner.
            Communication stays private and masked.
          </>
        )}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/80 px-4 py-6 text-center backdrop-blur-sm sm:px-6">
      <p className="text-xs font-medium text-slate-500">Privacy-first · Numbers never exposed</p>
      <p className="mt-2 text-xs text-slate-400">
        Powered by <span className="font-bold text-blue-600">Odokho Digital Service</span>
      </p>
    </footer>
  );
}

function LoadingScreen() {
  return (
    <div className={SHELL}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-blue-100 animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-blue-600" aria-hidden />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-base font-semibold text-slate-900">Loading QR</p>
          <p className="text-sm text-slate-500">Fetching secure contact details…</p>
        </div>
      </div>
    </div>
  );
}

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

  if (loading) return <LoadingScreen />;

  if (err || !data) {
    return (
      <div className={SHELL}>
        <div className={`${PAGE} flex flex-1 flex-col justify-center`}>
          <div className={`${CARD} ${CARD_PAD} text-center`}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Unable to load QR</h1>
            <p className="mt-2 text-sm text-slate-600">{err || "This QR could not be loaded. Check the code and try again."}</p>
            <button type="button" className={`${BTN_PRIMARY} mt-6`} onClick={() => { setErr(null); reload(); }}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QR not yet dispatched OR explicitly blocked → show the "Not Active" screen
  // (matches the design: no admin/dispatch text, no footer).
  const isNotActive = data.phase === "blocked" || data.phase === "dispatch";

  return (
    <div className={SHELL}>
      <main className="flex flex-1 flex-col">
        {isNotActive && <BlockedSection />}
        {data.phase === "activate" && (
          <ActivateSection uniqueId={uniqueId} category={data.category} prefill={data.prefill} />
        )}
        {data.phase === "contact" && <ContactSection uniqueId={uniqueId} data={data} />}
      </main>
      {!isNotActive && <Footer />}
    </div>
  );
}

function BlockedSection() {
  return (
    <div className={PAGE}>
      <QrPageHeader badge="Inactive" />
      <div className={`${CARD} ${CARD_PAD} text-center`}>
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-10 w-10 text-amber-600" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">QR not active yet</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This code hasn&apos;t been linked to an owner, or it has been temporarily disabled.
        </p>
      </div>
      <div className="mt-6 space-y-3">
        <Link href="/contact" className={BTN_PRIMARY}>
          <Headset className="h-5 w-5" />
          Contact support
        </Link>
        <a href="tel:+911234567890" className={BTN_SECONDARY}>
          <Phone className="h-5 w-5" />
          Call support
        </a>
      </div>
      <div className="mt-6">
        <PrivacyNote>Only verified owners can activate an Odokho QR and enable secure contact.</PrivacyNote>
      </div>
    </div>
  );
}

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARD} ${CARD_PAD} space-y-4`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function PhoneInput({
  value,
  onChange,
  required,
  placeholder = "Mobile number",
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <div className="relative w-[5.5rem] shrink-0">
        <select
          className={`${INPUT} appearance-none pr-8 font-semibold`}
          defaultValue="+91"
          aria-label="Country code"
        >
          <option>+91</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      <input
        required={required}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 15))}
        className={INPUT}
        placeholder={placeholder}
        autoComplete="tel"
      />
    </div>
  );
}

type ContactView = "contact" | "verify" | "emergency";

type ContactReasonOption = { label: string; value: string };

const VEHICLE_CONTACT_REASONS: ContactReasonOption[] = [
  { label: "Wrong Parking", value: "GENERAL" },
  { label: "Lights On", value: "OTHER" },
  { label: "Door Open", value: "OTHER" },
  { label: "Tow Alert", value: "OTHER" },
  { label: "Accident", value: "DAMAGED" },
  { label: "Other", value: "OTHER" },
];

const PET_CONTACT_REASONS: ContactReasonOption[] = [
  { label: "Found Pet", value: "FOUND" },
  { label: "Lost / Escaped", value: "RETURN" },
  { label: "Injured / Hurt", value: "DAMAGED" },
  { label: "Needs Help", value: "GENERAL" },
  { label: "Other", value: "OTHER" },
];

function getContactReasons(category: string): ContactReasonOption[] {
  if (isPetQrCategory(category)) return PET_CONTACT_REASONS;
  if (isVehicleQrCategory(category)) return VEHICLE_CONTACT_REASONS;
  return [
    { label: "Found Item", value: "FOUND" },
    { label: "Return / Handover", value: "RETURN" },
    { label: "General", value: "GENERAL" },
    { label: "Other", value: "OTHER" },
  ];
}

function QrFlowNav({
  current,
  verifyLabel = "Verify",
}: {
  current: ContactView;
  verifyLabel?: string;
}) {
  const steps: { id: ContactView; label: string }[] = [
    { id: "contact", label: "Contact" },
    { id: "verify", label: verifyLabel },
    { id: "emergency", label: "Emergency" },
  ];
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <nav className="mb-6" aria-label="Progress">
      <ol className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-semibold">
        {steps.map((step, index) => {
          const isActive = step.id === current;
          const isPast = index < currentIndex;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {index > 0 && <span className="text-slate-300" aria-hidden>›</span>}
              <span
                className={`rounded-full px-3 py-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isPast
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

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
  const [customOwnerMessage, setCustomOwnerMessage] = useState("");

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

      const message = customOwnerMessage.trim();
      if (message) payload.custom_owner_message = message;

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
      <div className={PAGE}>
        <QrPageHeader badge="Active" />
        <div className={`${CARD} ${CARD_PAD} text-center`}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">You&apos;re all set</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Your QR is active. We sent a welcome email with your login link — check inbox and spam.
          </p>
          <div className="mt-6 space-y-3">
            <Link href="/login" className={BTN_PRIMARY}>
              Go to login
            </Link>
            <Link href="/" className={BTN_SECONDARY}>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const trustItems = [
    { icon: Lock, label: "Privacy protected" },
    { icon: Phone, label: "Masked calls" },
    { icon: ShieldCheck, label: "Verified safety" },
  ];

  return (
    <div className={PAGE}>
      <QrPageHeader title={heading} subtitle={subheading} badge="Activate" />

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {trustItems.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-3 text-center shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold leading-tight text-slate-700 sm:text-[11px]">{label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-5">
        <FormSection
          icon={<User className="h-5 w-5" />}
          title="Personal information"
          description="How finders and support can reach you."
        >
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Full name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={INPUT}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
            <div>
              <label className={LABEL}>Mobile number</label>
              <PhoneInput value={phone} onChange={setPhone} required />
            </div>
            <div>
              <label className={LABEL}>
                Email <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className={LABEL}>
                Address <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={INPUT}
                placeholder="House / street, city"
                autoComplete="street-address"
              />
            </div>
            <div>
              <label className={LABEL}>
                Custom message for finders <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={customOwnerMessage}
                onChange={(e) => setCustomOwnerMessage(e.target.value)}
                className={`${INPUT} resize-none`}
                placeholder="e.g. Thanks for caring! Please let me know if there is an issue."
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Shown to people who scan your QR after activation ({customOwnerMessage.length}/2000).
              </p>
            </div>
          </div>
        </FormSection>

        {isVehicle && (
          <FormSection icon={<Car className="h-5 w-5" />} title="Vehicle details" description="Shown to people who scan your QR.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Make</label>
                  <input required value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className={INPUT} placeholder="Hyundai" />
                </div>
                <div>
                  <label className={LABEL}>Model</label>
                  <input required value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className={INPUT} placeholder="i20" />
                </div>
              </div>
              <div>
                <label className={LABEL}>Registration number</label>
                <input
                  required
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                  className={INPUT}
                  placeholder="GJ01AB1234"
                />
              </div>
              <div>
                <label className={LABEL}>
                  Nickname <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input value={vehicleNickname} onChange={(e) => setVehicleNickname(e.target.value)} className={INPUT} placeholder="My daily ride" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>
                    Color <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} className={INPUT} placeholder="White" />
                </div>
                <div>
                  <label className={LABEL}>
                    Year <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    inputMode="numeric"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={INPUT}
                    placeholder="2022"
                  />
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {isPet && (
          <FormSection icon={<PawPrint className="h-5 w-5" />} title="Pet details" description="Helps finders identify your pet quickly.">
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Pet name</label>
                <input required value={petName} onChange={(e) => setPetName(e.target.value)} className={INPUT} placeholder="Bruno" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>
                    Species <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} className={INPUT} placeholder="Dog" />
                </div>
                <div>
                  <label className={LABEL}>
                    Breed <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input value={petBreed} onChange={(e) => setPetBreed(e.target.value)} className={INPUT} placeholder="Labrador" />
                </div>
              </div>
              <div>
                <label className={LABEL}>
                  Notes for finder <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={petNotes}
                  onChange={(e) => setPetNotes(e.target.value)}
                  className={`${INPUT} resize-none`}
                  placeholder="Friendly, medication, microchip, etc."
                />
              </div>
            </div>
          </FormSection>
        )}

        <FormSection
          icon={<AlertCircle className="h-5 w-5" />}
          title="Emergency contacts"
          description="Two different numbers we alert in urgent situations."
        >
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Contact 1</label>
              <PhoneInput value={emergency1} onChange={setEmergency1} required placeholder="Primary emergency" />
            </div>
            <div>
              <label className={LABEL}>Contact 2</label>
              <PhoneInput value={emergency2} onChange={setEmergency2} required placeholder="Secondary emergency" />
            </div>
          </div>
        </FormSection>

        {error && <AlertBanner tone="error">{error}</AlertBanner>}

        <div className="sticky bottom-0 -mx-4 border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            <Sparkles className="h-4 w-4" />
            {saving ? "Activating…" : "Activate QR"}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">By activating you agree to our privacy-first contact policy.</p>
        </div>
      </form>
    </div>
  );
}

interface ContactSectionProps {
  uniqueId: string;
  data: LandingData;
}

function ContactSection({ uniqueId, data }: ContactSectionProps) {
  const [view, setView] = useState<ContactView>("contact");
  const [verifyMode, setVerifyMode] = useState<"call" | "sms">("call");

  const display = useMemo(() => buildContactDisplay(data), [data]);
  const contactReasons = useMemo(() => getContactReasons(display.category), [display.category]);
  const [selectedReason, setSelectedReason] = useState(contactReasons[0]?.value ?? "GENERAL");

  useEffect(() => {
    const list = getContactReasons(display.category);
    setSelectedReason(list[0]?.value ?? "GENERAL");
  }, [display.category]);

  const selectedReasonLabel =
    contactReasons.find((r) => r.value === selectedReason)?.label ?? selectedReason;

  const isVehicle = isVehicleQrCategory(display.category);

  const openVerify = (mode: "call" | "sms") => {
    setVerifyMode(mode);
    setView("verify");
  };

  if (view === "verify") {
    return (
      <VerifyNumberView
        uniqueId={uniqueId}
        setView={setView}
        assetLabel={display.primaryTitle}
        mode={verifyMode}
        reason={selectedReason}
        reasonLabel={selectedReasonLabel}
      />
    );
  }
  if (view === "emergency") {
    return (
      <ReportEmergencyView
        setView={setView}
        uniqueId={uniqueId}
        assetLabel={display.primaryTitle}
        category={display.category}
      />
    );
  }

  return (
    <div className={PAGE}>
      <QrFlowNav current="contact" />
      <QrPageHeader title="Contact owner" subtitle="Choose how to reach them securely. Your number stays private." badge="Active" />

      {/* Asset hero — light card + dark text for reliable contrast */}
      <div
        className={`${CARD} relative mb-6 overflow-hidden border-l-4 border-l-blue-600 ${CARD_PAD}`}
        style={{
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f8fafc 100%)",
        }}
      >
        <div className="relative flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                {isVehicle ? "Vehicle" : isPetQrCategory(display.category) ? "Pet" : display.category}
              </span>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            </div>
            <h2 className="break-words text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
              {display.primaryTitle}
            </h2>
            {display.subtitleLines.length > 0 ? (
              <p className="mt-2 break-words text-sm font-medium leading-relaxed text-slate-600">
                {display.subtitleLines.join(" • ")}
              </p>
            ) : (
              <p className="mt-2 break-words text-sm capitalize text-slate-600">{display.category}</p>
            )}
          </div>
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:h-24 sm:w-24">
            <Image
              src={display.imageSrc}
              alt={display.primaryTitle}
              fill
              sizes="96px"
              className="object-contain p-2"
              unoptimized={display.imageSrc.startsWith("http")}
            />
          </div>
        </div>
      </div>

      {/* Owner message */}
      <div className={`${CARD} mb-6 overflow-hidden`}>
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            {display.ownerName ? `Message from ${display.ownerName}` : "Owner message"}
          </p>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{display.ownerMessage}</p>
      </div>

      {/* Reason */}
      <div className="mb-6">
        <h3 className="mb-1 text-sm font-bold text-slate-900">What&apos;s the reason?</h3>
        <p className="mb-3 text-xs text-slate-500">
          {isVehicle ? "Vehicle-related reasons" : isPetQrCategory(display.category) ? "Pet-related reasons" : "Choose the best match"}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Contact reason">
          {contactReasons.map((r) => {
            const selected = selectedReason === r.value;
            return (
              <button
                key={`${r.value}-${r.label}`}
                type="button"
                onClick={() => setSelectedReason(r.value)}
                aria-pressed={selected}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">How would you like to connect?</h3>

        <button
          type="button"
          onClick={() => openVerify("call")}
          className={`${CARD} flex w-full items-center gap-4 p-4 text-left transition hover:border-emerald-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">Call owner securely</p>
            <p className="text-xs text-slate-500">Masked number · verify once</p>
          </div>
          <ChevronDown className="-rotate-90 h-5 w-5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => openVerify("sms")}
          className={`${CARD} flex w-full items-center gap-4 p-4 text-left transition hover:border-orange-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">SMS owner securely</p>
            <p className="text-xs text-slate-500">Private text · same verification</p>
          </div>
          <ChevronDown className="-rotate-90 h-5 w-5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => setView("emergency")}
          className={`${CARD} flex w-full items-center gap-4 border-red-200/80 p-4 text-left transition hover:border-red-300 hover:bg-red-50/30 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-red-900">Report emergency</p>
            <p className="text-xs text-red-700/80">Urgent only · alerts owner & contacts</p>
          </div>
          <ChevronDown className="-rotate-90 h-5 w-5 text-red-400" />
        </button>
      </div>

      <PrivacyNote />
    </div>
  );
}

interface VerifyNumberViewProps {
  uniqueId: string;
  setView: React.Dispatch<React.SetStateAction<ContactView>>;
  assetLabel?: string;
  mode?: "call" | "sms";
  reason: string;
  reasonLabel: string;
}

function VerifyNumberView({
  uniqueId,
  setView,
  assetLabel,
  mode = "call",
  reason,
  reasonLabel,
}: VerifyNumberViewProps) {
  const [step, setStep] = useState<"phone" | "otp" | "ready">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [callData, setCallData] = useState<{ did: string; connectionId: string } | null>(null);

  const title = mode === "sms" ? "Verify for SMS" : "Verify for call";
  const Icon = mode === "sms" ? MessageCircle : Phone;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const deallocateMaskedCall = useCallback(async (connectionId: string) => {
    if (!connectionId) return;
    try {
      await fetch(`/api/public/qr/${uniqueId}/masked-call`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
        keepalive: true,
      });
    } catch {
      // best effort
    } finally {
      setCallData(null);
    }
  }, [uniqueId]);

  useEffect(() => {
    const sendBeacon = () => {
      if (!callData?.connectionId || typeof navigator === "undefined" || !navigator.sendBeacon) return;
      const body = JSON.stringify({ action: "deallocate", connectionId: callData.connectionId });
      navigator.sendBeacon(`/api/public/qr/${uniqueId}/masked-call`, new Blob([body], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", sendBeacon);
    return () => window.removeEventListener("beforeunload", sendBeacon);
  }, [callData?.connectionId, uniqueId]);

  const requestOtp = async () => {
    setError("");
    setSuccess("");
    if (!/^\d{8,15}$/.test(phone)) {
      setError("Enter a valid mobile number (8–15 digits).");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "call" ? "masked-call" : "contact";
      const res = await fetch(`/api/public/qr/${uniqueId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "call"
            ? { callerNumber: phone, requestOtp: true }
            : { contactPhone: phone, requestOtp: true },
        ),
      });
      const json = await res.json();
      if (!json.success) {
        if (typeof json.cooldown === "number") setCooldown(Number(json.cooldown));
        setError(json.message || "Failed to send OTP");
        return;
      }
      setStep("otp");
      setSuccess(json.message || "OTP sent to your phone.");
      if (json.otp) setSuccess(`OTP sent (dev): ${json.otp}`);
      setCooldown(30);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyAndContinue = async () => {
    setError("");
    setSuccess("");
    if (!/^\d{4,8}$/.test(otp)) {
      setError("Enter the OTP sent to your phone.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "call") {
        const res = await fetch(`/api/public/qr/${uniqueId}/masked-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callerNumber: phone, otp, reason }),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.message || "Verification or call setup failed");
          return;
        }
        const did = String(json.did || "").trim();
        const connectionId = String(json.connectionId || "").trim();
        if (did && connectionId) {
          setCallData({ did, connectionId });
          setStep("ready");
          setSuccess("Masked number ready. Tap below to call the owner.");
          if (typeof window !== "undefined") {
            try {
              const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
              if (isTouch) window.location.href = `tel:${did}`;
            } catch {
              // ignore
            }
          }
        } else {
          setError(json.message || "Could not allocate masked number");
        }
      } else {
        const res = await fetch(`/api/public/qr/${uniqueId}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactPhone: phone, otp, reason }),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.message || "Verification failed");
          return;
        }
        setStep("ready");
        setSuccess(json.message || "Owner has been notified securely.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={PAGE}>
      <QrFlowNav current="verify" verifyLabel={mode === "sms" ? "Verify SMS" : "Verify call"} />
      <QrPageHeader
        title={step === "ready" ? (mode === "call" ? "Call ready" : "Message sent") : title}
        subtitle={
          assetLabel
            ? `Verify your number before contacting ${assetLabel}.`
            : "We verify your number once to prevent misuse."
        }
        onBack={() => {
          if (callData?.connectionId) void deallocateMaskedCall(callData.connectionId);
          setView("contact");
        }}
        badge="Step 2"
      />

      {reasonLabel && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Reason:</span> {reasonLabel}
        </div>
      )}

      {step !== "ready" && (
        <div className={`${CARD} ${CARD_PAD} mb-6 text-center`}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-sm text-slate-600">
            {step === "phone"
              ? "Enter your mobile number and we will send a one-time code."
              : "Enter the OTP we sent to your phone."}
          </p>
        </div>
      )}

      {error && <div className="mb-4"><AlertBanner tone="error">{error}</AlertBanner></div>}
      {success && <div className="mb-4"><AlertBanner tone="success">{success}</AlertBanner></div>}

      {step === "phone" && (
        <div className="space-y-5">
          <div>
            <label className={LABEL}>Your mobile number</label>
            <PhoneInput value={phone} onChange={setPhone} required />
          </div>
          <button type="button" onClick={requestOtp} disabled={busy || cooldown > 0} className={BTN_PRIMARY}>
            <Send className="h-4 w-4" />
            {busy ? "Sending OTP…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Send OTP"}
          </button>
          <button type="button" onClick={() => setView("contact")} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-5">
          <AlertBanner tone="info">
            Code sent to <span className="font-bold">+91 {phone}</span>.
            <button type="button" onClick={() => setStep("phone")} className="ml-1 font-bold underline">
              Change number
            </button>
          </AlertBanner>
          <div>
            <label className={LABEL}>Enter OTP</label>
            <input
              className={INPUT}
              placeholder="6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={requestOtp}
                disabled={busy || cooldown > 0}
                className="text-xs font-bold text-blue-600 disabled:text-slate-400"
              >
                {cooldown > 0 ? `Resend OTP (${String(cooldown).padStart(2, "0")}s)` : "Resend OTP"}
              </button>
            </div>
          </div>
          <button type="button" onClick={verifyAndContinue} disabled={busy} className={BTN_PRIMARY}>
            <ShieldCheck className="h-4 w-4" />
            {busy
              ? mode === "call"
                ? "Verifying…"
                : "Sending…"
              : mode === "call"
                ? "Verify OTP & get call number"
                : "Verify OTP & notify owner"}
          </button>
          <button type="button" onClick={() => setView("contact")} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      )}

      {step === "ready" && mode === "call" && callData && (
        <div className={`${CARD} ${CARD_PAD} space-y-4`}>
          <p className="text-sm font-medium text-slate-700">Dial this masked number to reach the owner:</p>
          <p className="font-mono text-2xl font-bold text-slate-900">{callData.did}</p>
          <a href={`tel:${callData.did}`} className={BTN_PRIMARY}>
            <Phone className="h-4 w-4" />
            Call now
          </a>
          <button
            type="button"
            onClick={() => {
              void deallocateMaskedCall(callData.connectionId);
              setStep("phone");
              setOtp("");
              setSuccess("");
            }}
            className={BTN_SECONDARY}
          >
            Done
          </button>
        </div>
      )}

      {step === "ready" && mode === "sms" && (
        <div className="space-y-4">
          <button type="button" onClick={() => setView("contact")} className={BTN_PRIMARY}>
            Back to contact
          </button>
        </div>
      )}

      <div className="mt-6">
        <PrivacyNote>We never share your number with the owner.</PrivacyNote>
      </div>
    </div>
  );
}

interface ReportEmergencyViewProps {
  setView: React.Dispatch<React.SetStateAction<ContactView>>;
  uniqueId: string;
  assetLabel?: string;
  category: string;
}

function getEmergencyIssues(category: string) {
  if (isPetQrCategory(category)) {
    return [
      { id: "found", label: "Found pet" },
      { id: "lost", label: "Lost / escaped" },
      { id: "injured", label: "Injured pet" },
      { id: "other", label: "Other urgent" },
    ];
  }
  return [
    { id: "accident", label: "Accident" },
    { id: "damage", label: "Vehicle damage" },
    { id: "blocking", label: "Blocking access" },
    { id: "other", label: "Other" },
  ];
}

function ReportEmergencyView({ setView, uniqueId, assetLabel, category }: ReportEmergencyViewProps) {
  const issues = useMemo(() => getEmergencyIssues(category), [category]);

  const [step, setStep] = useState<"form" | "verify">("form");
  const [selectedIssue, setSelectedIssue] = useState(issues[0]?.id ?? "other");

  useEffect(() => {
    setSelectedIssue(issues[0]?.id ?? "other");
  }, [issues]);
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
    <div className={PAGE}>
      <QrFlowNav current="emergency" />
      <QrPageHeader
        title={step === "verify" ? "Confirm emergency" : "Report emergency"}
        subtitle={
          assetLabel
            ? `Urgent alert for ${assetLabel}. Owner and emergency contacts will be notified.`
            : "Help the owner and their emergency contacts immediately."
        }
        onBack={() => (step === "verify" ? setStep("form") : setView("contact"))}
        badge="Urgent"
      />

      {step === "form" && (
        <div className="space-y-5">
          <FormSection icon={<AlertTriangle className="h-5 w-5 text-red-600" />} title="What happened?" description="Select the closest match.">
            <div className="space-y-2" role="radiogroup" aria-label="Emergency issue type">
              {issues.map((issue) => {
                const isSelected = selectedIssue === issue.id;
                return (
                  <button
                    key={issue.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedIssue(issue.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                      isSelected ? "border-red-300 bg-red-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          isSelected ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{issue.label}</span>
                    </span>
                    <span
                      className={`h-5 w-5 rounded-full border-2 ${
                        isSelected ? "border-red-600 bg-red-600 ring-4 ring-red-100" : "border-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection icon={<Phone className="h-5 w-5" />} title="Your number" description="We'll send a one-time code to verify you.">
            <PhoneInput value={contactPhone} onChange={setContactPhone} required />
          </FormSection>

          <div className={`${CARD} flex items-center justify-between ${CARD_PAD}`}>
            <div className="pr-4">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MapPin className="h-4 w-4 text-blue-600" />
                Share location
              </p>
              <p className="mt-1 text-xs text-slate-500">Helps the owner respond faster.</p>
            </div>
            <button
              type="button"
              onClick={() => setUseLocation((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${useLocation ? "bg-blue-600" : "bg-slate-300"}`}
              role="switch"
              aria-checked={useLocation}
              aria-label="Use current location"
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  useLocation ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {error && <AlertBanner tone="error">{error}</AlertBanner>}

          <button
            type="button"
            onClick={requestOtp}
            disabled={busy || cooldown > 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {busy ? "Sending OTP…" : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP & continue"}
          </button>
          <button type="button" onClick={() => setView("contact")} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-5">
          <AlertBanner tone="info">
            Code sent to <span className="font-bold">+91 {contactPhone}</span>.
            <button type="button" onClick={() => setStep("form")} className="ml-1 font-bold underline">
              Change number
            </button>
          </AlertBanner>

          <div>
            <label className={LABEL}>Enter OTP</label>
            <input
              type="tel"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className={INPUT}
              placeholder="6-digit OTP"
              autoFocus
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={requestOtp}
                disabled={busy || cooldown > 0}
                className="text-xs font-bold text-blue-600 disabled:text-slate-400"
              >
                {cooldown > 0 ? `Resend OTP (${String(cooldown).padStart(2, "0")}s)` : "Resend OTP"}
              </button>
            </div>
          </div>

          {error && <AlertBanner tone="error">{error}</AlertBanner>}
          {success && <AlertBanner tone="success">{success}</AlertBanner>}

          <button
            type="button"
            onClick={verifyAndSend}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {busy ? "Sending alert…" : "Verify & send alert"}
          </button>
          <button type="button" onClick={() => setView("contact")} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      )}

      <div className="mt-6">
        <PrivacyNote>Alerts go to the owner and their emergency contacts right away.</PrivacyNote>
      </div>
    </div>
  );
}
