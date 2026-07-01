"use client";

import { useCart } from "@/components/providers/CartProvider";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart, X, Plus, Minus, Trash2, Tag, Gift } from "react-feather";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";
import { fireCartDiscountCelebration } from "@/lib/cartCelebration";
import {
    getAutoDiscountOffers,
    getEligibleAutoOffers,
    getEligibleCouponOffers,
    getEligibleOfferMessage,
    getOfferHintMessage,
    getPendingCouponOffers,
    offerEligibilityKey,
    type AvailableDiscountOffer,
} from "@/lib/cartDiscounts";

export default function CartDropdown() {
    const {
        cart,
        addToCart,
        removeFromCart,
        cartSubtotal,
        cartDiscount,
        cartTotal,
        discountLoading,
        cartOpenSignal,
        isCartOpen,
        setIsCartOpen,
        closeCart,
        availableOffers,
        refreshDiscountQuote,
    } = useCart();

    const cartTotalQty = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    const autoDiscountOffers = useMemo(
        () => getAutoDiscountOffers(availableOffers),
        [availableOffers]
    );

    const pendingCouponOffers = useMemo(
        () => getPendingCouponOffers(availableOffers),
        [availableOffers]
    );

    const eligibleCouponOffers = useMemo(
        () => getEligibleCouponOffers(availableOffers),
        [availableOffers]
    );

    const eligibleAutoOffers = useMemo(
        () => getEligibleAutoOffers(availableOffers),
        [availableOffers]
    );

    const hasAnyOfferContent =
        discountLoading ||
        autoDiscountOffers.length > 0 ||
        pendingCouponOffers.length > 0 ||
        eligibleCouponOffers.length > 0 ||
        eligibleAutoOffers.length > 0 ||
        cartDiscount > 0;

    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevCartOpenSignalRef = useRef(0);
    const prevEligibilityRef = useRef<Map<string, boolean>>(new Map());
    const eligibilityInitializedRef = useRef(false);

    const toggleDropdown = () => setIsCartOpen(!isCartOpen);
    const closeDropdown = () => closeCart();

    const extendAutoClose = (ms: number) => {
        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(() => closeCart(), ms);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (cartOpenSignal === prevCartOpenSignalRef.current) return;
        prevCartOpenSignalRef.current = cartOpenSignal;
        if (cartOpenSignal === 0) return;

        extendAutoClose(5000);

        return () => {
            if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        };
    }, [cartOpenSignal]);

    useEffect(() => {
        if (isCartOpen && cart.length > 0) {
            refreshDiscountQuote();
        }
    }, [isCartOpen, cart.length, refreshDiscountQuote]);

    useEffect(() => {
        if (!isCartOpen) {
            setShowCelebration(false);
            setCelebrationMessage(null);
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
                autoCloseTimerRef.current = null;
            }
        }
    }, [isCartOpen]);

    useEffect(() => {
        if (discountLoading || !isCartOpen) return;

        const byKey = new Map<string, AvailableDiscountOffer>();
        for (const offer of [...eligibleCouponOffers, ...pendingCouponOffers, ...autoDiscountOffers]) {
            byKey.set(offerEligibilityKey(offer), offer);
        }

        let newlyEligible: AvailableDiscountOffer | null = null;

        for (const offer of byKey.values()) {
            const key = offerEligibilityKey(offer);
            const applicable = offer.isApplicable;
            const prev = prevEligibilityRef.current.get(key);

            if (eligibilityInitializedRef.current && prev === false && applicable) {
                newlyEligible = offer;
            }

            prevEligibilityRef.current.set(key, applicable);
        }

        eligibilityInitializedRef.current = true;

        if (newlyEligible) {
            setShowCelebration(true);
            setCelebrationMessage(getEligibleOfferMessage(newlyEligible));
            fireCartDiscountCelebration();
            extendAutoClose(8000);
        }
    }, [
        availableOffers,
        discountLoading,
        isCartOpen,
        eligibleCouponOffers,
        pendingCouponOffers,
        autoDiscountOffers,
    ]);

    const celebrationBanner =
        showCelebration && celebrationMessage ? (
            <div
                className="border-b border-emerald-200 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 px-4 py-3 text-white shadow-lg shadow-emerald-900/20 animate-[celebrate-pop_0.35s_ease-out]"
                role="status"
            >
                <p className="text-sm font-extrabold tracking-tight">
                    🎉 Hurray! You&apos;re eligible for the discount!
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-50 leading-snug">
                    {celebrationMessage}
                </p>
            </div>
        ) : null;

    const mobileCelebrationToast =
        mounted && isCartOpen && celebrationBanner
            ? createPortal(
                  <div
                      data-cart-celebration
                      className="pointer-events-none fixed left-2 right-2 top-[calc(4.25rem+var(--maintenance-banner-offset,0px))] z-[10101] sm:hidden"
                      aria-live="polite"
                  >
                      <div className="overflow-hidden rounded-2xl border border-emerald-300/80">
                          {celebrationBanner}
                      </div>
                  </div>,
                  document.body
              )
            : null;

    const renderPendingOfferCard = (offer: AvailableDiscountOffer) => (
        <div
            key={offer.ruleId}
            className="flex gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5"
        >
            <Tag size={14} className="mt-0.5 shrink-0 text-violet-700" aria-hidden />
            <div className="min-w-0">
                <p className="text-xs font-bold text-violet-900">{offer.name}</p>
                <p className="mt-1 text-[11px] font-semibold leading-snug text-violet-800">
                    {getOfferHintMessage(offer, cartTotalQty)}
                    {offer.code ? ` Use code ${offer.code} at checkout.` : ""}
                </p>
            </div>
        </div>
    );

    const renderEligibleOfferCard = (offer: AvailableDiscountOffer) => (
        <div
            key={`eligible-${offer.ruleId}`}
            className="relative overflow-hidden flex gap-2 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-green-50 to-amber-50 px-3 py-2.5 shadow-sm animate-[pulse-soft_2s_ease-in-out_infinite]"
        >
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-200/40 blur-xl" aria-hidden />
            <Gift size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-emerald-900">
                    🎉 Hurray! You&apos;re eligible for the discount
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-emerald-800">{offer.name}</p>
                <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-900/90">
                    {getEligibleOfferMessage(offer)}
                </p>
            </div>
        </div>
    );

    const renderAutoOfferCard = (offer: AvailableDiscountOffer) => {
        if (offer.isApplied) {
            return (
                <div
                    key={offer.ruleId}
                    className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"
                >
                    <Tag size={14} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-900">{offer.name}</p>
                        <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-800">
                            {offer.estimatedDiscount > 0
                                ? `You're saving ₹${offer.estimatedDiscount.toFixed(2).replace(/\.00$/, "")} on this order.`
                                : offer.description}
                        </p>
                    </div>
                </div>
            );
        }

        if (offer.isApplicable) {
            return renderEligibleOfferCard(offer);
        }

        return (
            <div
                key={offer.ruleId}
                className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5"
            >
                <Tag size={14} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
                <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-900">{offer.name}</p>
                    {offer.description ? (
                        <p className="mt-0.5 text-[11px] leading-snug text-amber-800 opacity-90">
                            {offer.description}
                        </p>
                    ) : null}
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-amber-800">
                        {getOfferHintMessage(offer, cartTotalQty)}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div ref={containerRef} data-cart-dropdown-root className="relative shrink-0">
            {mobileCelebrationToast}
            <style>{`
                @keyframes pulse-soft {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.25); }
                    50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                }
                @keyframes celebrate-pop {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <button
                type="button"
                onClick={toggleDropdown}
                className="tap-target relative inline-flex items-center justify-center rounded-lg p-2.5 text-gray-700 transition hover:bg-gray-100 hover:text-blue-600 active:scale-95"
                aria-haspopup="dialog"
                aria-expanded={isCartOpen}
            >
                <ShoppingCart size={22} />
                {cart.length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cart.length}
                    </span>
                )}
            </button>

            {isCartOpen && (
                <div
                    role="dialog"
                    aria-label="Cart"
                    data-cart-dropdown-panel
                    className={`fixed left-2 right-2 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem] sm:max-w-[calc(100vw-1rem)] bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 overflow-hidden flex flex-col sm:max-h-[min(32rem,calc(100dvh-var(--maintenance-banner-offset,0px)-1.5rem))] ${
                        showCelebration && celebrationMessage
                            ? "top-[calc(4.25rem+var(--maintenance-banner-offset,0px)+5.25rem)] sm:top-auto max-h-[calc(100dvh-var(--maintenance-banner-offset,0px)-10rem)]"
                            : "top-[calc(4.25rem+var(--maintenance-banner-offset,0px))] sm:top-auto max-h-[calc(100dvh-var(--maintenance-banner-offset,0px)-4.75rem)]"
                    }`}
                >
                    {celebrationBanner ? (
                        <div className="hidden shrink-0 sm:block">{celebrationBanner}</div>
                    ) : null}

                    <div className="flex items-center justify-between px-4 sm:px-4.5 py-3 sm:py-3.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
                        <h3 className="text-sm font-extrabold tracking-wide text-gray-900">
                            Shopping Cart ({cart.length})
                        </h3>
                        <button
                            type="button"
                            onClick={closeDropdown}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:scale-95 transition-all"
                            aria-label="Close cart"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {cart.length === 0 ? (
                        <div className="px-5 py-10 sm:py-8 text-center">
                            <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                                <ShoppingCart size={24} />
                            </div>
                            <p className="text-sm font-semibold text-gray-700">Your cart is empty.</p>
                            <p className="mt-1 text-xs text-gray-400">Add items to see them here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4.5 py-1 sm:py-2 divide-y divide-gray-100">
                                {cart.map((item) => (
                                    <div
                                        key={item.product.id}
                                        className="flex gap-3 py-3.5 sm:py-4 items-start transition-all duration-300"
                                    >
                                        <div className="relative w-14 h-14 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
                                            <Image
                                                src={resolveBackendImageSrc(
                                                    item.product.imgOne,
                                                    "/images/fallback-image.png"
                                                )}
                                                alt={item.product.title}
                                                fill
                                                sizes="56px"
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                                                    {item.product.title}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="w-8 h-8 -mt-1 -mr-1 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition shrink-0 active:scale-95"
                                                    aria-label={`Remove ${item.product.title} from cart`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-extrabold text-blue-900">
                                                    ₹{item.product.price}
                                                    <span className="ml-1 text-[10px] font-bold text-gray-400 tracking-wide">
                                                        × {item.quantity}
                                                    </span>
                                                </p>
                                                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-0.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (item.quantity > 1) {
                                                                addToCart(item.product, -1);
                                                            } else {
                                                                removeFromCart(item.product.id);
                                                            }
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition active:scale-95 shrink-0"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={12} strokeWidth={2.5} />
                                                    </button>
                                                    <span className="w-6 text-center text-xs font-extrabold text-gray-800">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(item.product, 1)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition active:scale-95 shrink-0"
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus size={12} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {hasAnyOfferContent ? (
                                    <div className="py-3 space-y-2 border-t border-gray-100 mt-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-0.5">
                                            Offers & savings
                                        </p>
                                        {discountLoading && eligibleCouponOffers.length === 0 && pendingCouponOffers.length === 0 ? (
                                            <p className="text-xs text-gray-500 px-1">Checking available offers…</p>
                                        ) : null}

                                        {eligibleCouponOffers.map(renderEligibleOfferCard)}

                                        {autoDiscountOffers.map(renderAutoOfferCard)}

                                        {pendingCouponOffers
                                            .filter(
                                                (pending) =>
                                                    !eligibleCouponOffers.some(
                                                        (e) => e.ruleId === pending.ruleId
                                                    )
                                            )
                                            .map(renderPendingOfferCard)}

                                        {!discountLoading &&
                                        eligibleCouponOffers.length === 0 &&
                                        autoDiscountOffers.length === 0 &&
                                        pendingCouponOffers.length === 0 &&
                                        cartDiscount > 0 ? (
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                                <p className="text-xs font-bold text-emerald-900">Discount applied</p>
                                                <p className="mt-0.5 text-[11px] font-semibold text-emerald-800">
                                                    You&apos;re saving ₹
                                                    {cartDiscount.toFixed(2).replace(/\.00$/, "")} on this order.
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                            <div className="px-4 sm:px-4.5 py-3.5 sm:py-4 border-t border-gray-100 bg-gray-50/40 shrink-0">
                                {cartDiscount > 0 && (
                                    <>
                                        <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                                            <span>Subtotal</span>
                                            <span className="tabular-nums">₹{cartSubtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm text-green-700 mb-1.5">
                                            <span>Discount</span>
                                            <span className="tabular-nums">−₹{cartDiscount.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between items-center font-bold text-gray-900">
                                    <span className="text-sm">Total Amount</span>
                                    <span className="text-base text-blue-900 tabular-nums">
                                        {discountLoading ? "…" : `₹${cartTotal.toFixed(2)}`}
                                    </span>
                                </div>
                                <Link
                                    onClick={() => closeCart()}
                                    href="/checkout"
                                    className="mt-3 sm:mt-3.5 block text-center w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 transition-all active:scale-[0.98]"
                                >
                                    Checkout
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
