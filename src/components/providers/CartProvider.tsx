"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Product } from "@/const/productData";
import {
  CartDiscountQuote,
  emptyCartDiscountQuote,
  fetchCartDiscountQuote,
} from "@/lib/cartDiscounts";

export interface CartItem {
    product: Product;
    quantity: number;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: number) => void;
    clearCart: () => void;
    cartSubtotal: number;
    cartDiscount: number;
    cartTotal: number;
    discountLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { data: session, status } = useSession();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isDbLoaded, setIsDbLoaded] = useState(false);
    const [discountQuote, setDiscountQuote] = useState<CartDiscountQuote | null>(null);
    const [discountLoading, setDiscountLoading] = useState(false);
    const accessToken = (session as unknown as { accessToken?: string | null })?.accessToken || null;

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

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            if (!cart.length) {
                setDiscountQuote(emptyCartDiscountQuote([]));
                return;
            }
            setDiscountLoading(true);
            const items = cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                price: Number(item.product.price),
            }));
            const quote = await fetchCartDiscountQuote(items);
            if (!cancelled) {
                setDiscountQuote(quote || emptyCartDiscountQuote(items));
                setDiscountLoading(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [cart]);

    const addToCart = (product: Product, quantity: number = 1) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { product, quantity }];
        });

        if (status === "authenticated" && accessToken) {
            fetch("/api/carts", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                    jwt: accessToken,
                    product: { id: product.id },
                    productId: product.id,
                    quantity,
                }),
            }).catch((e) => console.error("Failed to add to cart (backend)", e));
        }
    };

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
        };
    }, [cart, discountQuote]);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            clearCart,
            cartSubtotal: totals.cartSubtotal,
            cartDiscount: totals.cartDiscount,
            cartTotal: totals.cartTotal,
            discountLoading,
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
