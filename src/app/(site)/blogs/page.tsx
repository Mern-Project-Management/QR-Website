"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthorBio from "@/components/ui/AuthorBio";
import TrendingPosts from "@/components/ui/TrendingPosts";
import { safeImageSrc } from "@/lib/safeImageSrc";

import { ArrowUpRight, ChevronDown } from "react-feather";
import PageTitle from "@/components/ui/PageTitle";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PAGE_TOP_PADDING } from "@/lib/siteLayout";

export default function BlogPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [blogPosts, setBlogPosts] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [owner, setOwner] = useState<any>(null);
    const [selected, setSelected] = useState("");
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const blogRes = await fetch('/api/backend/blog-posts');
                const blogData = await blogRes.json();
                if (Array.isArray(blogData)) {
                    setBlogPosts(blogData);
                } else if (blogData.success) {
                    setBlogPosts(blogData.data);
                }

                const ownerRes = await fetch('/api/backend/owner');
                const ownerData = await ownerRes.json();
                if (ownerData.success && ownerData.data.length > 0) {
                    setOwner(ownerData.data[0]);
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

    const img = (src: string) => safeImageSrc(toAbsoluteBackendUrl(src));

    const featuredPost = blogPosts.length > 0 ? blogPosts[0] : null; // first blog is featured here
    const sidePosts = blogPosts.length > 1 ? blogPosts.slice(1, 4) : [];
    const bottomPosts = blogPosts.length > 4 ? blogPosts.slice(4) : [];

    if (loading) return <div className="text-center py-40">Loading...</div>;

    return (
        <>
            <section className={`border-b border-slate-200/70 bg-light-blue-banner pb-4 sm:pb-6 ${PAGE_TOP_PADDING}`}>
                <div className="max-w-screen mx-auto min-w-0 overflow-x-hidden font-dm">
                    <PageTitle title="Blogs" subtitle="">
                        <div className="flex justify-center px-2 text-center sm:px-0">
                            <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blogs" }]} variant="light" />
                        </div>
                    </PageTitle>
                </div>
                <div className="max-w-screen-xl mx-auto min-w-0 overflow-x-hidden px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
                    <div className="grid grid-cols-1 relative space-y-5 lg:grid-cols-3 lg:gap-10 lg:space-y-0 xl:grid-cols-2">
                        <div className="min-w-0 lg:col-span-2 xl:col-span-1">
                            <h2 className="mb-2 text-2xl font-bold leading-tight tracking-tight break-words text-balance text-gray-900 sm:text-3xl md:text-5xl lg:text-7xl">
                                News, insights and more
                            </h2>
                            <p className="mb-0 mt-3 text-base font-medium text-gray-800 sm:text-lg">
                                Genuine feedback from those who know us best.
                            </p>
                        </div>
                        <div className="flex w-full min-w-0 lg:justify-end lg:text-right">
                            <div
                                className="relative mt-auto inline-block w-full sm:w-auto"
                                data-aos="zoom-in"
                                data-aos-duration="400"
                                data-delay="00"
                            >
                                <select
                                    value={selected}
                                    onChange={(e) => setSelected(e.target.value)}
                                    className="w-full sm:w-auto text-base font-medium px-5 py-3 appearance-none pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition duration-300"
                                    aria-label="Select a categories"
                                >
                                    <option value="">Select a category</option>
                                    <option value="design">Design</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="startup">Startup</option>
                                    <option value="saas">SaaS</option>
                                </select>

                                {/* Custom arrow */}
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                    <ChevronDown size={20} className="text-gray-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="my-6 w-full border-t border-gray-200 lg:my-10"></div>
                </div>
            </section>
            <div className="blog-wrap font-dm">
                <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3 lg:pb-24 pb-20">
                    <div className="grid lg:grid-cols-2 grid-cols-1 lg:gap-6 relative lg:space-y-0 space-y-5">
                        {/* === Featured Post === */}
                        {featuredPost && (
                            <div className="w-full">
                                <Link
                                    href={`/blogs/${featuredPost.slug}`}
                                    className="border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-xs transition-shadow duration-300"
                                >
                                    <div className="overflow-hidden">
                                        <Image
                                            src={img(featuredPost.image)}
                                            alt={featuredPost.title}
                                            width={800}
                                            height={500}
                                            className="w-full transition-transform duration-500 hover:scale-105"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex flex-col px-1">
                                            <div className="flex flex-row text-gray-600 text-sm mb-2 font-medium">
                                                <span>{featuredPost.date}</span>
                                                <span className="mx-1">•</span>
                                                <span>{featuredPost.readTime}</span>
                                            </div>
                                            <h2 className="lg:text-3xl text-2xl text-gray-900 font-semibold mb-1 leading-snug">
                                                {featuredPost.title}
                                            </h2>
                                            <p className="text-gray-700 font-medium mt-1 lg:pr-20 text-[17px]">
                                                {featuredPost.excerpt}
                                            </p>
                                            <div className="flex flex-row gap-3 mt-4 items-center">
                                                <Image
                                                    src={img(featuredPost.authorAvatar)}
                                                    alt={featuredPost.author}
                                                    width={44}
                                                    height={44}
                                                    className="w-11 h-11 rounded-full object-cover"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-base text-gray-900 font-medium leading-5">
                                                        {featuredPost.author}
                                                    </span>
                                                    <span className="text-sm text-gray-600 font-medium leading-5">
                                                        {featuredPost.authorPosition}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )}

                        {/* === Side Posts === */}
                        <div className="w-full space-y-6">
                            {sidePosts.map((post) => (
                                <div key={post.id} className="article" data-aos="fade-up">
                                    <Link
                                        href={`/blogs/${post.slug}`}
                                        className="border border-gray-200 rounded-xl overflow-hidden flex flex-col lg:flex-row hover:shadow-xs transition-shadow duration-300"
                                    >
                                        <div className="lg:w-1/3 w-full">
                                            <div className="overflow-hidden h-full">
                                                <Image
                                                    src={img(post.image)}
                                                    alt={post.title}
                                                    width={300}
                                                    height={200}
                                                    className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
                                                />
                                            </div>
                                        </div>
                                        <div className="lg:w-2/3 w-full">
                                            <div className="p-4 h-full">
                                                <div className="flex flex-col px-1">
                                                    <div className="flex flex-row text-gray-600 text-sm mb-2 font-medium">
                                                        <span>{post.date}</span>
                                                        <span className="mx-1">•</span>
                                                        <span>{post.readTime}</span>
                                                    </div>
                                                    <h2 className="text-xl text-gray-900 font-semibold mb-1 lg:pr-16 leading-snug">
                                                        {post.title}
                                                    </h2>
                                                    <p className="text-gray-600 font-medium text-[17px] mt-1 lg:pr-20 mb-2">
                                                        {post.excerpt}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* === Bottom Section === */}
                    <div className="flex flex-col items-center text-center xl:w-5/12 lg:w-2/3 mx-auto lg:py-20 py-12">
                        <h2 className="lg:text-5xl md:text-4xl text-3xl font-semibold tracking-tighter text-gray-900 mb-4">
                            Catch up on our newest blog and articles
                        </h2>
                        <p className="text-gray-600 text-lg font-medium max-w-xl">
                            Balanced you — and works tirelessly to help you get there.
                        </p>
                    </div>

                    {/* === Bottom Blog Grid === */}
                    <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 lg:gap-6 relative lg:space-y-0 space-y-5">
                        <div className="w-full col-span-2">
                            <div className="grid grid-cols-1 lg:gap-6 relative lg:space-y-0 space-y-5 font-dm">
                                <div className="w-full mb-2 aos-init aos-animate">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="md:w-5/12 h-full">

                                        </div>
                                        <div className="md:w-7/12">

                                        </div>
                                    </div>
                                </div>
                                {bottomPosts.map((post) => (
                                    <div key={post.id} className="w-full mb-2" data-aos="zoom-in">
                                        <Link
                                            href={`/blogs/${post.slug}`}
                                            className="flex flex-col md:flex-row gap-4"
                                        >
                                            <div className="md:w-5/12 h-full">
                                                <div className="overflow-hidden rounded-lg">
                                                    <Image
                                                        src={img(post.image)}
                                                        alt={post.title}
                                                        width={500}
                                                        height={300}
                                                        className="w-full transition-transform duration-500 hover:scale-105"
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:w-7/12">
                                                <div className="flex flex-col p-4 pt-0 bg-white pr-6">
                                                    <div className="flex flex-row text-gray-600 text-sm mb-2">
                                                        <span>{post.date}</span>
                                                        <span className="mx-1">•</span>
                                                        <span>{post.readTime}</span>
                                                    </div>
                                                    <h2 className="text-2xl md:text-3xl text-gray-900 font-semibold mb-1">
                                                        {post.title}
                                                    </h2>
                                                    <p className="text-gray-600 font-medium text-[17px] mt-1 lg:pr-20 mb-2"> {post.excerpt} </p>
                                                    <div className="flex flex-row gap-3 mt-2 items-center">
                                                        <Image
                                                            src={img(post.authorAvatar)}
                                                            alt={post.author}
                                                            width={40}
                                                            height={40}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-[15px] text-gray-900 font-medium leading-5">
                                                                {post.author}
                                                            </span>
                                                            <span className="text-[13px] text-gray-600 font-normal leading-5">
                                                                {post.authorPosition}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full space-y-6">
                            {owner && (
                                <AuthorBio
                                    name={owner.name}
                                    role={owner.role}
                                    bio={owner.bio}
                                    avatar={owner.avatar}
                                    socials={{
                                        facebook: owner.facebook || undefined,
                                        linkedin: owner.linkedin || undefined,
                                        twitch: owner.twitch || undefined,
                                        twitter: owner.twitter || undefined,
                                    }}
                                />
                            )}
                            <TrendingPosts limit={4} />
                        </div>
                    </div>

                    {/* Load More */}
                    <div className="flex text-center justify-center mt-10">
                        <button className="inline-flex items-center justify-center gap-2 px-7 py-3 text-white text-base font-medium bg-gray-900 hover:bg-gray-700 rounded-lg transition duration-300">
                            <span>Load more</span>
                            <ArrowUpRight size={20} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
