"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Product } from "@/const/productData";
import {
  AvailableDiscountOffer,
  CartDiscountQuote,
  emptyCartDiscountQuote,
  fetchCartDiscountQuote,
} from "@/lib/cartDiscounts";

export interface CartItem {
    product: Product;
    quantity: number;
}

type AddToCartMode = "add" | "set";

interface AddToCartOptions {
    mode?: AddToCartMode;
    openCart?: boolean;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number, options?: AddToCartOptions) => void;
    buyNow: (product: Product, quantity?: number) => void;
    openCart: () => void;
    cartOpenRequestId: number;
    removeFromCart: (productId: number) => void;
    clearCart: () => void;
    cartSubtotal: number;
    cartDiscount: number;
    cartTotal: number;
    discountLoading: boolean;
    availableOffers: AvailableDiscountOffer[];
    refreshDiscountQuote: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { data: session, status } = useSession();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isDbLoaded, setIsDbLoaded] = useState(false);
    const [discountQuote, setDiscountQuote] = useState<CartDiscountQuote | null>(null);
    const [discountLoading, setDiscountLoading] = useState(false);
    const [cartOpenRequestId, setCartOpenRequestId] = useState(0);
    const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;

    const openCart = useCallback(() => {
        setCartOpenRequestId((id) => id + 1);
    }, []);

    const syncCartItemToBackend = useCallback(
        (product: Product, quantity: number, mode: AddToCartMode) => {
            if (status !== "authenticated" || !accessToken) return;

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            };
            const body = JSON.stringify({
                jwt: accessToken,
                product: { id: product.id },
                productId: product.id,
                quantity,
            });

            if (mode === "set") {
                fetch(`/api/carts?productId=${encodeURIComponent(String(product.id))}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                    .catch((e) => console.error("Failed to reset cart item (backend)", e))
                    .finally(() => {
                        if (quantity > 0) {
                            fetch("/api/carts", { method: "POST", headers, body }).catch((e) =>
                                console.error("Failed to set cart item (backend)", e)
                            );
                        }
                    });
                return;
            }

            fetch("/api/carts", { method: "POST", headers, body }).catch((e) =>
                console.error("Failed to add to cart (backend)", e)
            );
        },
        [status, accessToken]
    );

    useEffect(() => {
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
    }, []);

    useEffect(() => {
        if (status !== "unauthenticated") return;
        setCart([]);
        setIsDbLoaded(false);
        setDiscountQuote(null);
        try {
            localStorage.removeItem("cart");
        } catch {
            // ignore
        }
    }, [status]);

    useEffect(() => {
        if (status === 'authenticated' && session?.user && !isDbLoaded) {
            fetch(`/api/backend/carts`, {
                method: "GET",
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                cache: "no-store",
            })
                .then(res => res.json())
                .then(data => {
                    if (data?.success && data?.data?.items?.length > 0) {
                        const dbCart = data.data.items.map((it: { productId: number; title: string; price: string | number; slug: string; imgOne: string; quantity: number }) => ({
                            product: {
                                id: it.productId,
                                title: it.title || `Product #${it.productId}`,
                                price: parseFloat(String(it.price || 0)),
                                slug: it.slug,
                                imgOne: it.imgOne
                            },
                            quantity: it.quantity
                        }));
                        setCart(dbCart);
                    }
                    setIsDbLoaded(true);
                })
                .catch(err => {
                    console.error("Failed to fetch user cart", err);
                    setIsDbLoaded(true);
                });
        }
    }, [status, session, isDbLoaded, accessToken]);

    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cart));
    }, [cart]);

    const loadDiscountQuote = useCallback(async (items: CartItem[]) => {
        if (!items.length) {
            setDiscountQuote(emptyCartDiscountQuote([]));
            setDiscountLoading(false);
            return;
        }
        setDiscountLoading(true);
        const payload = items.map((item) => ({
            productId: Number(item.product.id),
            quantity: item.quantity,
            price: Number(item.product.price),
        }));
        const quote = await fetchCartDiscountQuote(payload);
        setDiscountQuote(quote || emptyCartDiscountQuote(payload));
        setDiscountLoading(false);
    }, []);

    const refreshDiscountQuote = useCallback(() => {
        void loadDiscountQuote(cart);
    }, [cart, loadDiscountQuote]);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            if (!cancelled) void loadDiscountQuote(cart);
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [cart, loadDiscountQuote]);

    const addToCart = useCallback(
        (product: Product, quantity: number = 1, options?: AddToCartOptions) => {
            const mode = options?.mode ?? "add";

            setCart((prev) => {
                const existing = prev.find((item) => item.product.id === product.id);
                if (existing) {
                    const nextQuantity = mode === "set" ? quantity : existing.quantity + quantity;
                    if (nextQuantity <= 0) {
                        return prev.filter((item) => item.product.id !== product.id);
                    }
                    return prev.map((item) =>
                        item.product.id === product.id ? { ...item, quantity: nextQuantity } : item
                    );
                }
                if (quantity <= 0) return prev;
                return [...prev, { product, quantity }];
            });

            syncCartItemToBackend(product, quantity, mode);

            if (options?.openCart) {
                openCart();
            }
        },
        [openCart, syncCartItemToBackend]
    );

    const buyNow = useCallback(
        (product: Product, quantity: number = 1) => {
            addToCart(product, quantity, { mode: "set", openCart: true });
        },
        [addToCart]
    );

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));

        if (status === "authenticated" && accessToken) {
            fetch(`/api/carts?productId=${encodeURIComponent(String(productId))}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
            }).catch((e) => console.error("Failed to remove from cart (backend)", e));
        }
    };

    const clearCart = () => setCart([]);

    const totals = useMemo(() => {
        const fallbackItems = cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: Number(item.product.price),
        }));
        const quote = discountQuote || emptyCartDiscountQuote(fallbackItems);
        return {
            cartSubtotal: quote.subtotal,
            cartDiscount: quote.discountTotal,
            cartTotal: quote.total,
            availableOffers: quote.availableOffers ?? [],
        };
    }, [cart, discountQuote]);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            buyNow,
            openCart,
            cartOpenRequestId,
            removeFromCart,
            clearCart,
            cartSubtotal: totals.cartSubtotal,
            cartDiscount: totals.cartDiscount,
            cartTotal: totals.cartTotal,
            discountLoading,
            availableOffers: totals.availableOffers,
            refreshDiscountQuote,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
