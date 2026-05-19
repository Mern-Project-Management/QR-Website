"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PageTitle from "@/components/ui/PageTitle";
import { useCart } from "@/components/providers/CartProvider";
import { ShippingAddress } from '@/types';
import { MapPin, CreditCard, ShoppingBag, CheckCircle, Package, ChevronDown, Plus, Loader } from 'react-feather';
import { Breadcrumb } from "@/components/ui/Breadcrumb";

declare global {
  interface Window {
    Razorpay?: unknown;
  }
}

type RazorpayPaymentSuccessResponse = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

const STATE_MAP: Record<string, string> = {
  AN: 'Andaman & Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh',
  AS: 'Assam', BR: 'Bihar', CG: 'Chhattisgarh', CH: 'Chandigarh', DD: 'Daman & Diu',
  DL: 'Delhi', DN: 'Dadra & Nagar Haveli', GA: 'Goa', GJ: 'Gujarat',
  HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand', JK: 'Jammu & Kashmir',
  KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MH: 'Maharashtra',
  ML: 'Meghalaya', MN: 'Manipur', MP: 'Madhya Pradesh', MZ: 'Mizoram', NL: 'Nagaland',
  OD: 'Odisha', PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim',
  TG: 'Telangana', TN: 'Tamil Nadu', TR: 'Tripura', UK: 'Uttarakhand',
  UP: 'Uttar Pradesh', WB: 'West Bengal',
};

const normalizeState = (state: string): string => {
  if (!state) return '';
  if (!state.includes(',') && state.length > 2) return state;
  const parts = state.split(',').map((p) => p.trim());
  const stateCode = parts[parts.length - 1].toUpperCase();
  return STATE_MAP[stateCode] ?? state;
};

const normalizeCity = (city: string): string => {
  if (!city) return '';
  return city.replace(/\s*\(.*?\)$/g, '').trim();
};

interface SavedAddress {
  id: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  label?: string;
}

const EMPTY_ADDRESS = {
  street: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  name: '',
  email: '',
  country: 'India',
};

const CHECKOUT_SESSION_STORAGE_KEY = 'checkoutSessionId';

function newCheckoutSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function ensureCheckoutSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY)) {
      sessionStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, newCheckoutSessionId());
    }
  } catch {
    // ignore (e.g. storage disabled)
  }
}

function readCheckoutSessionIdForRequest(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const id = sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
    return id && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}

function clearCheckoutSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface QuantityRule {
  minQty: number;
  type: 'percentage' | 'flat';
  value: number;
  maxDiscount?: number | string | null;
}

interface CouponRule {
  code: string;
  type: 'percentage' | 'flat';
  value: number;
}

interface DiscountConfig {
  quantityRules?: QuantityRule[];
  coupon?: CouponRule;
}

interface EnrichedProduct {
  id: number;
  discountConfig?: DiscountConfig | null;
}

interface CheckoutProduct extends Omit<import("@/const/productData").Product, 'discountConfig'> {
  discountConfig?: DiscountConfig | null;
}

interface CheckoutCartItem {
  product: CheckoutProduct;
  quantity: number;
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { cart, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [addressData, setAddressData] = useState(EMPTY_ADDRESS);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [checkoutError, setCheckoutError] = useState<string>('');
  // Default to showing the "new address" form until we load saved addresses.
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [savedAddrDropdownOpen, setSavedAddrDropdownOpen] = useState(false);

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeFilled, setPincodeFilled] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Address CRUD state
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [addressFormError, setAddressFormError] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const savedAddrDropdownRef = useRef<HTMLDivElement>(null);
  const prevCartLengthRef = useRef<number | null>(null);

  const PHONE_ERROR = 'Please enter a valid phone number (8-15 digits).';

  const isValidPhoneDigits = (digits: string) => digits.length >= 8 && digits.length <= 15;

  const [enrichedProducts, setEnrichedProducts] = useState<EnrichedProduct[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Fetch products to enrich the cart with discountConfig
  useEffect(() => {
    const fetchEnriched = async () => {
      try {
        const res = await fetch('/api/backend/products');
        if (res.ok) {
          const data = await res.json();
          setEnrichedProducts(data);
        }
      } catch (err) {
        console.error("Failed to load products for discounts:", err);
      }
    };
    fetchEnriched();
  }, []);

  const getCartItemDiscountDetails = useCallback((item: CheckoutCartItem) => {
    const enriched = enrichedProducts.find(p => p.id === item.product.id);
    const discountConfig = enriched?.discountConfig || item.product.discountConfig || null;
    
    const originalPrice = Number(item.product.price);
    const qty = item.quantity;
    const baseTotal = originalPrice * qty;
    
    let discountAmount = 0;
    let ruleDescription = '';

    // 1. Check for quantity rules first (automatic)
    let quantityDiscount = 0;
    if (discountConfig?.quantityRules && Array.isArray(discountConfig.quantityRules)) {
      const rules = discountConfig.quantityRules
        .filter((r: QuantityRule) => qty >= r.minQty)
        .sort((a: QuantityRule, b: QuantityRule) => b.minQty - a.minQty); // best matching rule

      if (rules.length > 0) {
        const bestRule = rules[0];
        let computed = 0;
        if (bestRule.type === 'percentage') {
          computed = (originalPrice * bestRule.value / 100) * qty;
        } else {
          computed = bestRule.value * qty;
        }
        
        if (bestRule.maxDiscount !== undefined && bestRule.maxDiscount !== null && String(bestRule.maxDiscount) !== '') {
          const cap = Number(bestRule.maxDiscount);
          computed = Math.min(computed, cap);
        }
        
        quantityDiscount = computed;
        ruleDescription = `${bestRule.value}${bestRule.type === 'percentage' ? '%' : '₹'} Bulk Discount (Min Qty: ${bestRule.minQty})`;
      }
    }

    // 2. Check for coupon rules
    let couponDiscount = 0;
    if (appliedCoupon && discountConfig?.coupon) {
      const coupon = discountConfig.coupon;
      if (coupon.code.trim().toUpperCase() === appliedCoupon.trim().toUpperCase()) {
        if (coupon.type === 'percentage') {
          couponDiscount = (originalPrice * coupon.value / 100) * qty;
        } else {
          couponDiscount = coupon.value * qty;
        }
        ruleDescription = `Coupon "${coupon.code}" applied (${coupon.value}${coupon.type === 'percentage' ? '%' : '₹'} off)`;
      }
    }

    if (couponDiscount > 0 && quantityDiscount > 0) {
      discountAmount = couponDiscount + quantityDiscount;
      ruleDescription = `Bulk Discount + Coupon Applied! Saved ₹${discountAmount.toFixed(0)}`;
    } else if (couponDiscount > 0) {
      discountAmount = couponDiscount;
    } else if (quantityDiscount > 0) {
      discountAmount = quantityDiscount;
    }

    discountAmount = Math.min(discountAmount, baseTotal);

    return {
      baseTotal,
      discountAmount,
      finalTotal: baseTotal - discountAmount,
      ruleDescription,
      hasDiscount: discountAmount > 0,
      appliedDiscountType: couponDiscount > 0 && quantityDiscount > 0 ? 'coupon' : (couponDiscount > 0 ? 'coupon' : (quantityDiscount > 0 ? 'quantity' : null))
    };
  }, [enrichedProducts, appliedCoupon]);

  const computedCartDetails = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    const items = cart.map(item => {
      const details = getCartItemDiscountDetails(item as CheckoutCartItem);
      subtotal += details.baseTotal;
      totalDiscount += details.discountAmount;
      return {
        ...item,
        details
      };
    });

    return {
      items,
      subtotal,
      totalDiscount,
      finalTotal: Math.max(0, subtotal - totalDiscount)
    };
  }, [cart, getCartItemDiscountDetails]);

  const cartItems = useMemo(() => {
    return computedCartDetails.items.map(item => {
      const finalItemPrice = item.details.finalTotal / item.quantity;
      return {
        name: item.product.title,
        sku: `SKU-${item.product.id}`,
        quantity: item.quantity,
        price: Number(finalItemPrice.toFixed(2))
      };
    });
  }, [computedCartDetails]);

  const handleApplyCoupon = () => {
    setCouponError(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    let foundCoupon = false;
    for (const item of cart) {
      const enriched = enrichedProducts.find(p => p.id === item.product.id);
      const discountConfig = enriched?.discountConfig || item.product.discountConfig || null;
      if (discountConfig?.coupon?.code?.trim()?.toUpperCase() === code) {
        foundCoupon = true;
        break;
      }
    }

    if (foundCoupon) {
      setAppliedCoupon(code);
      setCouponError(null);
    } else {
      setCouponError(`Coupon code "${code}" is invalid or not applicable to items in your cart.`);
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  // Close saved-address dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (savedAddrDropdownRef.current && !savedAddrDropdownRef.current.contains(e.target as Node)) {
        setSavedAddrDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Stable checkout session id: set once per visit when user reaches checkout (authenticated).
  useEffect(() => {
    if (status !== 'authenticated') return;
    ensureCheckoutSessionId();
  }, [status]);

  // New checkout without completing payment: cart went from non-empty → empty → drop session id so next checkout gets a new UUID.
  useEffect(() => {
    if (prevCartLengthRef.current === null) {
      prevCartLengthRef.current = cart.length;
      return;
    }
    if (prevCartLengthRef.current > 0 && cart.length === 0) {
      clearCheckoutSessionId();
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length]);

  // Auth / session
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      sessionStorage.setItem('checkoutIntent', 'true');
      sessionStorage.setItem('checkoutData', JSON.stringify({ items: cartItems, timestamp: Date.now() }));
      router.push(`/login?callbackUrl=${encodeURIComponent('/checkout')}`);
      return;
    }
    if (status === 'authenticated' && session?.user) {
      setAddressData(prev => ({ ...prev, name: session.user?.name || '', email: session.user?.email || '' }));
      fetchUserAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  useEffect(() => {
    if (status === 'authenticated') {
      sessionStorage.removeItem('checkoutIntent');
      sessionStorage.removeItem('checkoutData');
    }
  }, [status]);

  const fetchUserAddresses = async () => {
    try {
      const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
      const res = await fetch('/api/backend/customer/address', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const result = await res.json();
        
        const topLevelPhone = result?.data?.phone || result?.phone || '';
        if (topLevelPhone) {
          setAddressData(prev => ({ ...prev, phone: topLevelPhone.replace(/\D/g, '').slice(0, 15) }));
        }

        let addresses: SavedAddress[] = [];
        if (Array.isArray(result)) {
          addresses = result;
        } else if (result?.data && Array.isArray(result.data)) {
          addresses = result.data;
        } else if (result?.addresses && Array.isArray(result.addresses)) {
          addresses = result.addresses;
        } else if (result?.data?.addresses && Array.isArray(result.data.addresses)) {
          addresses = result.data.addresses;
        } else if (result?.results && Array.isArray(result.results)) {
          addresses = result.results;
        } else {
          // Last resort: try to find any array in the response
          const found = Object.values(result).find(v => Array.isArray(v));
          if (found) addresses = found as SavedAddress[];
        }
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          if (selectedAddressId === 'new') applyAddress(addresses[0]);
        } else {
          setSelectedAddressId('new');
        }
      } else {
        // Try to parse non-ok response in case it still has data
        try {
          const text = await res.text();
          const parsed = JSON.parse(text);

          const topLevelPhone = parsed?.data?.phone || parsed?.phone || '';
          if (topLevelPhone) {
            setAddressData(prev => ({ ...prev, phone: topLevelPhone.replace(/\D/g, '').slice(0, 15) }));
          }

          if (parsed?.data && Array.isArray(parsed.data)) {
            const addresses = parsed.data as SavedAddress[];
            setSavedAddresses(addresses);
            if (addresses.length > 0 && selectedAddressId === 'new') applyAddress(addresses[0]);
            else setSelectedAddressId('new');
          } else {
            setSelectedAddressId('new');
          }
        } catch {
          setSelectedAddressId('new');
        }
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      setSelectedAddressId('new');
    }
  };

  const applyAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    const phoneDigits = (addr.phone || '').replace(/\D/g, '').slice(0, 15);
    setAddressData(prev => ({
      ...prev,
      street: addr.street || '',
      city: normalizeCity(addr.city || ''),
      state: normalizeState(addr.state || ''),
      pincode: addr.pincode || '',
      phone: phoneDigits || prev.phone,
    }));
    setPincodeError('');
    setPincodeFilled(false);
    setPhoneError('');
  };

  const getAccessToken = (): string | null =>
    (session as unknown as { accessToken?: string | null })?.accessToken || null;

  const handleSaveAddress = async () => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    const street = addressData.street.trim();
    const pincode = addressData.pincode.trim();
    const city = normalizeCity(addressData.city);
    const state = normalizeState(addressData.state);
    const phoneDigits = addressData.phone.replace(/\D/g, '').slice(0, 15);

    if (!street || !pincode || !city || !state) {
      setAddressFormError('Please fill in all address fields before saving.');
      return;
    }
    setAddressFormError('');
    setIsSavingAddress(true);

    try {
      const body = {
        street,
        city,
        state,
        pincode,
        country: 'India',
        phone: phoneDigits,
        label: addressLabel.trim() || undefined,
      };

      const isEdit = editingAddressId !== null;
      const url = isEdit
        ? `/api/backend/customer/address/${editingAddressId}`
        : '/api/backend/customer/address';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchUserAddresses();
        setSaveToAccount(false);
        setAddressLabel('');
        setEditingAddressId(null);
      } else {
        const result = await res.json().catch(() => null);
        setAddressFormError(result?.message || `Failed to ${isEdit ? 'update' : 'save'} address.`);
      }
    } catch {
      setAddressFormError('Something went wrong. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    if (!window.confirm('Are you sure you want to delete this address?')) return;

    setDeletingAddressId(addressId);
    try {
      const res = await fetch(`/api/backend/customer/address/${addressId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        if (selectedAddressId === addressId) {
          setSelectedAddressId('new');
        }
        await fetchUserAddresses();
      } else {
        const result = await res.json().catch(() => null);
        alert(result?.message || 'Failed to delete address.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setDeletingAddressId(null);
    }
  };

  const startEditAddress = (addr: SavedAddress) => {
    setAddressData(prev => ({
      ...prev,
      street: addr.street || '',
      city: normalizeCity(addr.city || ''),
      state: normalizeState(addr.state || ''),
      pincode: addr.pincode || '',
      phone: (addr.phone || '').replace(/\D/g, '').slice(0, 15),
    }));
    setAddressLabel(addr.label || '');
    setEditingAddressId(addr.id);
    setSelectedAddressId('new');
    setPincodeError('');
    setPincodeFilled(false);
    setPhoneError('');
    setSavedAddrDropdownOpen(false);
  };

  const cancelEditAddress = () => {
    setEditingAddressId(null);
    setAddressLabel('');
    setSaveToAccount(false);
    setAddressFormError('');
    const selected = savedAddresses.find(a => a.id === selectedAddressId);
    if (selected) {
      applyAddress(selected);
    } else {
      setAddressData(prev => ({ ...prev, street: '', city: '', state: '', pincode: '' }));
    }
  };

  // Pincode → India Post API → auto-fill city & state
  const lookupPincode = useCallback(async (pin: string) => {
    setPincodeLoading(true);
    setPincodeError('');
    setPincodeFilled(false);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setAddressData(prev => ({ ...prev, city: po.District, state: po.State }));
        setPincodeFilled(true);
      } else {
        setPincodeError('Invalid pincode — please check.');
      }
    } catch {
      setPincodeError('Could not fetch location. Fill manually.');
    } finally {
      setPincodeLoading(false);
    }
  }, []);

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressData(prev => ({ ...prev, pincode: val }));
    setPincodeFilled(false);
    if (val.length === 6) lookupPincode(val);
    else setPincodeError('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 15);
    setAddressData(prev => ({ ...prev, phone: v }));
    if (phoneError && isValidPhoneDigits(v)) setPhoneError('');
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length === 0) {
      setPhoneError('');
      return;
    }
    if (!isValidPhoneDigits(digits)) setPhoneError(PHONE_ERROR);
  };

  // Razorpay
  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) { alert('Cart is empty'); return; }

    const phoneDigits = (addressData.phone || '').replace(/\D/g, '').slice(0, 15);
    if (!isValidPhoneDigits(phoneDigits)) {
      setPhoneError(PHONE_ERROR);
      return;
    }
    setPhoneError('');

    setLoading(true);
    setCheckoutError('');

    const normalizedAddress: ShippingAddress = {
      ...addressData,
      phone: phoneDigits,
      city: normalizeCity(addressData.city),
      state: normalizeState(addressData.state),
      pincode: addressData.pincode.trim(),
      street: addressData.street.trim(),
    };

    if (paymentMethod === 'ONLINE') {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setCheckoutError('Razorpay failed to load. Please try again.');
        setLoading(false);
        return;
      }

      try {
        ensureCheckoutSessionId();
        const checkoutSessionId = readCheckoutSessionIdForRequest();
        const payload = {
          customerId: (session?.user as { id?: string })?.id || null,
          items: cartItems,
          phone: normalizedAddress.phone,
          address: normalizedAddress,
          paymentMethod: 'ONLINE',
          ...(checkoutSessionId ? { checkoutSessionId } : {}),
        };

        const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
        const orderRes = await fetch('/api/razorpay/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        const orderText = await orderRes.text();
        const orderJson = (() => {
          try {
            return JSON.parse(orderText);
          } catch {
            return null;
          }
        })();
        if (!orderRes.ok || !orderJson?.success) {
          setCheckoutError(
            orderJson?.message ||
            (orderText?.startsWith('<!DOCTYPE') ? 'Could not create Razorpay order (server returned HTML). Check backend/proxy.' : 'Could not create Razorpay order. Please try again.')
          );
          setLoading(false);
          return;
        }

        const { keyId, orderId, amount, currency, localOrderId } = orderJson.data || {};
        const description =
          (cartItems || []).map((i) => `${i.name} x${i.quantity}`).join(', ') || 'Order';

        const name = normalizedAddress?.name || 'Customer';
        const email = normalizedAddress?.email || '';
        const rawContact = normalizedAddress.phone || '';
        const contact = String(rawContact).replace(/\D/g, '');

        const RazorpayCtor = window.Razorpay as unknown as new (opts: unknown) => {
          on?: (event: string, cb: (resp: unknown) => void) => void;
          open: () => void;
        };

        const rzp = new RazorpayCtor({
          key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount,
          currency: currency || 'INR',
          name: 'QR Website',
          description,
          order_id: orderId,
          prefill: { name, email, contact },
          readonly: contact ? { contact: true } : undefined,
          notes: { customerId: String((session?.user as { id?: string })?.id || '') },
          theme: { color: '#1e3a8a' },
          handler: async function (response: RazorpayPaymentSuccessResponse) {
            try {
              const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
              const verifyRes = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                  localOrderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyText = await verifyRes.text();
              const verifyJson = (() => {
                try {
                  return JSON.parse(verifyText);
                } catch {
                  return null;
                }
              })();
              if (!verifyRes.ok || !verifyJson?.success) {
                setCheckoutError(
                  verifyJson?.message ||
                  (verifyText?.startsWith('<!DOCTYPE')
                    ? 'Payment verification failed (server returned HTML). Check backend/proxy.'
                    : 'Payment verification failed. If money was deducted, contact support.')
                );
                setLoading(false);
                return;
              }

              // Prepaid flow:
              // Only create Razorpay order -> pay -> verify. Do NOT also POST /api/orders.
              clearCheckoutSessionId();
              clearCart();
              const paidOrderId =
                verifyJson?.orderId ??
                verifyJson?.data?.orderId ??
                verifyJson?.id ??
                localOrderId ??
                "";
              alert(`Payment successful!${paidOrderId ? ` Order ID: ${paidOrderId}` : ""}`);
              router.push('/orders');
              setLoading(false);
            } catch (err) {
              console.error(err);
              setCheckoutError('Payment verification failed. Please try again.');
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setCheckoutError('Payment cancelled.');
              setLoading(false);
            },
          },
        });

        rzp.on?.('payment.failed', (resp: unknown) => {
          console.error('Razorpay payment.failed', resp);
          setCheckoutError('Payment failed. Please try again.');
          setLoading(false);
        });

        rzp.open();
      } catch (err) {
        console.error(err);
        setCheckoutError('Something went wrong. Please try again.');
        setLoading(false);
      }
    } else {
      await completeOrder(normalizedAddress, 'COD');
    }
  };

  const completeOrder = async (address: ShippingAddress, method: string) => {
    try {
      const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;
      const res = await fetch('/api/backend/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          customerId: (session?.user as { id?: string })?.id || null,
          items: cartItems,
          paymentMethod: method,
          address,
        }),
      });
      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })();
      if (res.ok) {
        clearCheckoutSessionId();
        clearCart();
        const orderId = data?.orderId ?? data?.data?.orderId ?? data?.id ?? '';
        alert(`Order placed! Order ID: ${orderId || '(received)'}`);
        router.push('/orders');
      } else {
        alert(
          'Checkout failed: ' +
          (data?.error || data?.message || (text?.startsWith('<!DOCTYPE') ? 'Server returned HTML (check backend/proxy).' : text))
        );
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const safeSavedAddresses = Array.isArray(savedAddresses) ? savedAddresses : [];
  const isNewAddress = selectedAddressId === 'new' || safeSavedAddresses.length === 0;
  const selectedSaved = safeSavedAddresses.find(a => a.id === selectedAddressId);

  if (status === 'loading') {
    return (
      <div className="pt-24 pb-12 max-w-screen-xl mx-auto px-4 font-dm flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
          <p className="mt-4 text-gray-600 font-medium">Loading your checkout…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pt-24 max-w-screen mx-auto font-dm">
        <PageTitle title="Checkout" subtitle="Securely complete your purchase">
          <div className="flex justify-center text-center">
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Checkout' }]} variant="light" />
          </div>
        </PageTitle>
      </div>

      <div className="pt-12 pb-20 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 font-dm">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="w-20 h-20 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-8 max-w-md text-center">Browse our products and find something you love!</p>
            <button onClick={() => router.push('/shop')} className="px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white font-medium rounded-xl transition-all shadow-md flex items-center gap-2">
              <Package size={20} /> Return to Shop
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* ── Left Column ── */}
            <div className="lg:col-span-7 space-y-8">

              {/* Account badge */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-0.5">Account Connected</h3>
                  <p className="text-gray-500 text-sm">Checked in as <span className="font-medium text-gray-900">{session?.user?.email}</span></p>
                </div>
              </div>

              {/* Shipping card */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg shadow-gray-200/40 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-900" />

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Shipping Details</h3>
                </div>

                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">

                  {/* Personal info */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2 border-gray-100">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white"
                          placeholder="John Doe"
                          value={addressData.name}
                          onChange={e => setAddressData({ ...addressData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input
                          className="w-full border border-gray-200 px-4 py-3 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed outline-none"
                          type="email"
                          value={addressData.email}
                          disabled
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="checkout-phone">
                          Phone Number
                        </label>
                        <input
                          id="checkout-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={15}
                          className={`w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white ${phoneError ? 'border-red-300' : 'border-gray-200'}`}
                          placeholder="8-15 digits (numbers only)"
                          value={addressData.phone}
                          onChange={handlePhoneChange}
                          onBlur={handlePhoneBlur}
                          aria-invalid={!!phoneError}
                          aria-describedby={phoneError ? 'checkout-phone-error' : undefined}
                        />
                        {phoneError ? (
                          <p id="checkout-phone-error" className="text-sm text-red-600 mt-1" role="alert">
                            {phoneError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Delivery address */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2 border-gray-100">Delivery Address</h4>

                    {/* ── Saved addresses dropdown ── */}
                    {safeSavedAddresses.length > 0 && (
                      <div className="mb-5" ref={savedAddrDropdownRef}>
                        <label className="text-sm font-medium text-gray-700 block mb-1.5">Saved Addresses</label>
                        <div className="relative">
                          {/* Trigger button */}
                          <button
                            type="button"
                            onClick={() => setSavedAddrDropdownOpen(o => !o)}
                            className="w-full flex items-center justify-between border-2 border-gray-200 hover:border-blue-300 focus:border-blue-900 focus:outline-none px-4 py-3 rounded-xl bg-white transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <MapPin size={16} className="text-blue-700 flex-shrink-0" />
                              {isNewAddress ? (
                                <span className="text-gray-600 text-sm">Enter a new address</span>
                              ) : selectedSaved ? (
                                <span className="text-gray-800 text-sm font-medium truncate">
                                  {selectedSaved.label && (
                                    <span className="text-blue-900 font-bold mr-1.5">{selectedSaved.label}:</span>
                                  )}
                                  {selectedSaved.street}, {normalizeCity(selectedSaved.city)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">Select a saved address…</span>
                              )}
                            </div>
                            <ChevronDown size={17} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200 ${savedAddrDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Dropdown list */}
                          {savedAddrDropdownOpen && (
                            <div className="absolute z-40 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                              {safeSavedAddresses.map((addr) => (
                                <button
                                  key={addr.id}
                                  type="button"
                                  onClick={() => { applyAddress(addr); setSavedAddrDropdownOpen(false); }}
                                  className={`w-full text-left px-4 py-3.5 hover:bg-blue-50/60 transition-colors border-b border-gray-100 last:border-0 flex items-start gap-3 group ${selectedAddressId === addr.id ? 'bg-blue-50/40' : ''}`}
                                >
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${selectedAddressId === addr.id ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-800'}`}>
                                    <MapPin size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {addr.label && (
                                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block mb-0.5">{addr.label}</span>
                                    )}
                                    <p className="text-sm font-medium text-gray-800 truncate">{addr.street}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {normalizeCity(addr.city)}, {normalizeState(addr.state)} — {addr.pincode}
                                    </p>
                                  </div>
                                  {selectedAddressId === addr.id && (
                                    <CheckCircle size={16} className="text-blue-900 flex-shrink-0 mt-1" />
                                  )}
                                </button>
                              ))}

                              {/* New address row */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAddressId('new');
                                  setSavedAddrDropdownOpen(false);
                                  setAddressData(prev => ({ ...prev, street: '', city: '', state: '', pincode: '' }));
                                  setPincodeError('');
                                  setPincodeFilled(false);
                                }}
                                className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3 group ${isNewAddress ? 'bg-gray-50' : ''}`}
                              >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-dashed transition-colors ${isNewAddress ? 'border-blue-900 text-blue-900' : 'border-gray-300 text-gray-400 group-hover:border-gray-400'}`}>
                                  <Plus size={15} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Enter a new address</span>
                                {isNewAddress && <CheckCircle size={16} className="text-blue-900 ml-auto" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary card (saved address selected) */}
                    {!isNewAddress && selectedSaved && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-blue-900 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin size={15} />
                          </div>
                          <div className="flex-1 text-sm text-gray-700 leading-relaxed min-w-0">
                            {selectedSaved.label && (
                              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block mb-1">{selectedSaved.label}</span>
                            )}
                            <p className="font-medium text-gray-900">{selectedSaved.street}</p>
                            <p className="text-gray-500">{normalizeCity(selectedSaved.city)}, {normalizeState(selectedSaved.state)}, {selectedSaved.pincode}</p>
                            {selectedSaved.phone && <p className="text-gray-400 mt-1 text-xs">{selectedSaved.phone}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSavedAddrDropdownOpen(true)}
                            className="text-xs text-blue-700 font-semibold hover:underline flex-shrink-0 mt-0.5"
                          >
                            Change
                          </button>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-blue-100/60">
                          <button
                            type="button"
                            onClick={() => startEditAddress(selectedSaved)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(selectedSaved.id)}
                            disabled={deletingAddressId === selectedSaved.id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingAddressId === selectedSaved.id ? (
                              <Loader size={13} className="animate-spin" />
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    )}

                    {/* New address form fields */}
                    {isNewAddress && (
                      <div className="space-y-3">

                        {/* Street */}
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Street Address</label>
                          <div className="relative">
                            <input
                              className="w-full border border-gray-200 px-4 py-3 pr-10 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white"
                              placeholder="Start typing your address…"
                              value={addressData.street}
                              onChange={e => setAddressData({ ...addressData, street: e.target.value })}
                              required
                              autoComplete="off"
                            />
                            <MapPin size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                          </div>
                        </div>

                        {/* Pincode → India Post API */}
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            Pincode
                            {pincodeLoading && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 font-normal">
                                <Loader size={11} className="animate-spin" /> Fetching location…
                              </span>
                            )}
                            {pincodeFilled && !pincodeLoading && (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-normal">
                                <CheckCircle size={11} /> City &amp; state auto-filled
                              </span>
                            )}
                          </label>
                          <input
                            className={`w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white ${pincodeError ? 'border-red-300' : 'border-gray-200'}`}
                            placeholder="6-digit pincode"
                            value={addressData.pincode}
                            onChange={handlePincodeChange}
                            maxLength={6}
                            inputMode="numeric"
                            required
                          />
                          {pincodeError && <p className="text-xs text-red-500 mt-0.5">{pincodeError}</p>}
                        </div>

                        {/* City & State — auto-filled, but editable */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">City / District</label>
                            <input
                              className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white"
                              placeholder="Auto-filled"
                              value={addressData.city}
                              onChange={e => setAddressData({ ...addressData, city: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">State</label>
                            <input
                              className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white"
                              placeholder="Auto-filled"
                              value={addressData.state}
                              onChange={e => setAddressData({ ...addressData, state: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Country</label>
                          <input
                            className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white"
                            value={addressData.country}
                            onChange={e => setAddressData({ ...addressData, country: e.target.value })}
                            required
                          />
                        </div>

                        {/* Address label */}
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Address Label (optional)</label>
                          <input
                            className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all bg-gray-50/50 hover:bg-white"
                            placeholder="e.g. Home, Work, Office"
                            value={addressLabel}
                            onChange={e => setAddressLabel(e.target.value)}
                            maxLength={30}
                          />
                        </div>

                        {/* Save to account checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={saveToAccount}
                            onChange={e => setSaveToAccount(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900/30 cursor-pointer"
                          />
                          <div className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                            <span className="font-medium text-gray-800">Save this address to my account</span>
                            <p className="text-xs text-gray-400 mt-0.5">Save for faster checkout next time.</p>
                          </div>
                        </label>

                        {/* Save / Cancel buttons */}
                        {(saveToAccount || editingAddressId) && (
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={handleSaveAddress}
                              disabled={isSavingAddress}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition-all shadow-md disabled:opacity-60"
                            >
                              {isSavingAddress ? (
                                <><Loader size={15} className="animate-spin" /> Saving…</>
                              ) : editingAddressId ? (
                                <><CheckCircle size={15} /> Update Address</>
                              ) : (
                                <><CheckCircle size={15} /> Save Address</>
                              )}
                            </button>
                            {editingAddressId && (
                              <button
                                type="button"
                                onClick={cancelEditAddress}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                        {addressFormError && (
                          <p className="text-sm text-red-600 flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            {addressFormError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment method */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center">
                        <CreditCard size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Payment Method</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(['COD', 'ONLINE'] as const).map(method => (
                        <label
                          key={method}
                          className={`flex items-center gap-3 cursor-pointer border-2 px-5 py-4 rounded-xl transition-all ${paymentMethod === method ? 'border-blue-900 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === method ? 'border-blue-900' : 'border-gray-300'}`}>
                            {paymentMethod === method && <div className="w-2.5 h-2.5 bg-blue-900 rounded-full" />}
                          </div>
                          <input className="hidden" type="radio" value={method} checked={paymentMethod === method} onChange={e => setPaymentMethod(e.target.value)} />
                          <div>
                            <p className={`font-semibold ${paymentMethod === method ? 'text-blue-900' : 'text-gray-900'}`}>
                              {method === 'COD' ? 'Cash on Delivery' : 'Pay Online'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {method === 'COD' ? 'Pay when you receive' : 'UPI, Cards, NetBanking'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* ── Right Column: Order Summary ── */}
            <div className="lg:col-span-5">
              <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-200 sticky top-28">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h3>

                <div className="space-y-4 mb-6">
                  {computedCartDetails.items.map((item, idx) => {
                    const originalUnit = Number(item.product.price);
                    const hasDiscount = item.details.hasDiscount;
                    const enriched = enrichedProducts.find(p => p.id === item.product.id);
                    const discountConfig = enriched?.discountConfig || item.product.discountConfig || null;

                    return (
                      <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all">
                        <div className="w-14 h-14 bg-blue-50/50 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-900">
                          <Package size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{item.product.title}</h4>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-400 font-medium">Qty: {item.quantity}</span>
                            {hasDiscount && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Discount Applied
                              </span>
                            )}
                          </div>

                          {hasDiscount && (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 leading-snug">
                              {item.details.ruleDescription}
                            </p>
                          )}

                          {!appliedCoupon && discountConfig?.coupon && (
                            <button
                              type="button"
                              onClick={() => {
                                const code = discountConfig.coupon?.code;
                                if (code) {
                                  setCouponInput(code);
                                  setAppliedCoupon(code);
                                }
                              }}
                              className="text-[11px] text-blue-700 hover:text-blue-950 font-bold underline mt-1.5 text-left block transition-colors"
                            >
                              Use code &quot;{discountConfig.coupon.code}&quot; to save {discountConfig.coupon.value}{discountConfig.coupon.type === 'percentage' ? '%' : '₹'}!
                            </button>
                          )}

                          {discountConfig?.quantityRules && Array.isArray(discountConfig.quantityRules) && discountConfig.quantityRules.length > 0 && (
                            <div className="mt-2.5 p-2 rounded-lg bg-blue-50/30 border border-blue-100/50">
                              <p className="text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1">Bulk Buy Offers:</p>
                              <div className="space-y-0.5">
                                {discountConfig.quantityRules.map((rule: QuantityRule, idx2: number) => {
                                  const isMet = item.quantity >= rule.minQty;
                                  return (
                                    <p key={idx2} className={`text-[10px] font-semibold flex items-center gap-1 ${isMet ? 'text-green-700' : 'text-gray-500'}`}>
                                      <span className={`w-1 h-1 rounded-full ${isMet ? 'bg-green-500' : 'bg-gray-400'}`} />
                                      Buy {rule.minQty}+: Save {rule.value}{rule.type === 'percentage' ? '%' : '₹'}! {isMet && '(Active)'}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {hasDiscount ? (
                            <>
                              <p className="font-bold text-blue-900 text-sm">₹{item.details.finalTotal.toFixed(2).replace(/\.00$/, '')}</p>
                              <p className="line-through text-xs text-gray-400 mt-0.5">₹{item.details.baseTotal.toFixed(2).replace(/\.00$/, '')}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-gray-900 text-sm">₹{item.details.baseTotal.toFixed(2).replace(/\.00$/, '')}</p>
                              {item.quantity > 1 && <p className="text-xs text-gray-400 mt-0.5">₹{originalUnit.toFixed(2).replace(/\.00$/, '')} each</p>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Promo Code Coupon Input Box */}
                <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm mb-6">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Have a promo code?</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      value={couponInput}
                      onChange={e => {
                        setCouponInput(e.target.value);
                        setCouponError(null);
                      }}
                      className="flex-1 border border-gray-200 px-3.5 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none transition-all uppercase text-sm font-semibold tracking-wider placeholder-gray-300 bg-gray-50/50 hover:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 mt-2 font-medium">{couponError}</p>}
                  {appliedCoupon && (
                    <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 text-xs font-bold px-3.5 py-2.5 rounded-xl mt-3 border border-emerald-100">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Coupon &quot;{appliedCoupon}&quot; Applied!
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-emerald-900 hover:text-red-600 transition-colors font-extrabold underline text-[11px]"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-5 space-y-3 mb-6 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">₹{computedCartDetails.subtotal.toFixed(2).replace(/\.00$/, '')}</span>
                  </div>
                  {computedCartDetails.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Total Savings</span>
                      <span>-₹{computedCartDetails.totalDiscount.toFixed(2).replace(/\.00$/, '')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Taxes</span>
                    <span className="font-semibold text-gray-900">Included</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-5 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-3xl font-extrabold text-blue-900">₹{computedCartDetails.finalTotal.toFixed(2).replace(/\.00$/, '')}</span>
                  </div>
                  <p className="text-right text-xs text-gray-400 mt-1">Includes all taxes</p>
                </div>

                <button
                  onClick={() => {
                    const form = document.getElementById('checkout-form') as HTMLFormElement;
                    if (form.checkValidity()) {
                      if (typeof form.requestSubmit === 'function') {
                        form.requestSubmit();
                      } else {
                        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                      }
                    } else {
                      form.reportValidity();
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex justify-center items-center gap-3 text-base"
                >
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                  ) : (
                    paymentMethod === 'ONLINE' ? 'Pay Now & Place Order' : 'Place Order via COD'
                  )}
                </button>
                {checkoutError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {checkoutError}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400 bg-white py-2.5 px-4 rounded-lg border border-gray-100">
                  <CheckCircle size={14} className="text-green-500" />
                  Secure and encrypted checkout
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}