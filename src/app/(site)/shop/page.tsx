"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import ProductCard from "@/components/ui/ProductCard";
import { Product as BaseProduct } from "@/const/productData";
import { fetchProductsEnriched } from "@/lib/fetchProductsClient";
import { PAGE_TOP_PADDING } from "@/lib/siteLayout";

interface Product extends BaseProduct {
    categoryNames?: string[];
}

function ShopContent() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selected, setSelected] = useState("popular");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [priceLimit, setPriceLimit] = useState(1000);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [draftCategories, setDraftCategories] = useState<string[]>([]);
    const [draftPriceLimit, setDraftPriceLimit] = useState(1000);

    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await fetchProductsEnriched();
                setProducts(data);

                const uniqueCategories = Array.from(
                    new Set(data.flatMap((p: Product) => p.categoryNames || p.categories || []))
                ) as string[];
                setCategories(uniqueCategories.filter(Boolean));

                const maxPrice = data.length ? Math.max(...data.map((p: Product) => Number(p.price) || 0)) : 1000;
                setPriceLimit(maxPrice > 0 ? maxPrice : 1000);

                // Read category from URL and auto-select it
                const categoryFromUrl = searchParams.get("category");
                if (categoryFromUrl) {
                    setSelectedCategories([categoryFromUrl]);
                }
            } catch (err) {
                console.error("Error fetching products:", err);
            }
        };
        fetchProducts();
    }, [searchParams]);

    const handleCategoryChange = (cat: string) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const handleDraftCategoryChange = (cat: string) => {
        setDraftCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    let displayedProducts = [...products];
    if (selectedCategories.length > 0) {
        displayedProducts = displayedProducts.filter((p) =>
            (p.categoryNames || p.categories || []).some((c: string) => selectedCategories.includes(c))
        );
    }

    displayedProducts = displayedProducts.filter((p) => Number(p.price) <= priceLimit);

    if (selected === "low-high") {
        displayedProducts.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (selected === "high-low") {
        displayedProducts.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (selected === "newest") {
        displayedProducts.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (selected === "highest-rated") {
        displayedProducts.sort((a, b) => Number(b.review || 0) - Number(a.review || 0));
    }

    const maxAvailablePrice = products.length ? Math.max(...products.map((p) => Number(p.price) || 0)) : 1000;
    const sortOptions = [
        { value: "popular", label: "Most Popular" },
        { value: "low-high", label: "Price: Low to High" },
        { value: "high-low", label: "Price: High to Low" },
        { value: "newest", label: "Newest First" },
        { value: "highest-rated", label: "Highest Rated" },
    ];
    const activeFilterCount = selectedCategories.length + (priceLimit < maxAvailablePrice ? 1 : 0);

    const openMobileFilters = () => {
        setDraftCategories(selectedCategories);
        setDraftPriceLimit(priceLimit);
        setIsMobileFiltersOpen(true);
    };

    const applyMobileFilters = () => {
        setSelectedCategories(draftCategories);
        setPriceLimit(draftPriceLimit);
        setIsMobileFiltersOpen(false);
    };

    const clearMobileFilters = () => {
        setDraftCategories([]);
        setDraftPriceLimit(maxAvailablePrice);
    };

    return (
        <>
            <section className={`border-b border-slate-200/70 bg-light-blue-banner pb-4 sm:pb-6 ${PAGE_TOP_PADDING}`}>
                <div className="max-w-screen mx-auto font-dm">
                    <PageTitle title="Shop" subtitle="">
                        <div className="flex justify-center text-center">
                            <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop" }]} variant="light" />
                        </div>
                    </PageTitle>
                </div>
            </section>
            <div className="shop-wrap font-dm pt-6 lg:pt-8">
                <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3 lg:pb-24 pb-12">
                    <div className="grid lg:grid-cols-4 grid-cols-1 lg:gap-8 gap-6 relative">
                        {/* Filters */}
                        <div className="w-full lg:sticky lg:top-24 h-fit hidden lg:block">
                            <h2 className="text-gray-900 text-2xl font-semibold mb-4">Filters</h2>

                            {/* Categories */}
                            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Categories</h3>
                                {categories.map((cat, i) => (
                                    <div key={i} className="flex justify-between items-center mb-2 last:mb-0">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`category-${i}`}
                                                className="accent-blue-500"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={() => handleCategoryChange(cat)}
                                            />
                                            <label
                                                htmlFor={`category-${i}`}
                                                className="text-base text-gray-900 font-medium cursor-pointer"
                                            >
                                                {cat}
                                            </label>
                                        </div>
                                        <span className="text-sm text-gray-600 font-medium">
                                            {products.filter((p) => (p.categoryNames || p.categories || []).includes(cat)).length}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Price Range</h3>
                                <input
                                    type="range"
                                    min={0}
                                    max={maxAvailablePrice || 1000}
                                    value={priceLimit}
                                    onChange={(e) => setPriceLimit(Number(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
                                    <span>₹0</span>
                                    <span className="font-semibold">₹{priceLimit}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Sort By</h3>
                                <div className="space-y-2 text-sm">
                                    {sortOptions.map((item) => (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => setSelected(item.value)}
                                            className={`w-full text-left px-3 py-2 rounded-md transition ${selected === item.value
                                                ? "bg-blue-50 text-brand-primary font-medium"
                                                : "text-gray-700 hover:bg-gray-50"
                                                }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Product Listing */}
                        <div className="col-span-3 lg:col-span-3">
                            {/* Mobile filter and sort controls */}
                            <div className="lg:hidden flex items-center gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={openMobileFilters}
                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
                                >
                                    Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
                                </button>
                                <select
                                    value={selected}
                                    onChange={(e) => setSelected(e.target.value)}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                >
                                    {sortOptions.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sorting */}
                            <div className="flex flex-row justify-between items-center pb-3 border-b border-gray-200 mb-5">
                                <p className="m-0 text-sm md:text-base font-medium text-gray-700">
                                    Showing {displayedProducts.length} products
                                </p>
                                <span className="text-sm text-gray-500 hidden lg:block">Layout: Grid</span>
                            </div>

                            {/* Product Grid */}
                            {products.length === 0 ? (
                                <div className="py-10 text-center text-gray-500 font-medium">
                                    Loading products...
                                </div>
                            ) : displayedProducts.length === 0 ? (
                                <div className="py-10 text-center text-gray-500 font-medium">
                                    No products match your criteria.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 relative">
                                    {displayedProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} variant="compact" />
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {isMobileFiltersOpen && (
                <div className="fixed inset-0 z-[80] lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsMobileFiltersOpen(false)}
                    />
                    <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white shadow-xl flex flex-col">
                        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                            <button
                                type="button"
                                onClick={() => setIsMobileFiltersOpen(false)}
                                className="text-sm font-medium text-gray-600"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-4">
                            <details open className="rounded-lg border border-gray-200 p-3">
                                <summary className="font-semibold text-gray-900 cursor-pointer">Categories</summary>
                                <div className="mt-3 space-y-2">
                                    {categories.map((cat, i) => (
                                        <label key={i} className="flex items-center justify-between">
                                            <span className="flex items-center gap-2 text-sm text-gray-800">
                                                <input
                                                    type="checkbox"
                                                    className="accent-blue-500"
                                                    checked={draftCategories.includes(cat)}
                                                    onChange={() => handleDraftCategoryChange(cat)}
                                                />
                                                {cat}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {products.filter((p) => (p.categoryNames || p.categories || []).includes(cat)).length}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </details>

                            <details open className="rounded-lg border border-gray-200 p-3">
                                <summary className="font-semibold text-gray-900 cursor-pointer">Price Range</summary>
                                <div className="mt-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={maxAvailablePrice || 1000}
                                        value={draftPriceLimit}
                                        onChange={(e) => setDraftPriceLimit(Number(e.target.value))}
                                        className="w-full accent-blue-600"
                                    />
                                    <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
                                        <span>₹0</span>
                                        <span className="font-semibold">₹{draftPriceLimit}</span>
                                    </div>
                                </div>
                            </details>
                        </div>

                        <div className="p-4 border-t border-gray-200 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={clearMobileFilters}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={applyMobileFilters}
                                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading shop...</div>}>
            <ShopContent />
        </Suspense>
    );
}
