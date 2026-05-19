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
                    className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 overflow-hidden"
                >
                    <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-gray-100 bg-gray-50/50">
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
                        <div className="px-5 py-8 text-center">
                            <p className="text-sm font-medium text-gray-600">Your cart is empty.</p>
                            <p className="mt-1 text-xs text-gray-400">Add items to see them here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="max-h-80 overflow-y-auto px-4.5 py-2 divide-y divide-gray-100">
                                {cart.map((item) => (
                                    <div key={item.product.id} className="flex gap-3.5 py-4 items-center transition-all duration-300">
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
                                            <Image
                                                src={resolveBackendImageSrc(item.product.imgOne, "/images/fallback-image.png")}
                                                alt={item.product.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{item.product.title}</p>
                                            <p className="text-xs font-semibold text-blue-900 mt-1">₹{item.product.price}</p>
                                        </div>
                                        
                                        {/* Quantity control */}
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
                                                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition active:scale-95 shrink-0"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus size={11} strokeWidth={2.5} />
                                            </button>
                                            <span className="w-5 text-center text-xs font-extrabold text-gray-800">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => addToCart(item.product, 1)}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition active:scale-95 shrink-0"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus size={11} strokeWidth={2.5} />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition shrink-0 active:scale-95"
                                            aria-label={`Remove ${item.product.title} from cart`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4.5 py-4 border-t border-gray-100 bg-gray-50/20">
                                <div className="flex justify-between items-center font-bold text-gray-900">
                                    <span className="text-sm">Total Amount</span>
                                    <span className="text-base text-blue-900">₹{cartTotal}</span>
                                </div>
                                <Link
                                    onClick={() => setIsOpen(false)}
                                    href="/checkout"
                                    className="mt-3.5 block text-center w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 transition-all active:scale-[0.98]"
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
