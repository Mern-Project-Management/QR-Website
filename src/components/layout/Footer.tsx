"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, Facebook, Linkedin, Instagram, MapPin, Twitter } from "react-feather";
import { safeImageSrc } from "@/lib/safeImageSrc";

type FooterLayout = "default" | "classic" | "modern" | "light" | "elegant";

interface FooterProps {
    layout?: FooterLayout;
    bgColor?: string;
    foreColor?: string;
    iconbgColor?: string;
    foretextColor?: string;
    borderColor?: string;
    logo?: string;
}

interface DynamicFooterData {
    logo_url: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    facebook_url: string;
    instagram_url: string;
    linkedin_url: string;
    twitter_url: string;
}

export default function Footer({ logo = "/images/logo/combined-logo-white.png" }: FooterProps) {
    const [footerData, setFooterData] = useState<DynamicFooterData | null>(null);

    const getAdminOriginFromEnv = () => {
        const direct = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/$/, "");
        if (direct) return direct;
        const apiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL;
        if (apiUrl) {
            try {
                return new URL(apiUrl).origin.replace(/\/$/, "");
            } catch {
                // ignore invalid URL
            }
        }
        return "";
    };

    const toAbsoluteBackendUrl = (src: string) => {
        if (!src) return src;
        if (src.startsWith("http://") || src.startsWith("https://")) return src;
        if (!src.startsWith("/")) return src;
        // Only prefix backend-served URLs. Keep local `/public/*` assets (e.g. `/images/...`) relative.
        if (!src.startsWith("/api/")) return src;
        const origin = getAdminOriginFromEnv();
        return origin ? `${origin}${src}` : src;
    };

    useEffect(() => {
        const fetchFooter = async () => {
            try {
                // Using the proxied /api/footer which points to the remote backend
                const res = await fetch('/api/backend/footer');
                console.log("Footer Response", res);

                const result = await res.json();
                if (result.success && result.data) {
                    setFooterData(result.data);
                }
            } catch (err) {
                console.error("Failed to fetch footer data:", err);
            }
        };
        fetchFooter();
    }, []);

    const getDarkLogo = (src: string) => {
        if (!src) return logo;
        // If it's a dynamic URL from API, return it as-is (no "-white" mutation).
        if (src.includes('/api/image/download')) return src;

        if (/-white\.(png|jpg|jpeg|svg)$/i.test(src)) {
            return src;
        }
        return src.replace(/\.(png|jpg|jpeg|svg)$/i, '-white.$1');
    };

    const displayLogo = footerData?.logo_url || logo;
    const safeLogo = safeImageSrc(toAbsoluteBackendUrl(getDarkLogo(displayLogo)));
    const description = footerData?.description || "We place great emphasis on designers, artists, and brands.";
    const phone = footerData?.phone || "+91-730 494 5821";
    const email = footerData?.email || "info@qr.com";
    const address = footerData?.address || "3rd Floor, Sapphire, Sarigam Rd, above Axis Bank, Gujarat 396191";

    return (
        <footer className={`font-dm relative z-10 text-gray-300 bg-gray-900 pt-16 pb-8`}>
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-14 gap-10 lg:gap-8 mb-16">

                    {/* Column 1: Logo & Info */}
                    <div className="lg:col-span-4 lg:pr-10">
                        <Link href="/" className="inline-block mb-6">
                            <Image
                                src={safeLogo}
                                alt="logo"
                                width={180}
                                height={60}
                                priority
                                className="h-12 w-auto"
                            />
                        </Link>
                        <p className="mb-8 text-gray-400 font-medium leading-relaxed max-w-xs">
                            {description}
                        </p>
                        <div className="flex items-center gap-3">
                            {footerData?.facebook_url && (
                                <Link href={footerData.facebook_url} target="_blank" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-blue-900 hover:text-white transition group">
                                    <Facebook size={18} className="text-gray-300 group-hover:text-white" />
                                </Link>
                            )}
                            {footerData?.twitter_url && (
                                <Link href={footerData.twitter_url} target="_blank" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-blue-900 hover:text-white transition group">
                                    <Twitter size={18} className="text-gray-300 group-hover:text-white" />
                                </Link>
                            )}
                            {footerData?.instagram_url && (
                                <Link href={footerData.instagram_url} target="_blank" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-blue-900 hover:text-white transition group">
                                    <Instagram size={18} className="text-gray-300 group-hover:text-white" />
                                </Link>
                            )}
                            {footerData?.linkedin_url && (
                                <Link href={footerData.linkedin_url} target="_blank" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-blue-900 hover:text-white transition group">
                                    <Linkedin size={18} className="text-gray-300 group-hover:text-white" />
                                </Link>
                            )}
                            {!footerData && (
                                <>
                                    <Link href="#" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-blue-900 hover:text-white transition group">
                                        <Facebook size={18} className="text-gray-300 group-hover:text-white" />
                                    </Link>
                                    <Link href="#" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-blue-900 hover:text-white transition group">
                                        <Instagram size={18} className="text-gray-300 group-hover:text-white" />
                                    </Link>
                                    <Link href="#" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-blue-900 hover:text-white transition group">
                                        <Linkedin size={18} className="text-gray-300 group-hover:text-white" />
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div className="lg:col-span-3">
                        <h4 className="text-white font-bold mb-6 tracking-widest uppercase relative pb-4 
                        after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-px after:bg-gray-600">
                            QUICK LINKS
                        </h4>
                        <ul className="flex flex-col gap-4 text-gray-300 font-medium">
                            <li><Link href="/#about" className="hover:text-white transition">About Us</Link></li>
                            <li><Link href="/shop" className="hover:text-white transition">Shop</Link></li>
                            <li><Link href="/#how_it_work" className="hover:text-white transition">How It Works</Link></li>
                            <li><Link href="/#why_choose_us" className="hover:text-white transition">Why Choose Us</Link></li>
                            <li><Link href="/blogs" className="hover:text-white transition">Blogs</Link></li>
                            <li><Link href="/#contact" className="hover:text-white transition">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Policies */}
                    <div className="lg:col-span-3">
                        <h4 className="text-white font-bold mb-6 tracking-widest uppercase relative pb-4 
                        after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-px after:bg-gray-600">
                            POLICIES
                        </h4>
                        <ul className="flex flex-col gap-4 text-gray-300 font-medium">
                            <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
                            <li><Link href="/terms-and-conditions" className="hover:text-white transition">Terms &amp; Conditions</Link></li>
                            <li><Link href="/refund-policy" className="hover:text-white transition">Refund Policy</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Contact Us */}
                    <div className="lg:col-span-4">
                        <h4 className="text-white font-bold mb-6 tracking-widest uppercase relative pb-4 
                        after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-px after:bg-gray-600">
                            CONTACT US
                        </h4>
                        <ul className="flex flex-col gap-5 text-gray-300 font-medium text-sm">
                            <li className="flex items-start gap-4 hover:text-white transition">
                                <div className="w-8 h-8 rounded-full bg-blue-900 border border-gray-800 flex items-center justify-center flex-shrink-0 text-white">
                                    <Phone size={14} />
                                </div>
                                <div className="pt-1.5">{phone}</div>
                            </li>
                            <li className="flex items-start gap-4 hover:text-white transition">
                                <div className="w-8 h-8 rounded-full bg-blue-900 border border-gray-800 flex items-center justify-center flex-shrink-0 text-white">
                                    <Mail size={14} />
                                </div>
                                <div className="pt-1.5">{email}</div>
                            </li>
                            <li className="flex items-start gap-4 hover:text-white transition">
                                <div className="w-8 h-8 rounded-full bg-blue-900 border border-gray-800 flex items-center justify-center flex-shrink-0 text-white">
                                    <MapPin size={14} />
                                </div>
                                <div className="pt-1.5 leading-relaxed">
                                    {address}
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-center items-center gap-4 text-gray-400 font-medium text-sm">
                    <p className="mb-0">
                        Copyright © {new Date().getFullYear()} Odokho Digital Service. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
