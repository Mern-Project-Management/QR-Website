import Link from "next/link";
import { ChevronRight } from "react-feather";

interface BreadcrumbProps {
    items: { label: string; href?: string }[];
    /** Kept for API compatibility; both use dark text on light backgrounds. */
    variant?: "default" | "light";
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => {
    return (
        <nav className="text-sm font-medium text-gray-800" aria-label="Breadcrumb">
            <ol className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-1 md:space-x-1 md:gap-x-0">
                {items.map((item, index) => (
                    <li key={index} className="inline-flex items-center text-base font-medium text-gray-900">
                        {item.href ? (
                            <Link
                                href={item.href}
                                className="inline-flex items-center text-gray-700 hover:text-gray-900"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="break-words text-gray-900">{item.label}</span>
                        )}

                        {index < items.length - 1 && (
                            <ChevronRight size={20} className="ml-2 shrink-0 text-gray-400" aria-hidden />
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};
