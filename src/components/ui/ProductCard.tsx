// app/shop/components/ProductCard.tsx
"use client";

import React from "react";
import { Product } from "@/const/productData";
import { Star } from "lucide-react";
import Button from "./Button";
import Image from "next/image";
import { useCart } from "@/components/providers/CartProvider";
import { useRouter } from "next/navigation";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";

function formatInr(value: number | string | undefined) {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value ?? "");
    return n.toLocaleString("en-IN");
}

interface ProductCardProps {
    product: Product;
    variant?: "compact" | "extended";
}

const ProductCard: React.FC<ProductCardProps> = ({ product, variant = "compact" }) => {
    const { addToCart } = useCart();
    const quantity = 1;
    const router = useRouter();
    const inStock = product.availability !== "Out of Stock";

    // Use the actual backend slug if available, else fallback to formatted title
    const productSlug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-');

    const handleAddToCart = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!inStock) return;
        addToCart(product, quantity, { openCart: true });
    };

    const handleCardClick = () => {
        router.push(`/shop/${productSlug}`);
    };

    if (variant === "extended") {
        return (
            <div
                className="card-surface group flex cursor-pointer flex-col gap-3 rounded-2xl border border-gray-100/90 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50/80 sm:flex-row md:gap-0 md:space-x-7"
                onClick={handleCardClick}
            >
                {/* product image */}
                <div className="relative w-72 overflow-hidden rounded-xl bg-productcard-gradient shrink-0">
                    {product.discount && (
                        <div className="absolute top-3 left-3 z-10 bg-green-600 text-white text-xs font-medium py-1 px-2 rounded-md">
                            {product.discount}
                        </div>
                    )}
                    <div className="group block relative">
                        <div className="img-one max-h-80 text-center justify-center object-center">
                            <Image
                                src={resolveBackendImageSrc(product.imgOne, "/images/fallback-image.png")}
                                alt={product.title}
                                className="rounded-xl overflow-hidden object-contain transition-opacity duration-300 group-hover:opacity-0"
                                width={290}
                                height={335}
                            />
                        </div>
                        <div className="img-two max-h-80 text-center object-center justify-center absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Image
                                src={resolveBackendImageSrc(product.imgTwo, resolveBackendImageSrc(product.imgOne, "/images/fallback-image.png") as string)}
                                alt={product.title}
                                className="rounded-xl overflow-hidden"
                                width={290}
                                height={435}
                            />
                        </div>
                    </div>
                </div>

                {/* product content */}
                <div className="mb-2 flex-1">
                    <span className="block text-2xl font-semibold text-gray-900 mb-0 pt-2 group-hover:text-blue-600 transition-colors duration-300">
                        {product.title}
                    </span>
                    <p className="text-sm font-medium text-gray-500 mt-[2px] mb-2">{product.subtitle}</p>
                    <p className="text-lg font-semibold text-gray-800 pt-1">
                        ₹{formatInr(product.price)}
                        {product.oldPrice != null && product.oldPrice !== "" && (
                            <span className="line-through text-sm text-gray-500 font-medium ml-2">
                                ₹{formatInr(product.oldPrice)}
                            </span>
                        )}
                    </p>

                    {/* review */}
                    {product.review && (
                        <div className="flex items-center text-blue-500 mb-3 mt-2">
                            <Star fill="blue" size={16} strokeWidth={0} />
                            <span className="text-sm text-gray-600 font-medium leading-6 ml-1 inline-block">
                                {product.review} Reviews
                            </span>
                        </div>
                    )}

                    {/* short description */}
                    {product.shortDesc && (
                        <p className="font-medium text-base text-gray-700 fw-500">{product.shortDesc}</p>
                    )}

                    {/* action buttons */}
                    <div className="flex flex-row gap-2 mt-5">
                        <Button
                            label={inStock ? "Add to Cart" : "Out of Stock"}
                            icon=""
                            className={`cursor-pointer ${!inStock ? "opacity-60 pointer-events-none" : ""}`}
                            bgColor="bg-blue-900"
                            textColor="text-white"
                            onClick={handleAddToCart}
                        />
                        <Button
                            label="Read More"
                            icon=""
                            bgColor="bg-gray-100"
                            className="border border-blue-900"
                            textColor="text-gray-900"
                            href={`/shop/${productSlug}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // --- Compact layout (default) ---
    return (
        <div
            className="card-surface group flex cursor-pointer flex-col gap-2 rounded-2xl border border-gray-100/90 bg-white p-3 transition-all duration-300 ease-out hover:-translate-y-1"
            onClick={handleCardClick}
        >
            {/* product image */}
            <div className="relative overflow-hidden rounded-xl bg-productcard-gradient min-h-[180px] flex items-center justify-center">
                {product.discount && (
                    <div className="absolute top-3 left-3 z-10 bg-green-600 text-white text-[11px] font-medium py-1 px-2 rounded-md">
                        {product.discount}
                    </div>
                )}
                {product.badge && (
                    <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-[11px] font-medium py-1 px-2 rounded-md">
                        {product.badge}
                    </div>
                )}
                <div className="group block relative">
                    <div className="img-one">
                        <Image
                            src={resolveBackendImageSrc(product.imgOne, "/images/fallback-image.png")}
                            alt={product.title}
                            className="rounded-xl overflow-hidden transition-opacity duration-300 group-hover:opacity-0"
                            width={290}
                            height={435}
                        />
                    </div>
                    <div className="img-two absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Image
                            src={resolveBackendImageSrc(product.imgTwo, resolveBackendImageSrc(product.imgOne, "/images/fallback-image.png") as string)}
                            alt={product.title}
                            className="rounded-xl overflow-hidden"
                            width={290}
                            height={435}
                        />
                    </div>
                </div>
            </div>

            {/* product content */}
            <div className="mb-1">
                <span className="block text-[17px] leading-6 font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2 min-h-[3rem]">
                    {product.title}
                </span>
                <p className="text-sm font-medium text-gray-500 mt-[2px] mb-2 line-clamp-1">{product.subtitle}</p>
                <p className="text-lg font-semibold text-gray-800 pt-1">
                    ₹{formatInr(product.price)}
                    {product.oldPrice != null && product.oldPrice !== "" && (
                        <span className="line-through text-sm text-gray-500 font-medium ml-2">
                            ₹{formatInr(product.oldPrice)}
                        </span>
                    )}
                </p>
                {product.review && (
                    <div className="flex items-center text-blue-500 mb-1 mt-1">
                        <Star fill="blue" size={15} strokeWidth={0} />
                        <span className="text-xs text-gray-600 font-medium leading-6 ml-1 inline-block">
                            {product.review}
                        </span>
                    </div>
                )}
                <div className="flex flex-row gap-2 mt-3">
                    <Button
                        label={inStock ? "Add to Cart" : "Out of Stock"}
                        padding="px-3 py-2"
                        icon=""
                        bgColor="bg-blue-900"
                        textColor="text-white"
                        className={`flex-1 text-sm ${!inStock ? "opacity-60 pointer-events-none" : ""}`}
                        onClick={handleAddToCart}
                    />
                    <Button
                        label="View"
                        padding="px-3 py-2"
                        icon=""
                        bgColor="bg-gray-100"
                        className="flex-1 border border-blue-900 text-sm"
                        textColor="text-gray-900"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/shop/${productSlug}`);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
