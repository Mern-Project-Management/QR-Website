export interface Product {
    id: number;
    title: string;
    subtitle: string;
    /** API may return decimal strings (e.g. `"299.00"`). */
    price: number | string;
    oldPrice?: number | string;
    discount?: string;
    badge?: string;
    imgOne: string;
    imgTwo: string;
    categories: string[];
    /** Resolved from category UUIDs when using `fetchProductsEnriched`. */
    categoryNames?: string[];
    size: string[];
    availability: "In Stock" | "Out of Stock";
    colors: string[];
    review?: number;
    shortDesc?: string;
    longDesc?: string;
    slug?: string;
    discountConfig?: ProductDiscountConfig | null;
}

export interface ProductDiscountConfig {
    quantityRules?: Array<{
        minQty: number;
        type: 'percentage' | 'flat';
        value: number;
        maxDiscount?: number | string | null;
    }>;
    coupon?: {
        code: string;
        type: 'percentage' | 'flat';
        value: number;
    };
}
