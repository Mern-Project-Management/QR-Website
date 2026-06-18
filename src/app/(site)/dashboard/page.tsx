"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PAGE_TOP_PADDING } from "@/lib/siteLayout";
import {
  Loader,
  Moon,
  Sun,
  Eye,
  Edit2,
  Phone,
  Mail,
  MapPin,
  User,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  Trash2,
} from "react-feather";
import Image from "next/image";
import { QrCode, Car, Scan } from "lucide-react";
import { createPortal } from "react-dom";

const ADMIN_ORIGIN = "https://admin.odokho.com";

// Types
interface EmergencyContact {
  name: string;
  phone: string;
}

interface OwnerProfile {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleReg?: string;
  vehicleNickname?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  vehicleVin?: string;
  vehicleFuel?: string;
  vehicleInsuranceNo?: string;
  petName?: string;
  petSpecies?: string;
  petBreed?: string;
  petNotes?: string;
  emergencyContacts?: EmergencyContact[] | null;
}

interface QRCodeData {
  id: number;
  uniqueId: string;
  category: string;
  status: string;
  assetName: string;
  scans: number;
  isActive: boolean;
  dndUntil: string | null;
  isDndActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  defaultImagePath: string;
  scanUrl: string;
  ownerProfile: OwnerProfile;
}

interface MyQRsResponse {
  success: boolean;
  data: QRCodeData[];
  count: number;
}

interface CategoryItem {
  id: string;
  image: string | null;
  title: string;
  is_active?: boolean;
  sort_order?: number;
}

interface DndResponse {
  success: boolean;
  data: {
    id: number;
    uniqueId: string;
    dndUntil: string | null;
    isDndActive: boolean;
  };
  message?: string;
}

// Helper functions
const formatDate = (iso?: string | null) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isVehicleQrCategory = (cat: string) => /vehicle|car|bike|motor/i.test(cat);
const isPetQrCategory = (cat: string) => /pet|dog|cat/i.test(cat);

const findCategoryForQr = (category: string, categories: CategoryItem[]): CategoryItem | undefined => {
  if (!category?.trim() || !categories.length) return undefined;

  const q = category.trim().toLowerCase();
  const exact = categories.find((c) => c.title.trim().toLowerCase() === q);
  if (exact) return exact;

  const partial = categories.find(
    (c) =>
      c.title.trim().toLowerCase().includes(q) ||
      q.includes(c.title.trim().toLowerCase()),
  );
  if (partial) return partial;

  if (isVehicleQrCategory(category)) {
    return categories.find((c) => isVehicleQrCategory(c.title));
  }
  if (isPetQrCategory(category)) {
    return categories.find((c) => isPetQrCategory(c.title));
  }

  return undefined;
};

const getCategoryIconFallback = (category: string, iconSize = 20) => {
  if (isVehicleQrCategory(category)) return <Car size={iconSize} />;
  if (isPetQrCategory(category)) return <User size={iconSize} />;
  return <QrCode size={iconSize} />;
};

const getCategoryImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath?.trim()) return null;
  const path = imagePath.trim();
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${ADMIN_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

function CategoryIcon({
  category,
  categories,
  size = "md",
  className = "",
}: {
  category: string;
  categories: CategoryItem[];
  size?: "sm" | "md";
  className?: string;
}) {
  const matched = findCategoryForQr(category, categories);
  const isSmall = size === "sm";
  const boxClass = isSmall
    ? "h-14 w-14 shrink-0 rounded-2xl"
    : "h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl sm:h-20 sm:w-20";
  const iconSize = isSmall ? 24 : 28;
  const imageSizes = isSmall ? "56px" : "80px";

  const imageUrl = getCategoryImageUrl(matched?.image);
  if (imageUrl) {
    return (
      <div
        className={`relative ${boxClass} overflow-hidden border border-gray-100 bg-gray-50 shadow-inner ${className}`}
      >
        <Image
          src={imageUrl}
          alt={matched?.title || category}
          fill
          sizes={imageSizes}
          className="object-contain p-2"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={`${boxClass} flex items-center justify-center shadow-inner ${getCategoryColor(category)} ${className}`}
    >
      {getCategoryIconFallback(category, iconSize)}
    </div>
  );
}

const getCategoryColor = (category: string) => {
  if (isVehicleQrCategory(category)) return "bg-blue-50 text-blue-700 border-blue-200";
  if (isPetQrCategory(category)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const getStatusStyles = (status?: string | null, isActive?: boolean) => {
  const s = (status || "").toUpperCase();
  if (!isActive) return "bg-gray-50 text-gray-500 border-gray-200";
  if (s === "ACTIVE") return "bg-green-50 text-green-700 border-green-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

// Backend may return emergencyContacts as a JSON-encoded string or as an array.
// Normalize to an EmergencyContact[] so the UI can treat it uniformly.
const normalizeEmergencyContacts = (raw: unknown): EmergencyContact[] => {
  if (!raw) return [];

  let value: unknown = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const obj = entry as { name?: unknown; phone?: unknown };
        return {
          name: typeof obj.name === "string" ? obj.name : "",
          phone: typeof obj.phone === "string" ? obj.phone : String(obj.phone ?? ""),
        };
      }
      if (typeof entry === "string") {
        return { name: "", phone: entry };
      }
      return { name: "", phone: "" };
    })
    .filter((c) => c.phone || c.name);
};

const normalizeOwnerProfile = (profile: OwnerProfile | null | undefined): OwnerProfile => {
  const base = (profile ?? {}) as OwnerProfile;
  return {
    ...base,
    emergencyContacts: normalizeEmergencyContacts(base.emergencyContacts as unknown),
  };
};

const normalizeQrCode = (qr: QRCodeData): QRCodeData => ({
  ...qr,
  ownerProfile: normalizeOwnerProfile(qr.ownerProfile),
});

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [isDndModalOpen, setIsDndModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit contact form state
  const [editForm, setEditForm] = useState<OwnerProfile | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [editError, setEditError] = useState<string>("");

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>("");

  // DND state
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndUntil, setDndUntil] = useState("");
  const [togglingDnd, setTogglingDnd] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/backend/categories");
        if (!res.ok) return;
        const data = await res.json();
        const active = Array.isArray(data)
          ? (data as CategoryItem[])
              .filter((cat) => cat.is_active !== false && cat.image)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          : [];
        if (!cancelled) setCategories(active);
      } catch (e) {
        console.error("Error fetching categories:", e);
      }
    };
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/dashboard")}`);
      return;
    }
  }, [status, router]);

  // Fetch QR codes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (status !== "authenticated") return;
      setLoading(true);
      setError("");
      try {
        const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
        if (!accessToken) {
          throw new Error("Missing access token. Please log in again.");
        }

        const res = await fetch("/api/backend/my-qrs", {
          method: "GET",
          cache: "no-store",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const json = (await res.json()) as MyQRsResponse;

        if (!res.ok || !json.success) {
          throw new Error("Failed to load QR codes");
        }

        if (!cancelled) setQrCodes((json.data || []).map(normalizeQrCode));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  const stats = useMemo(() => {
    const total = qrCodes.length;
    const active = qrCodes.filter((qr) => qr.isActive).length;
    const dndActive = qrCodes.filter((qr) => qr.isDndActive).length;
    const totalScans = qrCodes.reduce((sum, qr) => sum + (qr.scans || 0), 0);
    return { total, active, dndActive, totalScans };
  }, [qrCodes]);

  const openContactModal = (qr: QRCodeData) => {
    setSelectedQR(qr);
    setIsContactModalOpen(true);
  };

  const openEditContactModal = (qr: QRCodeData) => {
    setSelectedQR(qr);
    setEditForm({
      ...qr.ownerProfile,
      emergencyContacts: normalizeEmergencyContacts(qr.ownerProfile?.emergencyContacts as unknown),
    });
    setEditError("");
    setIsEditContactModalOpen(true);
  };

  const openDndModal = (qr: QRCodeData) => {
    setSelectedQR(qr);
    setDndEnabled(qr.isDndActive);
    // Default to 1 year from now if not set
    if (!qr.dndUntil) {
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      setDndUntil(oneYear.toISOString().slice(0, 16));
    } else {
      setDndUntil(new Date(qr.dndUntil).toISOString().slice(0, 16));
    }
    setIsDndModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openDeleteModal = (qr: QRCodeData) => {
    setSelectedQR(qr);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const handleSaveContact = async () => {
    if (!selectedQR || !editForm) return;

    const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
    if (!accessToken) return;

    setSavingContact(true);
    setEditError("");
    try {
      const res = await fetch(`/api/backend/my-qrs/${selectedQR.uniqueId}/activation`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editForm),
      });

      const json = (await res.json()) as { success: boolean; message?: string; data?: { ownerProfile?: OwnerProfile } };

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update activation details");
      }

      // Prefer fresh server-side profile if returned, else use the form values.
      const updatedProfile: OwnerProfile = normalizeOwnerProfile(json.data?.ownerProfile ?? editForm);

      setQrCodes((prev) =>
        prev.map((qr) =>
          qr.id === selectedQR.id ? { ...qr, ownerProfile: updatedProfile } : qr
        )
      );
      setIsEditContactModalOpen(false);
      setIsContactModalOpen(false);
      openContactModal({ ...selectedQR, ownerProfile: updatedProfile });
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteActivation = async () => {
    if (!selectedQR) return;

    const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
    if (!accessToken) return;

    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/backend/my-qrs/${selectedQR.uniqueId}/activation`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete activation");
      }

      // QR has returned to "Dispatched" — remove from the activated list.
      setQrCodes((prev) => prev.filter((qr) => qr.id !== selectedQR.id));
      setIsDeleteModalOpen(false);
      setSelectedQR(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleDnd = async () => {
    if (!selectedQR) return;

    const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
    if (!accessToken) return;

    setTogglingDnd(true);
    try {
      const res = await fetch(`/api/backend/qr/${selectedQR.id}/dnd`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          enabled: dndEnabled,
          dndUntil: dndEnabled ? dndUntil : null,
        }),
      });

      const json = (await res.json()) as DndResponse;

      if (res.ok && json.success) {
        // Update local state
        setQrCodes((prev) =>
          prev.map((qr) =>
            qr.id === selectedQR.id
              ? {
                  ...qr,
                  isDndActive: json.data.isDndActive,
                  dndUntil: json.data.dndUntil,
                }
              : qr
          )
        );
        setIsDndModalOpen(false);
      } else {
        throw new Error(json.message || "Failed to update DND status");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update DND");
    } finally {
      setTogglingDnd(false);
    }
  };

  const addEmergencyContact = () => {
    if (!editForm) return;
    const current = Array.isArray(editForm.emergencyContacts) ? editForm.emergencyContacts : [];
    setEditForm({
      ...editForm,
      emergencyContacts: [...current, { name: "", phone: "" }],
    });
  };

  const removeEmergencyContact = (index: number) => {
    if (!editForm) return;
    const current = Array.isArray(editForm.emergencyContacts) ? editForm.emergencyContacts : [];
    setEditForm({
      ...editForm,
      emergencyContacts: current.filter((_, i) => i !== index),
    });
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    if (!editForm) return;
    const current = Array.isArray(editForm.emergencyContacts) ? editForm.emergencyContacts : [];
    const updated = [...current];
    updated[index] = { ...updated[index], [field]: value };
    setEditForm({ ...editForm, emergencyContacts: updated });
  };

  if (status === "loading") {
    return (
      <div className={`${PAGE_TOP_PADDING} pb-12 max-w-screen-xl mx-auto px-4 font-dm flex justify-center items-center min-h-[60vh]`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className={`border-b border-slate-200/70 bg-light-blue-banner pb-4 sm:pb-6 ${PAGE_TOP_PADDING}`}>
        <div className="max-w-screen mx-auto font-dm">
          <PageTitle title="My Dashboard" subtitle="Manage your QR codes and settings">
            <div className="flex justify-center text-center">
              <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} variant="light" />
            </div>
          </PageTitle>
        </div>
      </section>

      <div className="pt-6 pb-20 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 font-dm">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-2xl border border-gray-150/80 shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total QR Codes</p>
              <p className="mt-2 text-3xl font-black text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <QrCode size={22} />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-150/80 shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active QRs</p>
              <p className="mt-2 text-3xl font-black text-green-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 text-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle size={22} className="animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150/80 shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">DND Active</p>
              <p className="mt-2 text-3xl font-black text-amber-600">{stats.dndActive}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Moon size={22} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150/80 shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Scans</p>
              <p className="mt-2 text-3xl font-black text-blue-900">{stats.totalScans}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <Scan size={22} />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex items-center justify-center gap-3 text-gray-600">
            <Loader size={18} className="animate-spin" />
            Loading your QR codes…
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8">
            <p className="text-sm font-semibold text-red-700">Couldn&apos;t load your QR codes</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              Retry
            </button>
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 sm:p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center">
              <QrCode size={30} />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-gray-900">No QR codes yet</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              You haven&apos;t created any QR codes yet. Start by purchasing a QR code from our shop.
            </p>
            <button
              type="button"
              onClick={() => router.push("/shop")}
              className="mt-7 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {qrCodes.map((qr) => (
              <div
                key={qr.id}
                className="bg-white rounded-2xl border border-gray-150/85 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Card Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CategoryIcon category={qr.category} categories={categories} size="md" />
                      <div>
                        <h3 className="text-base font-extrabold text-gray-900">{qr.assetName}</h3>
                        <p className="text-xs text-gray-400 mt-1 font-semibold">ID: {qr.uniqueId}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-sm ${getStatusStyles(
                          qr.status,
                          qr.isActive
                        )}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
                        {qr.isActive ? "Active" : "Inactive"}
                      </span>
                      {qr.isDndActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide">
                          <Moon size={10} className="mr-1" /> DND Mode
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/80">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asset Category</p>
                      <p className="mt-1 text-sm font-extrabold text-gray-800 uppercase tracking-wide">{qr.category}</p>
                    </div>
                    <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/80">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Scans Count</p>
                      <p className="mt-1 text-sm font-extrabold text-blue-900 flex items-center gap-1.5">
                        <Scan size={14} className="text-blue-600" /> {qr.scans} scans
                      </p>
                    </div>
                  </div>

                  {/* QR URL */}
                  {/* <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/80 mb-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Secure Link</p>
                    <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-gray-250/60 shadow-inner">
                      <input
                        type="text"
                        value={resolveScanUrl(qr.scanUrl)}
                        readOnly
                        className="flex-1 text-xs text-gray-600 bg-transparent border-none outline-none truncate font-semibold"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(resolveScanUrl(qr.scanUrl), qr.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                          title="Copy Link"
                        >
                          {copiedId === qr.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                        <a
                          href={resolveScanUrl(qr.scanUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div> */}

                  {/* Created/Updated */}
                  <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      Registered: {formatDate(qr.createdAt)}
                    </span>
                    {qr.dndUntil && qr.isDndActive && (
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Clock size={12} />
                        DND expires: {formatDate(qr.dndUntil)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-6 py-4.5 border-t border-gray-100 bg-gray-50/40">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => openContactModal(qr)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs transition-all shadow-sm active:scale-95"
                      style={{ cursor: "pointer" }}
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditContactModal(qr)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition-all shadow-sm active:scale-95"
                      style={{ cursor: "pointer" }}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDndModal(qr)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 ${
                        qr.isDndActive
                          ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-250/30"
                          : "bg-blue-900 hover:bg-blue-800 text-white border border-blue-900"
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      {qr.isDndActive ? <Sun size={14} /> : <Moon size={14} />}
                      {qr.isDndActive ? "Disable DND" : "Setup DND"}
                      
                    </button>
                    {/* <button
                      type="button"
                      onClick={() => openDeleteModal(qr)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-all shadow-sm active:scale-95"
                      title="Remove activation"
                    >
                      <Trash2 size={14} /> Delete
                    </button> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {mounted && selectedQR && isContactModalOpen && (
        <ContactDetailsModal
          qr={selectedQR}
          categories={categories}
          onClose={() => setIsContactModalOpen(false)}
          onEdit={() => {
            setIsContactModalOpen(false);
            openEditContactModal(selectedQR);
          }}
        />
      )}

      {/* Edit Contact Modal */}
      {mounted && selectedQR && editForm && isEditContactModalOpen && (
        <EditContactModal
          qr={selectedQR}
          form={editForm}
          setForm={setEditForm}
          onClose={() => {
            setIsEditContactModalOpen(false);
            setEditError("");
          }}
          onSave={handleSaveContact}
          saving={savingContact}
          error={editError}
          addEmergencyContact={addEmergencyContact}
          removeEmergencyContact={removeEmergencyContact}
          updateEmergencyContact={updateEmergencyContact}
        />
      )}

      {/* DND Modal */}
      {mounted && selectedQR && isDndModalOpen && (
        <DndModal
          qr={selectedQR}
          enabled={dndEnabled}
          setEnabled={setDndEnabled}
          dndUntil={dndUntil}
          setDndUntil={setDndUntil}
          onClose={() => setIsDndModalOpen(false)}
          onSave={handleToggleDnd}
          toggling={togglingDnd}
        />
      )}

      {/* Delete Activation Modal */}
      {mounted && selectedQR && isDeleteModalOpen && (
        <DeleteActivationModal
          qr={selectedQR}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteError("");
          }}
          onConfirm={handleDeleteActivation}
          deleting={deleting}
          error={deleteError}
        />
      )}
    </>
  );
}

// Contact Details Modal Component
function ContactDetailsModal({
  qr,
  categories,
  onClose,
  onEdit,
}: {
  qr: QRCodeData;
  categories: CategoryItem[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const profile = qr.ownerProfile;

  // Handle missing profile data
  if (!profile) {
    return createPortal(
      <div className="fixed inset-0 z-[10060]">
        <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
            <p className="text-red-600 font-semibold">Error: Contact details not available</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[10060]">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <CategoryIcon category={qr.category} categories={categories} size="sm" />
              <div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Contact Details</p>
                <p className="text-lg font-extrabold text-gray-900">{qr.assetName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20"
              >
                <Edit2 size={16} /> Edit
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
            {/* Owner Info */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-5">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Owner Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Full Name</p>
                    <p className="font-semibold text-gray-900">{profile.fullName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-semibold text-gray-900">{profile.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="font-semibold text-gray-900">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="font-semibold text-gray-900">{profile.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Info (if applicable) */}
            {isVehicleQrCategory(qr.category) && (
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 mb-5">
                <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Car size={16} /> Vehicle Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {profile.vehicleMake && (
                    <div>
                      <p className="text-xs text-gray-500">Make</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleMake}</p>
                    </div>
                  )}
                  {profile.vehicleModel && (
                    <div>
                      <p className="text-xs text-gray-500">Model</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleModel}</p>
                    </div>
                  )}
                  {profile.vehicleReg && (
                    <div>
                      <p className="text-xs text-gray-500">Registration</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleReg}</p>
                    </div>
                  )}
                  {profile.vehicleYear && (
                    <div>
                      <p className="text-xs text-gray-500">Year</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleYear}</p>
                    </div>
                  )}
                  {profile.vehicleColor && (
                    <div>
                      <p className="text-xs text-gray-500">Color</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleColor}</p>
                    </div>
                  )}
                  {profile.vehicleFuel && (
                    <div>
                      <p className="text-xs text-gray-500">Fuel</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleFuel}</p>
                    </div>
                  )}
                  {profile.vehicleVin && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-xs text-gray-500">VIN</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleVin}</p>
                    </div>
                  )}
                  {profile.vehicleInsuranceNo && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-xs text-gray-500">Insurance No</p>
                      <p className="font-semibold text-gray-900">{profile.vehicleInsuranceNo}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pet Info (if applicable) */}
            {isPetQrCategory(qr.category) && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 mb-5">
                <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-widest mb-4">Pet Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {profile.petName && (
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-semibold text-gray-900">{profile.petName}</p>
                    </div>
                  )}
                  {profile.petSpecies && (
                    <div>
                      <p className="text-xs text-gray-500">Species</p>
                      <p className="font-semibold text-gray-900">{profile.petSpecies}</p>
                    </div>
                  )}
                  {profile.petBreed && (
                    <div>
                      <p className="text-xs text-gray-500">Breed</p>
                      <p className="font-semibold text-gray-900">{profile.petBreed}</p>
                    </div>
                  )}
                  {profile.petNotes && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="font-semibold text-gray-900">{profile.petNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emergency Contacts */}
            {(() => {
              const contacts = Array.isArray(profile.emergencyContacts) ? profile.emergencyContacts : [];
              return contacts.length > 0 ? (
                <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                  <h4 className="text-sm font-semibold text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertCircle size={16} /> Emergency Contacts
                  </h4>
                  <div className="space-y-3">
                    {contacts.map((contact, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-white rounded-xl p-3 border border-red-100">
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-500">{contact.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Edit Contact Modal Component
function EditContactModal({
  qr,
  form,
  setForm,
  onClose,
  onSave,
  saving,
  error,
  addEmergencyContact,
  removeEmergencyContact,
  updateEmergencyContact,
}: {
  qr: QRCodeData;
  form: OwnerProfile;
  setForm: (form: OwnerProfile) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error?: string;
  addEmergencyContact: () => void;
  removeEmergencyContact: (index: number) => void;
  updateEmergencyContact: (index: number, field: keyof EmergencyContact, value: string) => void;
}) {
  const updateField = (field: keyof OwnerProfile, value: string) => {
    setForm({ ...form, [field]: value });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10060]">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Edit Contact Details</p>
              <p className="text-lg font-extrabold text-gray-900">{qr.assetName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
            {/* Owner Info */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Owner Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.fullName || ""}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={form.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address *</label>
                  <input
                    type="text"
                    value={form.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            {isVehicleQrCategory(qr.category) && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Car size={16} /> Vehicle Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Make</label>
                    <input
                      type="text"
                      value={form.vehicleMake || ""}
                      onChange={(e) => updateField("vehicleMake", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
                    <input
                      type="text"
                      value={form.vehicleModel || ""}
                      onChange={(e) => updateField("vehicleModel", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Registration</label>
                    <input
                      type="text"
                      value={form.vehicleReg || ""}
                      onChange={(e) => updateField("vehicleReg", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                    <input
                      type="text"
                      value={form.vehicleYear || ""}
                      onChange={(e) => updateField("vehicleYear", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                    <input
                      type="text"
                      value={form.vehicleColor || ""}
                      onChange={(e) => updateField("vehicleColor", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fuel Type</label>
                    <input
                      type="text"
                      value={form.vehicleFuel || ""}
                      onChange={(e) => updateField("vehicleFuel", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">VIN</label>
                    <input
                      type="text"
                      value={form.vehicleVin || ""}
                      onChange={(e) => updateField("vehicleVin", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Insurance Number</label>
                    <input
                      type="text"
                      value={form.vehicleInsuranceNo || ""}
                      onChange={(e) => updateField("vehicleInsuranceNo", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pet Info */}
            {isPetQrCategory(qr.category) && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-widest mb-4">Pet Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={form.petName || ""}
                      onChange={(e) => updateField("petName", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Species</label>
                    <input
                      type="text"
                      value={form.petSpecies || ""}
                      onChange={(e) => updateField("petSpecies", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Breed</label>
                    <input
                      type="text"
                      value={form.petBreed || ""}
                      onChange={(e) => updateField("petBreed", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                    <textarea
                      value={form.petNotes || ""}
                      onChange={(e) => updateField("petNotes", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Contacts */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-red-600 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16} /> Emergency Contacts
                </h4>
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold transition-colors"
                >
                  + Add Contact
                </button>
              </div>
              <div className="space-y-3">
                {(() => {
                  const contacts = Array.isArray(form.emergencyContacts) ? form.emergencyContacts : [];
                  return (
                    <>
                      {contacts.map((contact, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-red-50 rounded-xl p-3 border border-red-100">
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Name"
                              value={contact.name || ""}
                              onChange={(e) => updateEmergencyContact(idx, "name", e.target.value)}
                              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-sm"
                            />
                            <input
                              type="tel"
                              placeholder="Phone"
                              value={contact.phone || ""}
                              onChange={(e) => updateEmergencyContact(idx, "phone", e.target.value)}
                              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEmergencyContact(idx)}
                            className="p-2 rounded-lg hover:bg-red-200 text-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      {contacts.length === 0 && (
                        <p className="text-sm text-gray-400 italic">No emergency contacts added</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// DND Modal Component
function DndModal({
  qr,
  enabled,
  setEnabled,
  dndUntil,
  setDndUntil,
  onClose,
  onSave,
  toggling,
}: {
  qr: QRCodeData;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  dndUntil: string;
  setDndUntil: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  toggling: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[10060]">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Moon size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Do Not Disturb</p>
                <p className="text-lg font-extrabold text-gray-900">{qr.assetName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 mb-5">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> When DND is enabled, no phone calls or SMS messages can be initiated through
                this QR code. A DND message will be displayed instead of contact options.
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-semibold text-gray-900">Enable DND</p>
                <p className="text-sm text-gray-500">Turn on Do Not Disturb mode</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  enabled ? "bg-amber-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* DND Until */}
            {enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DND Active Until</label>
                <input
                  type="datetime-local"
                  value={dndUntil}
                  onChange={(e) => setDndUntil(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank for indefinite (1 year default)</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={toggling}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {toggling ? (
                <>
                  <Loader size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={16} /> {enabled ? "Enable DND" : "Disable DND"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Delete Activation Modal Component
function DeleteActivationModal({
  qr,
  onClose,
  onConfirm,
  deleting,
  error,
}: {
  qr: QRCodeData;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error?: string;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[10060]">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={deleting ? undefined : onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Delete Activation</p>
                <p className="text-lg font-extrabold text-gray-900">{qr.assetName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will reset the QR to <span className="font-semibold">Dispatched</span>{" "}
                status. The owner profile and emergency contacts will be removed, and the QR sticker will need to be
                registered again before it can be used.
              </p>
            </div>
            <p className="text-sm text-gray-700">
              Are you sure you want to delete the activation for{" "}
              <span className="font-bold text-gray-900">{qr.assetName}</span>{" "}
              <span className="text-gray-500">(ID: {qr.uniqueId})</span>?
            </p>
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader size={16} className="animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} /> Delete Activation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
