"use client";

import React, { useEffect, useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PAGE_TOP_PADDING } from "@/lib/siteLayout";

export default function TermsAndConditionsPage() {
    const [content, setContent] = useState<string>('');
    const [title, setTitle] = useState<string>('Terms and Conditions');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await fetch('/api/backend/policies?slug=terms-and-conditions');
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        setContent(result.data.content);
                        setTitle(result.data.title);
                    }
                }
            } catch (error) {
                console.error("Failed to load terms and conditions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, []);

    return (
        <>
            <section className={`border-b border-slate-200/70 bg-light-blue-banner pb-4 sm:pb-6 ${PAGE_TOP_PADDING}`}>
                <div className="max-w-screen mx-auto min-w-0 overflow-x-hidden font-dm">
                    <PageTitle title={title} subtitle="">
                        <div className="flex justify-center px-2 text-center sm:px-0">
                            <Breadcrumb items={[{ label: "Home", href: "/" }, { label: title }]} variant="light" />
                        </div>
                    </PageTitle>
                </div>
            </section>
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3 lg:py-24 py-16 font-dm">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : content ? (
                    <div className="product-longdesc max-w-none">
                        <style>{`
            .product-longdesc {
                font-family: var(--font-dm, 'DM Sans', sans-serif);
                font-size: 0.875rem; /* base size for mobile */
                line-height: 1.7;
                color: #374151;
                overflow-wrap: break-word;
                word-wrap: break-word;
            }
            @media (min-width: 768px) {
                .product-longdesc {
                    font-size: 0.9375rem;
                    line-height: 1.85;
                }
            }
            .product-longdesc p {
                margin-bottom: 1rem;
            }
            .product-longdesc img {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
            }
            .product-longdesc h1,
            .product-longdesc h2,
            .product-longdesc h3,
            .product-longdesc h4,
            .product-longdesc h5,
            .product-longdesc h6 {
                font-weight: 600;
                color: #111827;
                margin-top: 1.5rem;
                margin-bottom: 0.5rem;
                line-height: 1.3;
            }
            .product-longdesc h1 { font-size: 1.35rem; }
            .product-longdesc h2 { font-size: 1.25rem; }
            .product-longdesc h3 { font-size: 1.15rem; }
            @media (min-width: 768px) {
                .product-longdesc h1 { font-size: 1.75rem; }
                .product-longdesc h2 { font-size: 1.5rem; }
                .product-longdesc h3 { font-size: 1.3rem; }
            }
            @media (min-width: 1024px) {
                .product-longdesc h1 { font-size: 2.25rem; }
                .product-longdesc h2 { font-size: 1.7rem; }
                .product-longdesc h3 { font-size: 1.5rem; }
            }
            .product-longdesc ul,
            .product-longdesc ol {
                padding-left: 1.4rem;
                margin-bottom: 1rem;
            }
            .product-longdesc ul { 
                list-style-type: disc;
                padding-left: 1.5rem;
            }
            @media (min-width: 768px) {
                .product-longdesc ul { padding-left: 2rem; }
            }
            .product-longdesc ol { list-style-type: decimal; }
            .product-longdesc li {
                margin-bottom: 0.35rem;
            }
            .product-longdesc strong,
            .product-longdesc b {
                font-weight: 600;
                color: #1f2937;
            }
            .product-longdesc em,
            .product-longdesc i {
                font-style: italic;
                color: #4b5563;
            }
            .product-longdesc a {
                color: #2563eb;
                text-decoration: underline;
                text-underline-offset: 2px;
                word-break: break-all;
            }
            .product-longdesc a:hover { color: #1d4ed8; }
            .product-longdesc blockquote {
                border-left: 3px solid #2563eb;
                padding: 0.5rem 1rem;
                margin: 1.25rem 0;
                background: #f0f4ff;
                border-radius: 0 6px 6px 0;
                font-style: italic;
            }
            .product-longdesc .table-responsive {
                width: 100%;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                margin-bottom: 1rem;
            }
            .product-longdesc table {
                width: 100%;
                min-width: 400px;
                border-collapse: collapse;
                font-size: 0.875rem;
            }
            .product-longdesc th,
            .product-longdesc td {
                border: 1px solid #e5e7eb;
                padding: 0.5rem 0.75rem;
                text-align: left;
            }
            .product-longdesc th {
                background: #f9fafb;
                font-weight: 600;
                color: #111827;
            }
            .product-longdesc tr:nth-child(even) td { background: #f9fafb; }
            .product-longdesc hr {
                border: none;
                border-top: 1px solid #e5e7eb;
                margin: 1.5rem 0;
            }
            .product-longdesc code {
                background: #f3f4f6;
                border-radius: 4px;
                padding: 0.1em 0.4em;
                font-size: 0.875em;
                color: #1f2937;
                word-break: break-word;
            }
        `}</style>
                        <div dangerouslySetInnerHTML={{
                            __html: content.replace(/<table/g, '<div class="table-responsive"><table').replace(/<\/table>/g, '</table></div>')
                        }} />
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-10">
                        Policy content not available.
                    </div>
                )}
            </div>
        </>
    );
}
