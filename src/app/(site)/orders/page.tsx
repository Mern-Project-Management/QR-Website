"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PAGE_TOP_PADDING } from "@/lib/siteLayout";
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Download, Eye, Loader, ShoppingBag, X, Award, UserCheck } from "react-feather";
import { createPortal } from "react-dom";

type OrderItem = {
  id?: string | number;
  orderId: string;
  productId?: string | number | null;
  name: string;
  sku?: string | null;
  quantity: number;
  price: string | number;
  options?: unknown;
};

type OrderRow = {
  id: string;
  status?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  subtotal?: string | number | null;
  totalAmount?: string | number | null;
  shippingName?: string | null;
  shippingEmail?: string | null;
  shippingPhone?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customerId?: string | number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  items: OrderItem[];
};


const formatMoney = (value: unknown) => {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 0;
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toFixed(2).replace(/\\.00$/, "")}`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

const formatItemOptions = (options: unknown): string => {
  if (!options || typeof options !== "object") return "";
  return Object.entries(options as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
};

function OrderItemsList({ items }: { items: OrderItem[] }) {
  if (!items?.length) {
    return <p className="text-xs text-gray-400 italic">No item details available</p>;
  }
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/70 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <th className="py-2 pl-3 pr-2">Item</th>
            <th className="py-2 px-2 text-right whitespace-nowrap">Qty</th>
            <th className="py-2 px-2 text-right whitespace-nowrap">Price</th>
            <th className="py-2 pr-3 pl-2 text-right whitespace-nowrap">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it, idx) => {
            const qty = Number(it.quantity || 0);
            const price = typeof it.price === "string" ? Number(it.price) : Number(it.price || 0);
            const specs = formatItemOptions(it.options);
            return (
              <tr key={it.id ?? `${it.name}-${idx}`}>
                <td className="py-2.5 pl-3 pr-2">
                  <p className="font-semibold text-gray-800 leading-snug">{it.name}</p>
                  {specs ? <p className="text-[11px] text-gray-400 mt-0.5">{specs}</p> : null}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-600 whitespace-nowrap align-top">{qty}</td>
                <td className="py-2.5 px-2 text-right text-gray-600 whitespace-nowrap align-top">{formatMoney(price)}</td>
                <td className="py-2.5 pr-3 pl-2 text-right font-bold text-gray-900 whitespace-nowrap align-top">
                  {formatMoney(qty * (Number.isFinite(price) ? price : 0))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const formatOrderId = (id: string) => {
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
};

const splitDisplayName = (name?: string | null) => {
  const parts = (name || "Customer").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Customer";
  const lastName = parts.slice(1).join(" ") || "-";
  return { firstName, lastName };
};

const ORDER_ISSUE_TYPES = [
  { value: "wrong_item", label: "Wrong item received" },
  { value: "missing_order", label: "Missing order / not delivered" },
  { value: "delivery_issue", label: "Delivery issue" },
  { value: "other", label: "Other problem" },
] as const;

const ORDERS_PER_PAGE = 10;

const statusStyles = (status?: string | null) => {
  const s = (status || "").toUpperCase();
  if (s === "DELIVERED" || s === "COMPLETED") return "bg-green-50 text-green-700 border-green-200";
  if (s === "SHIPPED" || s === "IN_TRANSIT") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "CANCELLED" || s === "CANCELED") return "bg-red-50 text-red-700 border-red-200";
  if (s === "FAILED") return "bg-red-50 text-red-700 border-red-200";
  if (s === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

function buildInvoiceHtml(order: OrderRow) {
  const items = order.items || [];
  const total = order.totalAmount ?? order.subtotal ?? 0;
  const created = formatDate(order.createdAt);
  const safe = (v: unknown) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${safe(order.id)}</title>
  <style>
    :root { --brand:#1e3a8a; --text:#111827; --muted:#6b7280; --border:#e5e7eb; --bg:#ffffff; --soft:#f9fafb; }
    *{ box-sizing:border-box; }
    body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:var(--text); background:var(--soft); }
    .wrap{ max-width: 900px; margin: 24px auto; padding: 0 16px; }
    .card{ background:var(--bg); border:1px solid var(--border); border-radius:16px; box-shadow: 0 10px 30px rgba(17,24,39,.06); overflow:hidden; }
    .topbar{ height:4px; background: linear-gradient(90deg, #2563eb, var(--brand)); }
    .header{ padding: 20px 22px; display:flex; gap:16px; align-items:flex-start; justify-content:space-between; }
    .title{ margin:0; font-size: 20px; font-weight: 800; letter-spacing: .2px; }
    .meta{ color:var(--muted); font-size: 13px; line-height: 1.6; text-align:right; }
    .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; padding: 0 22px 18px; }
    .box{ border:1px solid var(--border); border-radius:14px; padding: 14px; background:#fff; }
    .box h3{ margin:0 0 8px; font-size:12px; text-transform: uppercase; letter-spacing:.14em; color:#9ca3af; }
    .box p{ margin:0; font-size: 14px; line-height: 1.6; }
    table{ width:100%; border-collapse:collapse; }
    thead th{ text-align:left; font-size:12px; color:#6b7280; letter-spacing:.08em; text-transform:uppercase; padding: 12px 22px; border-top:1px solid var(--border); border-bottom:1px solid var(--border); background:#fff; }
    tbody td{ padding: 14px 22px; border-bottom:1px solid var(--border); font-size:14px; vertical-align:top; }
    .qty{ color:#111827; font-weight:700; }
    .right{ text-align:right; }
    .totals{ padding: 16px 22px; display:flex; justify-content:flex-end; }
    .totals .panel{ min-width: 280px; border:1px solid var(--border); border-radius:14px; padding: 14px; background:#fff; }
    .row{ display:flex; justify-content:space-between; color:#6b7280; font-size:13px; margin: 6px 0; }
    .row strong{ color:#111827; }
    .grand{ font-size: 16px; font-weight: 900; color: var(--brand); margin-top: 10px; }
    .footer{ padding: 14px 22px 18px; color:#9ca3af; font-size: 12px; }
    @media (max-width: 640px){ .header{ flex-direction:column; } .meta{ text-align:left; } .grid{ grid-template-columns:1fr; } thead{ display:none; } tbody td{ display:block; padding: 10px 16px; } tbody tr{ display:block; padding: 8px 0; } tbody td.right{ text-align:left; } }
    @media print { body{ background:#fff; } .wrap{ margin:0; max-width:none; padding:0; } .card{ border:0; border-radius:0; box-shadow:none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="topbar"></div>
      <div class="header">
        <div>
          <h1 class="title">Invoice</h1>
          <div style="margin-top:6px; color:var(--muted); font-size:13px;">Order ID: <strong style="color:var(--text)">${safe(order.id)}</strong></div>
        </div>
        <div class="meta">
          <div>Date: <strong style="color:var(--text)">${safe(created)}</strong></div>
          <div>Status: <strong style="color:var(--text)">${safe(order.status || "PENDING")}</strong></div>
          <div>Payment: <strong style="color:var(--text)">${safe(order.paymentMethod || "-")} (${safe(order.paymentStatus || "-")})</strong></div>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <h3>Billed To</h3>
          <p>
            <strong>${safe(order.shippingName || order.customerName || "")}</strong><br/>
            ${safe(order.shippingEmail || order.customerEmail || "")}<br/>
            ${safe(order.shippingPhone || "")}
          </p>
        </div>
        <div class="box">
          <h3>Ship To</h3>
          <p>
            ${safe(order.shippingCity || "")}${order.shippingState ? ", " + safe(order.shippingState) : ""}<br/>
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="right">Qty</th>
            <th class="right">Price</th>
            <th class="right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
      .map((it) => {
        const qty = Number(it.quantity || 0);
        const price = typeof it.price === "string" ? Number(it.price) : Number(it.price || 0);
        const line = qty * (Number.isFinite(price) ? price : 0);
        return `<tr>
                <td><strong>${safe(it.name)}</strong>${it.sku ? `<div style="color:var(--muted); font-size:12px; margin-top:4px;">SKU: ${safe(it.sku)}</div>` : ""}</td>
                <td class="right qty">${safe(qty)}</td>
                <td class="right">${safe(formatMoney(price))}</td>
                <td class="right"><strong>${safe(formatMoney(line))}</strong></td>
              </tr>`;
      })
      .join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="panel">
          <div class="row"><span>Subtotal</span><strong>${safe(formatMoney(order.subtotal ?? order.totalAmount ?? 0))}</strong></div>
          <div class="row"><span>Shipping</span><strong>₹0</strong></div>
          <div class="row"><span>Taxes</span><strong>Included</strong></div>
          <div class="row grand"><span>Total</span><span>${safe(formatMoney(total))}</span></div>
        </div>
      </div>

      <div class="footer">
        This invoice is generated electronically and is valid without signature.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [mounted, setMounted] = useState(false);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<OrderRow | null>(null);
  const [reportOrder, setReportOrder] = useState<OrderRow | null>(null);
  const [reportIssueType, setReportIssueType] = useState<string>(ORDER_ISSUE_TYPES[0].value);
  const [reportMessage, setReportMessage] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/orders")}`);
      return;
    }
  }, [status, router]);

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

        const res = await fetch("/api/backend/orders/my", {
          method: "GET",
          cache: "no-store",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const text = await res.text();
        const json = (() => {
          try {
            return JSON.parse(text) as unknown;
          } catch {
            return null;
          }
        })();

        if (!res.ok) {
          const msg =
            (json && typeof json === "object" && json !== null && "message" in json && typeof (json as { message?: unknown }).message === "string"
              ? (json as { message: string }).message
              : "") || text || "Failed to load orders";
          throw new Error(msg);
        }

        const rows: OrderRow[] =
          (json && typeof json === "object" && json !== null && "data" in json && Array.isArray((json as { data?: unknown }).data)
            ? ((json as { data: OrderRow[] }).data || [])
            : Array.isArray(json)
              ? (json as OrderRow[])
              : []) || [];

        rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (!cancelled) setOrders(rows);
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

  const totalSpent = useMemo(() => {
    return orders.reduce((sum, o) => {
      const n = typeof o.totalAmount === "string" ? Number(o.totalAmount) : Number(o.totalAmount || 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return orders.slice(start, start + ORDERS_PER_PAGE);
  }, [orders, currentPage]);

  const downloadInvoice = (order: OrderRow) => {
    const html = buildInvoiceHtml(order);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const openInvoiceInNewTab = (order: OrderRow) => {
    const html = buildInvoiceHtml(order);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) return;
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const openReportModal = (order: OrderRow) => {
    setReportOrder(order);
    setReportIssueType(ORDER_ISSUE_TYPES[0].value);
    setReportMessage("");
    setReportError("");
    setReportSuccess(false);
  };

  const closeReportModal = () => {
    if (reportSubmitting) return;
    setReportOrder(null);
    setReportError("");
    setReportSuccess(false);
  };

  const submitOrderReport = async () => {
    if (!reportOrder) return;
    const details = reportMessage.trim();
    if (!details) {
      setReportError("Please describe the issue so our support team can help.");
      return;
    }

    // session.user.email can hold a phone number when the account signed in via
    // phone OTP and has no email on file — prefer the order's own email instead.
    const email = (reportOrder.customerEmail || reportOrder.shippingEmail || session?.user?.email || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setReportError("We couldn't find a valid email on your account. Please update your profile email and try again.");
      return;
    }

    const { firstName, lastName } = splitDisplayName(session?.user?.name);
    const issueLabel = ORDER_ISSUE_TYPES.find((t) => t.value === reportIssueType)?.label || reportIssueType;

    setReportSubmitting(true);
    setReportError("");
    try {
      const res = await fetch("/api/backend/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          inquiryType: "Order Support",
          message: [
            `Order ID: ${reportOrder.id}`,
            `Order date: ${formatDate(reportOrder.createdAt)}`,
            `Order total: ${formatMoney(reportOrder.totalAmount)}`,
            `Issue type: ${issueLabel}`,
            "",
            "Details:",
            details,
          ].join("\n"),
        }),
      });

      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        throw new Error(json?.message || "Failed to submit your report. Please try again.");
      }

      setReportSuccess(true);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setReportSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className={`${PAGE_TOP_PADDING} pb-12 max-w-screen-xl mx-auto px-4 font-dm flex justify-center items-center min-h-[60vh]`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
          <p className="mt-4 text-gray-600 font-medium">Loading your orders…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className={`border-b border-slate-200/70 bg-light-blue-banner pb-4 sm:pb-6 ${PAGE_TOP_PADDING}`}>
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 lg:px-8 font-dm">
          <PageTitle title="My Orders" subtitle="Track your purchases and invoices">
            <div className="flex justify-center text-center">
              <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My Orders" }]} variant="light" />
            </div>
          </PageTitle>
        </div>
      </section>

      <div className="overflow-x-hidden pt-6 pb-20 max-w-screen-xl mx-auto px-3 sm:px-6 lg:px-8 font-dm">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-150/80 shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Orders</p>
              <p className="mt-2 text-3xl font-black text-gray-900">{orders.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center">
              <ShoppingBag size={24} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150/80 shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Spent</p>
              <p className="mt-2 text-3xl font-black text-blue-900">{formatMoney(totalSpent)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Award size={24} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150/80 shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Signed In As</p>
              <p className="mt-2 text-sm font-bold text-gray-800 break-all">{session?.user?.email}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <UserCheck size={24} />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex items-center justify-center gap-3 text-gray-600">
            <Loader size={18} className="animate-spin" />
            Loading orders…
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8">
            <p className="text-sm font-semibold text-red-700">Couldn’t load your orders</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 sm:p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center">
              <ShoppingBag size={30} />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-gray-900">No orders yet</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              When you place an order, it will show up here with invoice options.
            </p>
            <button
              type="button"
              onClick={() => router.push("/shop")}
              className="mt-7 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              Browse products
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-extrabold text-gray-900">Order History</h3>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-100">
                Showing {paginatedOrders.length ? (currentPage - 1) * ORDERS_PER_PAGE + 1 : 0}-
                {(currentPage - 1) * ORDERS_PER_PAGE + paginatedOrders.length} of {orders.length} order{orders.length === 1 ? "" : "s"}
              </div>
            </div>

            {/* Order cards */}
            <div className="grid grid-cols-1 gap-4">
              {paginatedOrders.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl border border-gray-150/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-gray-900 font-mono truncate" title={o.id}>
                        <span className="text-blue-900">#</span>
                        {formatOrderId(o.id)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1.5 font-semibold">
                        {formatDate(o.createdAt)} · {o.items?.length || 0} item{o.items?.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold shadow-sm whitespace-nowrap ${statusStyles(o.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                      {String(o.status || "PENDING")}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-4">
                    <OrderItemsList items={o.items} />
                  </div>

                  {/* Footer: totals + actions */}
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
                        <p className="mt-1 font-extrabold text-blue-900">{formatMoney(o.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Payment</p>
                        <p className="mt-1 font-bold text-gray-800 text-xs uppercase">
                          {o.paymentMethod || "-"}{" "}
                          <span className="text-gray-400 font-semibold normal-case">({o.paymentStatus || "-"})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openReportModal(o)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-all active:scale-95"
                      >
                        <AlertCircle size={14} /> Report Issue
                      </button>
                      {/* <button
                        type="button"
                        onClick={() => setActiveInvoiceOrder(o)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs transition-all shadow-sm active:scale-95"
                      >
                        <Eye size={14} /> Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadInvoice(o)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs transition-all shadow-lg shadow-blue-900/10 active:scale-95"
                      >
                        <Download size={14} /> Download
                      </button> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      aria-current={p === currentPage ? "page" : undefined}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm transition-all ${p === currentPage
                        ? "bg-blue-900 text-white shadow-lg shadow-blue-900/20"
                        : "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invoice modal */}
      {mounted &&
        activeInvoiceOrder &&
        createPortal(
          <div className="fixed inset-0 z-[10060]">
            <div
              className="absolute inset-0 bg-black/60"
              aria-hidden
              onClick={() => setActiveInvoiceOrder(null)}
            />
            <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
              <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Invoice</p>
                    <p className="text-lg font-extrabold text-gray-900 truncate">{activeInvoiceOrder.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openInvoiceInNewTab(activeInvoiceOrder)}
                      className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-all shadow-sm"
                    >
                      <Eye size={16} /> Open in tab
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadInvoice(activeInvoiceOrder)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20"
                    >
                      <Download size={16} /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveInvoiceOrder(null)}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                      aria-label="Close invoice"
                    >
                      <X size={18} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[75vh] overflow-y-auto">
                  <div className="p-5 sm:p-6">
                    <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-900" />
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-extrabold text-gray-900">Invoice</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Date: <span className="font-semibold text-gray-900">{formatDate(activeInvoiceOrder.createdAt)}</span>
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            <div>
                              Status:{" "}
                              <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold ${statusStyles(activeInvoiceOrder.status)}`}>
                                {String(activeInvoiceOrder.status || "PENDING")}
                              </span>
                            </div>
                            <div className="mt-2">
                              Payment:{" "}
                              <span className="font-semibold text-gray-900">
                                {activeInvoiceOrder.paymentMethod || "-"} ({activeInvoiceOrder.paymentStatus || "-"})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Billed to</p>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                              <span className="font-bold text-gray-900">
                                {activeInvoiceOrder.shippingName || activeInvoiceOrder.customerName || "-"}
                              </span>
                              <br />
                              {activeInvoiceOrder.shippingEmail || activeInvoiceOrder.customerEmail || "-"}
                              <br />
                              {activeInvoiceOrder.shippingPhone || ""}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Shipping</p>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                              {activeInvoiceOrder.shippingCity || "-"}
                              {activeInvoiceOrder.shippingState ? `, ${activeInvoiceOrder.shippingState}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                <th className="py-3 pr-4">Item</th>
                                <th className="py-3 pr-4 text-right">Qty</th>
                                <th className="py-3 pr-4 text-right">Price</th>
                                <th className="py-3 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {activeInvoiceOrder.items.map((it, idx) => {
                                const qty = Number(it.quantity || 0);
                                const price = typeof it.price === "string" ? Number(it.price) : Number(it.price || 0);
                                const line = qty * (Number.isFinite(price) ? price : 0);
                                return (
                                  <tr key={`${activeInvoiceOrder.id}-${idx}`}>
                                    <td className="py-4 pr-4">
                                      <div className="font-semibold text-gray-900">{it.name}</div>
                                      {it.sku ? <div className="text-xs text-gray-400 mt-1">SKU: {it.sku}</div> : null}
                                    </td>
                                    <td className="py-4 pr-4 text-right font-bold text-gray-900">{qty}</td>
                                    <td className="py-4 pr-4 text-right text-gray-700">{formatMoney(price)}</td>
                                    <td className="py-4 text-right font-extrabold text-gray-900">{formatMoney(line)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-6 flex justify-end">
                          <div className="w-full sm:w-80 rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>Subtotal</span>
                              <span className="font-semibold text-gray-900">{formatMoney(activeInvoiceOrder.subtotal ?? activeInvoiceOrder.totalAmount ?? 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500 mt-2">
                              <span>Shipping</span>
                              <span className="font-semibold text-green-600">Free</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500 mt-2">
                              <span>Taxes</span>
                              <span className="font-semibold text-gray-900">Included</span>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                              <span className="text-base font-bold text-gray-900">Total</span>
                              <span className="text-xl font-extrabold text-blue-900">{formatMoney(activeInvoiceOrder.totalAmount ?? activeInvoiceOrder.subtotal ?? 0)}</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                              <CheckCircle size={14} className="text-green-500" />
                              Generated electronically
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Report issue modal */}
      {mounted &&
        reportOrder &&
        createPortal(
          <div className="fixed inset-0 z-[10070]">
            <div className="absolute inset-0 bg-black/60" aria-hidden onClick={closeReportModal} />
            <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
              <div
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-order-title"
              >
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Raise support response</p>
                    <p id="report-order-title" className="text-lg font-extrabold text-gray-900 truncate">
                      Order #{formatOrderId(reportOrder.id)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeReportModal}
                    disabled={reportSubmitting}
                    className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    aria-label="Close report form"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-5 sm:p-6">
                  {reportSuccess ? (
                    <div className="text-center py-4">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                        <CheckCircle size={28} />
                      </div>
                      <h3 className="mt-4 text-xl font-bold text-gray-900">Report submitted</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Our support team will review your order issue and get back to you at{" "}
                        <span className="font-semibold text-gray-800">{session?.user?.email}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={closeReportModal}
                        className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Tell us what went wrong with this order. Include any details that will help us resolve it faster.
                      </p>

                      <div className="mt-5">
                        <label htmlFor="report-issue-type" className="block text-sm font-semibold text-gray-800 mb-2">
                          Issue type
                        </label>
                        <select
                          id="report-issue-type"
                          value={reportIssueType}
                          onChange={(e) => setReportIssueType(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                        >
                          {ORDER_ISSUE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="report-issue-details" className="block text-sm font-semibold text-gray-800 mb-2">
                          Describe the issue
                        </label>
                        <textarea
                          id="report-issue-details"
                          rows={4}
                          value={reportMessage}
                          onChange={(e) => setReportMessage(e.target.value)}
                          placeholder="e.g. I received the wrong QR sticker size, or my package has not arrived yet."
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 resize-y min-h-[110px]"
                        />
                      </div>

                      {reportError ? (
                        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
                          {reportError}
                        </p>
                      ) : null}

                      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeReportModal}
                          disabled={reportSubmitting}
                          className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void submitOrderReport()}
                          disabled={reportSubmitting}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-60"
                        >
                          {reportSubmitting ? <Loader size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                          Submit report
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

