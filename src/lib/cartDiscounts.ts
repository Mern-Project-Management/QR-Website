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
    const res = await fetch('/api/backend/public/discounts/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        couponCode: couponCode || null,
      }),
      cache: 'no-store',
    });
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as CartDiscountQuote;
  } catch (error) {
    console.error('Failed to fetch cart discount quote:', error);
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
