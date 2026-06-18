export type CartDiscountLine = {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discountAmount: number;
  finalLineTotal: number;
  discountedUnitPrice: number;
};

export type AvailableDiscountOffer = {
  ruleId: number;
  name: string;
  code: string | null;
  discountType: string;
  value: number;
  requiresCoupon: boolean;
  isApplicable: boolean;
  isApplied: boolean;
  estimatedDiscount: number;
  eligibleQty: number;
  eligibleSubtotal: number;
  minQty: number;
  minCartTotal: number | null;
  unmetRequirements: string[];
  description: string;
};

export type CartDiscountQuote = {
  subtotal: number;
  discountTotal: number;
  total: number;
  lines: CartDiscountLine[];
  appliedRules: Array<{
    ruleId: number;
    name: string;
    code: string | null;
    discountAmount: number;
    productIds: number[];
  }>;
  availableOffers?: AvailableDiscountOffer[];
};

export type CartItemForDiscount = {
  productId: number;
  quantity: number;
  price: number;
};

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizeOffer(raw: Record<string, unknown>): AvailableDiscountOffer {
  return {
    ruleId: Number(raw.ruleId ?? raw.rule_id ?? 0),
    name: String(raw.name ?? ""),
    code: (raw.code as string | null) ?? null,
    discountType: String(raw.discountType ?? raw.discount_type ?? ""),
    value: Number(raw.value ?? 0),
    requiresCoupon: asBool(raw.requiresCoupon ?? raw.requires_coupon),
    isApplicable: asBool(raw.isApplicable ?? raw.is_applicable),
    isApplied: asBool(raw.isApplied ?? raw.is_applied),
    estimatedDiscount: Number(raw.estimatedDiscount ?? raw.estimated_discount ?? 0),
    eligibleQty: Number(raw.eligibleQty ?? raw.eligible_qty ?? 0),
    eligibleSubtotal: Number(raw.eligibleSubtotal ?? raw.eligible_subtotal ?? 0),
    minQty: Number(raw.minQty ?? raw.min_qty ?? 0),
    minCartTotal:
      raw.minCartTotal != null
        ? Number(raw.minCartTotal)
        : raw.min_cart_total != null
          ? Number(raw.min_cart_total)
          : null,
    unmetRequirements: Array.isArray(raw.unmetRequirements)
      ? (raw.unmetRequirements as string[])
      : Array.isArray(raw.unmet_requirements)
        ? (raw.unmet_requirements as string[])
        : [],
    description: String(raw.description ?? ""),
  };
}

function normalizeCartDiscountQuote(data: Record<string, unknown>): CartDiscountQuote {
  const rawOffers = data.availableOffers ?? data.available_offers;
  const offers = Array.isArray(rawOffers)
    ? rawOffers
        .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
        .map((item) => normalizeOffer(item))
    : [];

  const rawLines = data.lines;
  const lines = Array.isArray(rawLines)
    ? (rawLines as CartDiscountLine[])
    : [];

  const rawApplied = data.appliedRules ?? data.applied_rules;
  const appliedRules = Array.isArray(rawApplied)
    ? (rawApplied as CartDiscountQuote["appliedRules"])
    : [];

  return {
    subtotal: Number(data.subtotal ?? 0),
    discountTotal: Number(data.discountTotal ?? data.discount_total ?? 0),
    total: Number(data.total ?? 0),
    lines,
    appliedRules,
    availableOffers: offers,
  };
}

export async function fetchCartDiscountQuote(
  items: CartItemForDiscount[],
  couponCode?: string | null
): Promise<CartDiscountQuote | null> {
  if (!items.length) {
    return {
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      lines: [],
      appliedRules: [],
      availableOffers: [],
    };
  }

  try {
    const res = await fetch("/api/backend/public/discounts/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        couponCode: couponCode || null,
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: Record<string, unknown>;
      availableOffers?: unknown;
      available_offers?: unknown;
    };
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;
    if (json.success === false && !Array.isArray(payload.availableOffers) && !Array.isArray(payload.available_offers)) {
      return null;
    }
    return normalizeCartDiscountQuote(payload as Record<string, unknown>);
  } catch (error) {
    console.error("Failed to fetch cart discount quote:", error);
    return null;
  }
}

export function emptyCartDiscountQuote(items: CartItemForDiscount[]): CartDiscountQuote {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return {
    subtotal,
    discountTotal: 0,
    total: subtotal,
    lines: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.price,
      lineSubtotal: item.price * item.quantity,
      discountAmount: 0,
      finalLineTotal: item.price * item.quantity,
      discountedUnitPrice: item.price,
    })),
    appliedRules: [],
    availableOffers: [],
  };
}

export function getLineDiscount(
  quote: CartDiscountQuote | null,
  productId: number
): CartDiscountLine | undefined {
  return quote?.lines.find((line) => line.productId === productId);
}

/** Non-coupon offers shown in cart/checkout (same grouping as checkout auto offers). */
export function getAutoDiscountOffers(
  offers: AvailableDiscountOffer[] | undefined
): AvailableDiscountOffer[] {
  return (offers ?? []).filter((offer) => !offer.requiresCoupon);
}

export function getOfferHintMessage(offer: AvailableDiscountOffer, cartQty?: number): string {
  if (offer.unmetRequirements.length > 0) {
    return offer.unmetRequirements.join(" · ");
  }
  if (!offer.isApplicable && offer.minQty > 0) {
    const current = cartQty ?? 0;
    const needed = Math.max(0, offer.minQty - current);
    if (needed > 0) {
      return `Add ${needed} more item${needed === 1 ? "" : "s"} to unlock this discount (min. ${offer.minQty}).`;
    }
    return `Add more quantity to unlock this discount (min. ${offer.minQty} items).`;
  }
  if (offer.description) return offer.description;
  if (offer.estimatedDiscount > 0) {
    return `Save up to ₹${offer.estimatedDiscount.toFixed(2).replace(/\.00$/, "")} when eligible.`;
  }
  return "Add more items to unlock this offer.";
}

/** @deprecated use getAutoDiscountOffers + getOfferHintMessage */
export function getPendingAutoDiscountOffers(
  offers: AvailableDiscountOffer[] | undefined
): AvailableDiscountOffer[] {
  return getAutoDiscountOffers(offers).filter((offer) => !offer.isApplicable);
}

export function getAppliedAutoDiscountOffers(
  offers: AvailableDiscountOffer[] | undefined
): AvailableDiscountOffer[] {
  return getAutoDiscountOffers(offers).filter((offer) => offer.isApplied);
}

export function getPendingCouponOffers(
  offers: AvailableDiscountOffer[] | undefined
): AvailableDiscountOffer[] {
  return (offers ?? []).filter(
    (offer) => offer.requiresCoupon && Boolean(offer.code) && !offer.isApplicable
  );
}

export function getEligibleCouponOffers(
  offers: AvailableDiscountOffer[] | undefined
): AvailableDiscountOffer[] {
  return (offers ?? []).filter(
    (offer) =>
      offer.requiresCoupon &&
      Boolean(offer.code) &&
      offer.isApplicable &&
      !offer.isApplied
  );
}

export function getEligibleAutoOffers(
  offers: AvailableDiscountOffer[] | undefined
): AvailableDiscountOffer[] {
  return getAutoDiscountOffers(offers).filter(
    (offer) => offer.isApplicable && !offer.isApplied
  );
}

export function getEligibleOfferMessage(offer: AvailableDiscountOffer): string {
  const savings =
    offer.estimatedDiscount > 0
      ? ` You could save ₹${offer.estimatedDiscount.toFixed(2).replace(/\.00$/, "")}!`
      : "";
  if (offer.code) {
    return `Hurray! You're eligible for this discount.${savings} Apply code ${offer.code} at checkout.`;
  }
  return `Hurray! You're eligible for ${offer.name}!${savings}`;
}

/** Stable key for tracking eligibility transitions per offer. */
export function offerEligibilityKey(offer: AvailableDiscountOffer): string {
  return String(offer.ruleId || offer.code || offer.name);
}
