"use client";

import React, { useState, useEffect } from "react";
import PageTitle3 from "@/components/ui/PageTitle3";

interface MarketplaceItem {
    id: string;
    title: string;
    icon: string;
    redirectUrl: string;
    isActive: boolean;
    sortOrder: number;
}

const MarketplaceSection = () => {
    const [cards, setCards] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const response = await fetch("/api/backend/marketplace");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Filter active and sort
                const activeCards = Array.isArray(data)
                    ? data.filter((card: MarketplaceItem) => card.isActive)
                        .sort((a: MarketplaceItem, b: MarketplaceItem) => a.sortOrder - b.sortOrder)
                    : [];

                setCards(activeCards);
            } catch (err) {
                console.error("Error fetching marketplace cards:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCards();
    }, []);

    // Premium fallbacks if no cards are in the database yet
    const fallbackCards = [
        {
            id: "1",
            title: "Amazon Store",
            icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18.72 17.58c-1.8 1.45-4.46 2.05-6.72 2.05-3.3 0-6.23-1.32-7.85-3.4-.15-.2-.04-.46.18-.32 2.37 1.5 5.53 2.42 8.78 2.42 2.05 0 4.26-.35 6-1.12.33-.14.54.18.23.4l-.62.37zm1.18-.94c-.2-.26-.85-.18-1.18-.12-.34.06-.55.22-.38.5.17.27.76.24 1.13.13.37-.11.63-.25.43-.51zm.35-1.92c-.8-1-2.9-2-5.18-2-2.14 0-4 1.17-4 3.06 0 1.63 1.25 2.7 3.2 2.7 1.84 0 3.25-1 3.96-2.48.24-.5.42-1.07.46-1.68h.08c.18.77.53 1.4 1.2 1.9.64.47 1.52.76 2.4.76.7 0 1.2-.23 1.4-.48.24-.3.07-.63-.2-.77-.73-.37-1.17-.9-1.25-1.83V12.1a16.8 16.8 0 0 0-.27-2.61c-.13-.67-.37-1.25-.86-1.67-.6-.53-1.57-.82-2.6-.82-1.42 0-2.63.5-3.23 1.25-.26.33.05.65.34.46.73-.5 1.76-.82 2.85-.82.9 0 1.74.24 2.22.7.4.37.5.88.54 1.5l-.23 2.65zm-4.72 2.38c-.37.77-1.04 1.33-1.94 1.33-.94 0-1.55-.58-1.55-1.47 0-1.05.8-1.74 2.05-1.74.52 0 1.05.11 1.44.25v1.63z"/></svg>`,
            redirectUrl: "https://amazon.com",
            isActive: true,
            sortOrder: 0
        },
        {
            id: "2",
            title: "Shopify Store",
            icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.8 5.25L17.7 2.1c-.26-.39-.75-.54-1.19-.34l-2.02.94c-.45.2-1 .15-1.4-.14L10.3 1.08c-.46-.35-1.1-.31-1.53.09L5.3 4.41c-.26.24-.36.62-.27.97l2.84 11.23a1.5 1.5 0 0 0 1.45 1.13h7.32c.67 0 1.26-.45 1.43-1.1L20.1 6.3c.1-.42-.03-.86-.3-1.05zm-4.8 7.37c-.36.9-.96 1.38-1.8 1.38-.85 0-1.44-.48-1.8-1.38V9.13h3.6v3.49z"/></svg>`,
            redirectUrl: "https://shopify.com",
            isActive: true,
            sortOrder: 1
        },
        {
            id: "3",
            title: "Flipkart Store",
            icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>`,
            redirectUrl: "https://flipkart.com",
            isActive: true,
            sortOrder: 2
        }
    ];

    const displayCards = cards.length > 0 ? cards : fallbackCards;

    if (loading) {
        return (
            <div className="py-12 bg-white dark:bg-gray-950 font-dm">
                <div className="max-w-screen-xl mx-auto px-4 text-center text-gray-500">
                    Loading our marketplace connections...
                </div>
            </div>
        );
    }

    return (
        <div className="relative py-12 lg:py-16 bg-gradient-to-b from-transparent to-blue-50/20 dark:to-blue-950/10 font-dm">
            <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-4">
                
                <PageTitle3
                    badgeText="Partners & Storefronts"
                    title="Find Us On Marketplace"
                    subtitle="Directly browse, shop, and checkout our official products on trusted leading marketplace storefronts."
                    widthClass="xl:w-7/12 lg:w-2/3 mx-auto"
                    alignment="center"
                    padding="pb-10"
                    textColor=""
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayCards.map((card, index) => {
                        const isSvg = card.icon.trim().startsWith("<svg");
                        return (
                            <a
                                key={card.id}
                                href={card.redirectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block relative w-full"
                                data-aos="fade-up"
                                data-aos-delay={index * 100}
                            >
                                <div className="
                                    relative flex flex-col items-center justify-center p-6
                                    bg-white dark:bg-gray-900/60
                                    border border-gray-100 dark:border-gray-800/80
                                    rounded-2xl shadow-sm
                                    transition-all duration-300 ease-out
                                    hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10
                                    hover:border-blue-500/20 dark:hover:border-blue-400/20
                                    hover:bg-gradient-to-br hover:from-white hover:to-blue-50/30
                                    dark:hover:from-gray-900/80 dark:hover:to-blue-950/20
                                    overflow-hidden text-center
                                ">
                                    {/* Subtle Gradient Glow */}
                                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                                    
                                    {/* Icon Container */}
                                    <div className="
                                        w-16 h-16 mb-4 flex items-center justify-center
                                        rounded-2xl bg-blue-50/50 dark:bg-blue-950/30
                                        text-blue-600 dark:text-blue-400
                                        group-hover:bg-blue-100 group-hover:text-blue-700
                                        dark:group-hover:bg-blue-900/40 dark:group-hover:text-blue-300
                                        transition-all duration-300 group-hover:scale-110
                                    ">
                                        {isSvg ? (
                                            <div 
                                                className="w-8 h-8 flex items-center justify-center fill-current [&>svg]:w-full [&>svg]:h-full" 
                                                dangerouslySetInnerHTML={{ __html: card.icon }} 
                                            />
                                        ) : (
                                            <span className="text-xl font-bold uppercase truncate max-w-full px-2">
                                                {card.icon.substring(0, 3)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 mb-1">
                                        {card.title}
                                    </h4>

                                    {/* Redirect link indicator */}
                                    <span className="
                                        text-xs font-semibold text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400
                                        inline-flex items-center gap-1 mt-2 transition-colors duration-300
                                    ">
                                        Visit Store
                                        <svg className="w-3 h-3 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </span>
                                </div>
                            </a>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};

export default MarketplaceSection;
