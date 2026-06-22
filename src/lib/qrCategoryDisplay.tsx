import Image from "next/image";
import { Bike, Car, Home, PawPrint, QrCode } from "lucide-react";
import { getAdminImageOrigin } from "@/lib/adminOrigin";

export interface QrCategoryItem {
  id: string;
  image: string | null;
  title: string;
  is_active?: boolean;
}

export const isPetQrCategory = (cat: string) => /pet|dog|cat/i.test(cat);
export const isBikeQrCategory = (cat: string) => /bike|motor/i.test(cat);
export const isHomeQrCategory = (cat: string) => /home/i.test(cat);
export const isCarQrCategory = (cat: string) => {
  if (isBikeQrCategory(cat) || isPetQrCategory(cat) || isHomeQrCategory(cat)) return false;
  return /vehicle|car|auto/i.test(cat);
};
export const isVehicleQrCategory = (cat: string) =>
  isCarQrCategory(cat) || isBikeQrCategory(cat);

export function findCategoryForQr(
  category: string,
  categories: QrCategoryItem[],
): QrCategoryItem | undefined {
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

  if (isBikeQrCategory(category)) {
    return categories.find((c) => isBikeQrCategory(c.title));
  }
  if (isHomeQrCategory(category)) {
    return categories.find((c) => isHomeQrCategory(c.title));
  }
  if (isPetQrCategory(category)) {
    return categories.find((c) => isPetQrCategory(c.title));
  }
  if (isVehicleQrCategory(category)) {
    return categories.find((c) => isVehicleQrCategory(c.title) && !isBikeQrCategory(c.title));
  }

  return undefined;
}

export function getCategoryLabel(category: string, categories: QrCategoryItem[] = []): string {
  const matched = findCategoryForQr(category, categories);
  if (matched?.title) return matched.title;
  if (isBikeQrCategory(category)) return "Bike";
  if (isHomeQrCategory(category)) return "Home";
  if (isPetQrCategory(category)) return "Pet";
  if (isVehicleQrCategory(category)) return "Vehicle";
  return category.trim() || "QR";
}

function getCategoryImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath?.trim()) return null;
  const path = imagePath.trim();
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getAdminImageOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getCategoryAccentClasses(category: string): {
  border: string;
  badge: string;
  heroBg: string;
  markBg: string;
} {
  if (isBikeQrCategory(category)) {
    return {
      border: "border-l-emerald-600",
      badge: "bg-emerald-100 text-emerald-800",
      heroBg: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%, #f8fafc 100%)",
      markBg: "bg-emerald-600 shadow-emerald-600/25",
    };
  }
  if (isHomeQrCategory(category)) {
    return {
      border: "border-l-violet-600",
      badge: "bg-violet-100 text-violet-800",
      heroBg: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 55%, #f8fafc 100%)",
      markBg: "bg-violet-600 shadow-violet-600/25",
    };
  }
  if (isPetQrCategory(category)) {
    return {
      border: "border-l-amber-600",
      badge: "bg-amber-100 text-amber-800",
      heroBg: "linear-gradient(135deg, #fffbeb 0%, #ffffff 55%, #f8fafc 100%)",
      markBg: "bg-amber-600 shadow-amber-600/25",
    };
  }
  if (isVehicleQrCategory(category)) {
    return {
      border: "border-l-blue-600",
      badge: "bg-blue-100 text-blue-800",
      heroBg: "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f8fafc 100%)",
      markBg: "bg-blue-600 shadow-blue-600/25",
    };
  }
  return {
    border: "border-l-slate-600",
    badge: "bg-slate-100 text-slate-800",
    heroBg: "linear-gradient(135deg, #f8fafc 0%, #ffffff 55%, #f8fafc 100%)",
    markBg: "bg-slate-700 shadow-slate-700/25",
  };
}

function getCategoryIconFallback(category: string, iconSize = 20) {
  if (isBikeQrCategory(category)) return <Bike size={iconSize} aria-hidden />;
  if (isHomeQrCategory(category)) return <Home size={iconSize} aria-hidden />;
  if (isPetQrCategory(category)) return <PawPrint size={iconSize} aria-hidden />;
  if (isVehicleQrCategory(category)) return <Car size={iconSize} aria-hidden />;
  return <QrCode size={iconSize} aria-hidden />;
}

function getCategoryColor(category: string) {
  if (isBikeQrCategory(category)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (isHomeQrCategory(category)) return "bg-violet-50 text-violet-700 border-violet-200";
  if (isPetQrCategory(category)) return "bg-amber-50 text-amber-700 border-amber-200";
  if (isVehicleQrCategory(category)) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

const SIZE_MAP = {
  xs: { box: "h-9 w-9 rounded-xl", icon: 18, image: "36px", pad: "p-1.5" },
  sm: { box: "h-11 w-11 rounded-xl", icon: 22, image: "44px", pad: "p-1.5" },
  md: { box: "h-14 w-14 rounded-2xl", icon: 26, image: "56px", pad: "p-2" },
  lg: { box: "h-20 w-20 rounded-2xl sm:h-24 sm:w-24", icon: 32, image: "96px", pad: "p-2.5" },
} as const;

export function QrCategoryIcon({
  category,
  categories = [],
  size = "md",
  className = "",
  filled = false,
}: {
  category: string;
  categories?: QrCategoryItem[];
  size?: keyof typeof SIZE_MAP;
  className?: string;
  /** White icon on solid category color (header brand mark). */
  filled?: boolean;
}) {
  const matched = findCategoryForQr(category, categories);
  const sizing = SIZE_MAP[size];
  const imageUrl = getCategoryImageUrl(matched?.image);
  const label = getCategoryLabel(category, categories);

  if (imageUrl) {
    return (
      <div
        className={`relative ${sizing.box} shrink-0 overflow-hidden border border-slate-200 bg-white shadow-sm ${className}`}
      >
        <Image
          src={imageUrl}
          alt={label}
          fill
          sizes={sizing.image}
          className={`object-contain ${sizing.pad}`}
          unoptimized
        />
      </div>
    );
  }

  if (filled) {
    const accent = getCategoryAccentClasses(category);
    return (
      <div
        className={`flex ${sizing.box} shrink-0 items-center justify-center text-white shadow-md ${accent.markBg} ${className}`}
      >
        {getCategoryIconFallback(category, sizing.icon)}
      </div>
    );
  }

  return (
    <div
      className={`flex ${sizing.box} shrink-0 items-center justify-center border shadow-inner ${getCategoryColor(category)} ${className}`}
    >
      {getCategoryIconFallback(category, sizing.icon)}
    </div>
  );
}
