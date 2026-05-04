"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
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
  ExternalLink,
  Copy,
  Check,
  Clock,
} from "react-feather";
import { QrCode, Car, Scan } from "lucide-react";
import { createPortal } from "react-dom";

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

interface ContactResponse {
  success: boolean;
  data: {
    id: number;
    uniqueId: string;
    ownerProfile: OwnerProfile;
  };
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

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "vehicle":
      return <Car size={20} />;
    case "pet":
      return <User size={20} />;
    default:
      return <QrCode size={20} />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case "vehicle":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "pet":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getStatusStyles = (status?: string | null, isActive?: boolean) => {
  const s = (status || "").toUpperCase();
  if (!isActive) return "bg-gray-50 text-gray-500 border-gray-200";
  if (s === "ACTIVE") return "bg-green-50 text-green-700 border-green-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [isDndModalOpen, setIsDndModalOpen] = useState(false);

  // Edit contact form state
  const [editForm, setEditForm] = useState<OwnerProfile | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  // DND state
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndUntil, setDndUntil] = useState("");
  const [togglingDnd, setTogglingDnd] = useState(false);

  // Copy URL state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

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

        if (!cancelled) setQrCodes(json.data || []);
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

  const handleCopyUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openContactModal = (qr: QRCodeData) => {
    setSelectedQR(qr);
    setIsContactModalOpen(true);
  };

  const openEditContactModal = (qr: QRCodeData) => {
    setSelectedQR(qr);
    setEditForm({
      ...qr.ownerProfile,
      emergencyContacts: Array.isArray(qr.ownerProfile.emergencyContacts) ? qr.ownerProfile.emergencyContacts : [],
    });
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

  const handleSaveContact = async () => {
    if (!selectedQR || !editForm) return;

    const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
    if (!accessToken) return;

    setSavingContact(true);
    try {
      const res = await fetch(`/api/backend/qr/${selectedQR.id}/contact`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editForm),
      });

      const json = (await res.json()) as ContactResponse;

      if (res.ok && json.success) {
        // Update local state
        setQrCodes((prev) =>
          prev.map((qr) =>
            qr.id === selectedQR.id ? { ...qr, ownerProfile: json.data.ownerProfile } : qr
          )
        );
        setIsEditContactModalOpen(false);
        setIsContactModalOpen(false);
        openContactModal({ ...selectedQR, ownerProfile: json.data.ownerProfile });
      } else {
        throw new Error("Failed to update contact details");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingContact(false);
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
      <div className="pt-24 pb-12 max-w-screen-xl mx-auto px-4 font-dm flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pt-24 max-w-screen mx-auto font-dm">
        <PageTitle title="My Dashboard" subtitle="Manage your QR codes and settings">
          <div className="flex justify-center text-center">
            <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} variant="light" />
          </div>
        </PageTitle>
      </div>

      <div className="pt-6 pb-20 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 font-dm">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total QR Codes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Active</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">DND Active</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.dndActive}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total Scans</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{stats.totalScans}</p>
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
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(
                          qr.category
                        )}`}
                      >
                        {getCategoryIcon(qr.category)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{qr.assetName}</h3>
                        <p className="text-xs text-gray-400">ID: {qr.uniqueId}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold ${getStatusStyles(
                          qr.status,
                          qr.isActive
                        )}`}
                      >
                        {qr.isActive ? "Active" : "Inactive"}
                      </span>
                      {qr.isDndActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold">
                          <Moon size={10} className="mr-1" /> DND
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Category</p>
                      <p className="mt-1 font-semibold text-gray-900">{qr.category}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Scans</p>
                      <p className="mt-1 font-semibold text-gray-900 flex items-center gap-1">
                        <Scan size={14} /> {qr.scans}
                      </p>
                    </div>
                  </div>

                  {/* QR URL */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">QR URL</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={qr.scanUrl}
                        readOnly
                        className="flex-1 text-sm text-gray-600 bg-transparent border-none outline-none truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(qr.scanUrl, qr.id)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Copy URL"
                      >
                        {copiedId === qr.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                      </button>
                      <a
                        href={qr.scanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Created/Updated */}
                  <div className="text-xs text-gray-400 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Created: {formatDate(qr.createdAt)}
                    </span>
                    {qr.dndUntil && qr.isDndActive && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock size={12} />
                        DND until: {formatDate(qr.dndUntil)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openContactModal(qr)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm transition-all shadow-sm"
                    >
                      <Eye size={16} /> View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openDndModal(qr)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                        qr.isDndActive
                          ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200"
                          : "bg-blue-900 hover:bg-blue-800 text-white border border-blue-900"
                      }`}
                    >
                      {qr.isDndActive ? <Sun size={16} /> : <Moon size={16} />}
                      {qr.isDndActive ? "Disable DND" : "Enable DND"}
                    </button>
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
          onClose={() => setIsEditContactModalOpen(false)}
          onSave={handleSaveContact}
          saving={savingContact}
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
    </>
  );
}

// Contact Details Modal Component
function ContactDetailsModal({
  qr,
  onClose,
  onEdit,
}: {
  qr: QRCodeData;
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
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryColor(qr.category)}`}>
                {getCategoryIcon(qr.category)}
              </div>
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
            {qr.category.toLowerCase() === "vehicle" && (
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
            {qr.category.toLowerCase() === "pet" && (
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
            {qr.category.toLowerCase() === "vehicle" && (
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
            {qr.category.toLowerCase() === "pet" && (
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
