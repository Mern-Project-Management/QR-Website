"use client";

import { use, useState, useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Star, Truck, Package, ShieldCheck } from "lucide-react";
import ProductGallery from "@/components/ui/ProductGallery";
import { useCart } from "@/components/providers/CartProvider";
import { notFound } from "next/navigation";
import QuantityDropdown from "@/components/ui/QuantityDropdown";
import Accordion from "@/components/ui/Accordion";
import { cn } from "@/lib/cn";
import type { Product } from "@/const/productData";
import { PRODUCT_LONG_DESC_CSS } from "./productLongDescStyles";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";

function formatInr(value: number | string): string {
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(n)) return String(value);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

export default function SingleProductPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [cartMessage, setCartMessage] = useState<string | null>(null);

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`/api/backend/products/${slug}`);
                if (!res.ok) throw new Error("Product not found");
                const data = (await res.json()) as Product;
                setProduct(data);
            } catch (err) {
                console.error(err);
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [slug]);

    useEffect(() => {
        if (!cartMessage) return;
        const t = window.setTimeout(() => setCartMessage(null), 4000);
        return () => window.clearTimeout(t);
    }, [cartMessage]);

    const longDescHtml = useMemo(() => {
        if (!product?.longDesc) return null;
        return product.longDesc
            .replace(/<table/g, '<div class="table-responsive"><table')
            .replace(/<\/table>/g, "</table></div>");
    }, [product?.longDesc]);

    const infoAccordionItems = useMemo(() => {
        if (!product) return [];
        const items = [
            {
                question: "Delivery & shipping",
                answer: (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-900">
                                <Truck className="h-5 w-5" aria-hidden />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Fast dispatch</p>
                                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
                                    Most orders ship within 24–48 hours after payment confirmation.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 border-t border-slate-100 pt-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-900">
                                <Package className="h-5 w-5" aria-hidden />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Free shipping</p>
                                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
                                    Complimentary delivery on orders above ₹799. Tracking shared by SMS and email.
                                </p>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                question: "Payments & security",
                answer: (
                    <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-900">
                            <ShieldCheck className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900">Secure checkout</p>
                            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
                                Payments are processed over encrypted connections. GST invoices are provided for eligible
                                orders. Returns follow our store policy where applicable.
                            </p>
                        </div>
                    </div>
                ),
            },
        ];
        if (longDescHtml) {
            items.push({
                question: "Product details & specifications",
                answer: (
                    <div
                        className="product-longdesc max-w-none"
                        dangerouslySetInnerHTML={{ __html: longDescHtml }}
                    />
                ),
            });
        }
        return items;
    }, [product, longDescHtml]);

    if (loading) {
        return (
            <div className="min-h-[60vh] px-4 pt-28 pb-16 font-dm">
                <div className="mx-auto max-w-screen-xl animate-pulse">
                    <div className="mb-8 h-4 w-48 rounded bg-slate-200" />
                    <div className="grid gap-10 lg:grid-cols-2">
                        <div className="aspect-[4/5] rounded-2xl bg-slate-200" />
                        <div className="space-y-4">
                            <div className="h-10 w-4/5 rounded-lg bg-slate-200" />
                            <div className="h-4 w-32 rounded bg-slate-200" />
                            <div className="h-8 w-40 rounded bg-slate-200" />
                            <div className="h-24 rounded-xl bg-slate-200" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return notFound();
    }

    const inStock = product.availability !== "Out of Stock";
    const rating = Math.min(5, Math.max(0, Number(product.review ?? 5) || 5));
    const filledStars = Math.round(rating);

    const galleryImages = ([
        resolveBackendImageSrc(product.imgOne, "/images/fallback-image.png"),
        resolveBackendImageSrc(product.imgTwo, resolveBackendImageSrc(product.imgOne, "/images/fallback-image.png")),
    ] as Array<string | import("next/image").StaticImageData>).filter(Boolean);

    const handleAddToCart = () => {
        if (!inStock) return;
        addToCart(product, quantity);
        setCartMessage(`Added ${quantity} × ${product.title} to your cart.`);
    };

    const handleBuyNow = () => {
        if (!inStock) return;
        flushSync(() => {
            addToCart(product, quantity);
        });
    };

    return (
        <div className="relative isolate font-dm">
            <section className="border-b border-slate-200/70 bg-light-blue-banner pt-24 sm:pt-28 lg:pt-32 pb-8 sm:pb-10">
                <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
                    <Breadcrumb
                        items={[
                            { label: "Home", href: "/" },
                            { label: "Shop", href: "/shop" },
                            { label: product.title },
                        ]}
                    />
                    <p className="mt-3 max-w-2xl text-pretty text-sm font-medium text-slate-600 sm:text-base">
                        {product.subtitle || "Complete your purchase securely. Fast dispatch on in-stock items."}
                    </p>
                </div>
            </section>

            <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3 pb-16 pt-8 sm:pt-10 lg:pb-24 lg:pt-12">
                <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-14">
                    <div className="w-full lg:sticky lg:top-28">
                        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-4">
                            {galleryImages.length > 0 ? (
                                <ProductGallery images={galleryImages} />
                            ) : (
                                <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                                    No image
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex w-full flex-col">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <h1 className="text-pretty text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                                {product.title}
                            </h1>
                            {product.badge ? (
                                <span className="shrink-0 rounded-full bg-blue-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                    {product.badge}
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="flex items-center gap-0.5 text-amber-500" aria-label={`Rating ${rating} out of 5`}>
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        className={cn(i < filledStars ? "fill-amber-400 text-amber-400" : "text-slate-200")}
                                        strokeWidth={i < filledStars ? 0 : 1.5}
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-medium text-slate-600">
                                {rating.toFixed(1)} / 5
                            </span>
                            <span className="hidden sm:inline text-slate-300" aria-hidden>
                                ·
                            </span>
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1.5 text-sm font-semibold",
                                    inStock ? "text-emerald-700" : "text-red-600"
                                )}
                            >
                                <span
                                    className={cn("h-2 w-2 rounded-full", inStock ? "bg-emerald-500" : "bg-red-500")}
                                    aria-hidden
                                />
                                {product.availability}
                            </span>
                        </div>

                        <div className="mt-5 flex flex-wrap items-baseline gap-2 sm:gap-3">
                            <span className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                                {formatInr(product.price)}
                            </span>
                            {product.oldPrice != null && String(product.oldPrice) !== "" ? (
                                <span className="text-lg font-medium text-slate-400 line-through">
                                    {formatInr(product.oldPrice)}
                                </span>
                            ) : null}
                            {product.discount ? (
                                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-800">
                                    {product.discount}
                                </span>
                            ) : null}
                        </div>

                        {product.shortDesc ? (
                            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600">
                                {product.shortDesc}
                            </p>
                        ) : null}

                        {product.colors && product.colors.length > 0 ? (
                            <div className="mt-8">
                                <span className="mb-3 block text-sm font-semibold uppercase tracking-wide text-slate-800">
                                    Color
                                </span>
                                <ul className="flex flex-wrap gap-3">
                                    {product.colors.map((color: string, idx: number) => (
                                        <li key={idx}>
                                            <input
                                                type="radio"
                                                id={`color-${idx}`}
                                                name="color"
                                                value={color}
                                                className="peer sr-only"
                                                defaultChecked={idx === 0}
                                            />
                                            <label
                                                htmlFor={`color-${idx}`}
                                                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-transparent bg-white shadow-sm ring-1 ring-slate-200 transition peer-checked:ring-2 peer-checked:ring-blue-900 peer-checked:ring-offset-2"
                                            >
                                                <span className={cn("h-8 w-8 rounded-full border border-slate-200/80", color)} />
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        <div className="mt-8">
                            <span className="mb-3 block text-sm font-semibold uppercase tracking-wide text-slate-800">
                                Quantity
                            </span>
                            {cartMessage ? (
                                <p
                                    className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
                                    role="status"
                                >
                                    {cartMessage}
                                </p>
                            ) : null}
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-stretch">
                                <div className="shrink-0">
                                    <QuantityDropdown quantity={quantity} setQuantity={setQuantity} />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={handleAddToCart}
                                        disabled={!inStock}
                                        className={cn(
                                            "min-h-[44px] flex-1 rounded-lg border-2 border-blue-900 px-5 py-2.5 text-center text-base font-semibold transition",
                                            inStock
                                                ? "text-blue-900 hover:bg-blue-900 hover:text-white"
                                                : "cursor-not-allowed border-slate-200 text-slate-400"
                                        )}
                                    >
                                        Add to cart
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBuyNow}
                                        disabled={!inStock}
                                        className={cn(
                                            "min-h-[44px] flex-1 rounded-lg px-5 py-2.5 text-center text-base font-semibold text-white transition",
                                            inStock
                                                ? "bg-blue-900 hover:bg-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
                                                : "cursor-not-allowed bg-slate-300"
                                        )}
                                    >
                                        Buy now
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <section className="mt-12 sm:mt-14 lg:mt-16" aria-labelledby="product-info-heading">
                    {longDescHtml ? <style>{PRODUCT_LONG_DESC_CSS}</style> : null}
                    <h2 id="product-info-heading" className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                        Before you buy
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                        Shipping, security, and full specifications—expand a section to read more.
                    </p>
                    <div className="mt-5 rounded-2xl border border-slate-200/90 bg-white px-1 shadow-sm ring-1 ring-slate-900/[0.04] sm:px-2">
                        <Accordion
                            items={infoAccordionItems}
                            variant="line"
                            borderColor="border-slate-200"
                            textColor="text-slate-900"
                            defaultOpenIndex={longDescHtml ? 2 : 0}
                            className="px-3 sm:px-5"
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
