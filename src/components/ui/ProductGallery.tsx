"use client";

import React, { useEffect, useId, useState } from "react";
import "@splidejs/react-splide/css";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";

interface ProductGalleryProps {
    images: Array<string | StaticImageData>;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({ images }) => {
    const reactId = useId().replace(/:/g, "");
    const mainId = `main-carousel-${reactId}`;
    const thumbId = `thumbnail-carousel-${reactId}`;
    const [layout, setLayout] = useState<"vertical" | "horizontal">("horizontal");

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        const update = () => setLayout(mq.matches ? "vertical" : "horizontal");
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let mainSplide: { destroy: () => void } | null = null;
        let thumbsSplide: { destroy: () => void } | null = null;

        const initSplide = async () => {
            const SplideCore = (await import("@splidejs/splide")).default;
            if (cancelled) return;

            const mainEl = document.getElementById(mainId);
            const thumbEl = document.getElementById(thumbId);
            if (!mainEl || !thumbEl) return;

            const main = new SplideCore(`#${mainId}`, {
                type: "fade",
                pagination: false,
                arrows: false,
                rewind: true,
                accessibility: false,
            });

            const thumbs = new SplideCore(`#${thumbId}`, {
                fixedWidth: layout === "vertical" ? 100 : 72,
                fixedHeight: layout === "vertical" ? 114 : 72,
                gap: 10,
                rewind: true,
                pagination: false,
                isNavigation: true,
                direction: layout === "vertical" ? "ttb" : "ltr",
                height: layout === "vertical" ? "480px" : undefined,
                arrows: false,
                accessibility: false,
                breakpoints: layout === "horizontal"
                    ? {
                          640: { fixedWidth: 64, fixedHeight: 64, gap: 8 },
                      }
                    : undefined,
            });

            main.sync(thumbs);
            main.mount();
            thumbs.mount();
            mainSplide = main;
            thumbsSplide = thumbs;
        };

        void initSplide();

        return () => {
            cancelled = true;
            mainSplide?.destroy();
            thumbsSplide?.destroy();
        };
    }, [layout, images, mainId, thumbId]);

    return (
        <>
            <style>{`
                #${thumbId} .splide__slide.is-active {
                    border: 2px solid #1d398f !important;
                    border-radius: 0.5rem;
                }
                #${thumbId} .splide__slide {
                    border: 2px solid transparent !important;
                    border-radius: 0.5rem;
                    transition: border-color 0.2s ease;
                }
            `}</style>

            {layout === "vertical" ? (
                <div className="flex w-full gap-3">
                    <div className="relative hidden shrink-0 lg:block">
                        <div className="splide slider-no-arrows slider-no-dots" id={thumbId}>
                            <div className="splide__track">
                                <ul className="splide__list">
                                    {images.map((src, i) => (
                                        <li key={i} className="splide__slide mb-2 overflow-hidden rounded-lg bg-gray-100">
                                            <div className="relative h-[114px] w-[100px]">
                                                <Image
                                                    src={resolveBackendImageSrc(typeof src === "string" ? src : null, src)}
                                                    alt={`thumb-${i}`}
                                                    fill
                                                    className="rounded-lg object-cover"
                                                    sizes="100px"
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="main-slider relative overflow-hidden">
                            <div className="splide slider-no-arrows slider-no-dots" id={mainId}>
                                <div className="splide__track">
                                    <ul className="splide__list">
                                        {images.map((src, i) => (
                                            <li key={i} className="splide__slide overflow-hidden rounded-lg bg-gray-100 text-center">
                                                <div className="relative aspect-[4/5] w-full max-h-[min(72vh,560px)]">
                                                    <Image
                                                        src={resolveBackendImageSrc(typeof src === "string" ? src : null, src)}
                                                        alt={`product-${i}`}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 1024px) 100vw, 50vw"
                                                        priority={i === 0}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative w-full">
                    <div className="main-slider relative overflow-hidden">
                        <div className="splide slider-no-arrows slider-no-dots" id={mainId}>
                            <div className="splide__track">
                                <ul className="splide__list">
                                    {images.map((src, i) => (
                                        <li key={i} className="splide__slide overflow-hidden rounded-lg bg-gray-100">
                                            <div className="relative aspect-[4/5] w-full max-h-[min(68vh,440px)] sm:max-h-[min(72vh,520px)]">
                                                <Image
                                                    src={resolveBackendImageSrc(typeof src === "string" ? src : null, src)}
                                                    alt={`product-${i}`}
                                                    fill
                                                    className="object-cover rounded-lg"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    priority={i === 0}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="main-thumb z-10 mt-3 w-full px-1 sm:px-0">
                        <div className="splide slider-no-arrows slider-no-dots w-full" id={thumbId}>
                            <div className="splide__track w-full">
                                <ul className="splide__list">
                                    {images.map((src, i) => (
                                        <li key={i} className="splide__slide rounded-lg bg-gray-100 p-0">
                                            <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px]">
                                                <Image
                                                    src={resolveBackendImageSrc(typeof src === "string" ? src : null, src)}
                                                    alt={`thumb-${i}`}
                                                    fill
                                                    className="rounded-lg object-cover"
                                                    sizes="72px"
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductGallery;
