"use client";

import { useCart } from "@/components/providers/CartProvider";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "react-feather";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";

export default function CartDropdown() {
    const { cart, addToCart, removeFromCart, cartTotal } = useCart();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevCartCountRef = useRef<number>(cart.length);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const closeDropdown = () => setIsOpen(false);

    useEffect(() => {
        if (!isOpen) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const el = containerRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) {
                closeDropdown();
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeDropdown();
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("touchstart", onPointerDown, { passive: true });
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("touchstart", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen]);

    useEffect(() => {
        const prev = prevCartCountRef.current;
        const next = cart.length;
        prevCartCountRef.current = next;

        // If something was added, briefly show the cart then auto-close.
        if (next > prev) {
            setIsOpen(true);
            if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = setTimeout(() => {
                setIsOpen(false);
            }, 4000);
        }

        return () => {
            if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        };
    }, [cart.length]);

    return (
        <div ref={containerRef} className="relative shrink-0">
            <button
                type="button"
                onClick={toggleDropdown}
                className="tap-target relative inline-flex items-center justify-center rounded-lg p-2.5 text-gray-700 transition hover:bg-gray-100 hover:text-blue-600 active:scale-95"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <ShoppingCart size={22} />
                {cart.length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cart.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Cart"
                    className="fixed left-2 right-2 top-[calc(4.25rem+var(--maintenance-banner-offset,0px))] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem] sm:max-w-[calc(100vw-1rem)] bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[80vh] sm:max-h-none"
                >
                    <div className="flex items-center justify-between px-4 sm:px-4.5 py-3 sm:py-3.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
                        <h3 className="text-sm font-extrabold tracking-wide text-gray-900">Shopping Cart ({cart.length})</h3>
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
                            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4.5 py-1 sm:py-2 divide-y divide-gray-100">
                                {cart.map((item) => (
                                    <div key={item.product.id} className="flex gap-3 py-3.5 sm:py-4 items-start transition-all duration-300">
                                        <div className="relative w-14 h-14 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
                                            <Image
                                                src={resolveBackendImageSrc(item.product.imgOne, "/images/fallback-image.png")}
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
                                                    <span className="w-6 text-center text-xs font-extrabold text-gray-800">{item.quantity}</span>
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
                            </div>
                            <div className="px-4 sm:px-4.5 py-3.5 sm:py-4 border-t border-gray-100 bg-gray-50/40 shrink-0">
                                <div className="flex justify-between items-center font-bold text-gray-900">
                                    <span className="text-sm">Total Amount</span>
                                    <span className="text-base text-blue-900">₹{cartTotal}</span>
                                </div>
                                <Link
                                    onClick={() => setIsOpen(false)}
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
