'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, X, ArrowUpRight, LogOut, ShoppingBag } from 'react-feather';
import { LayoutDashboard } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { safeImageSrc } from '@/lib/safeImageSrc';

interface SubMenuItem {
    title: string;
    href: string;
    logo?: string;
}

interface MegaMenuItem {
    title: string;
    subMenu: SubMenuItem[];
}

interface MenuItem {
    title: string;
    href?: string;
    subMenu?: SubMenuItem[];
    megaMenu?: MegaMenuItem[];
}

interface MenuBlockProps {
    mobileOpen?: boolean;
    toggleMobileMenu?: () => void;
    logo?: string;
    btnColor?: string;
    btnlinkColor?: string;
}


const home1MenuItems: MenuItem[] = [
    // { title: 'Home', href: '#home' },
    // { title: 'About', href: '#about' },
    { title: 'Shop', href: '/shop' },
    { title: 'Bulk Purchase', href: '/bulk-purchase' },
    // { title: 'Features', href: '#how_it_work' },
    // { title: 'Services', href: '#why_choose_us' },
    // { title: 'Blogs', href: '/blogs' },
    // {
    //     title: 'Policies',
    //     subMenu: [
    //         { title: 'Privacy Policy', href: '/privacy-policy' },
    //         { title: 'Terms & Conditions', href: '/terms-and-conditions' },
    //         { title: 'Refund Policy', href: '/refund-policy' }
    //     ]
    // },
    // { title: 'Contact', href: '#contact' },
];

const MenuBlock: React.FC<MenuBlockProps> = ({ mobileOpen = false, toggleMobileMenu, logo = "/images/logo/logo-blue.png", btnColor = 'bg-brand-primary', btnlinkColor = "text-white", }) => {
    const [openSubMenu, setOpenSubMenu] = useState<Record<string, boolean>>({});
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;
    const userInitials = session?.user?.name
        ? session.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    const handleSignOut = async () => {
        toggleMobileMenu?.();
        await signOut({ redirect: false });
        router.push('/');
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mobileOpen) return;
        const prev = document.body.style.overflow;
        document.body.classList.add("mobile-nav-open");
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove("mobile-nav-open");
        };
    }, [mobileOpen]);

    // Dynamically modify menu items based on current page
    const menuItems = home1MenuItems.map(item => ({
        ...item,
        href: item.href?.startsWith('#') && pathname !== '/home-1'
            ? `/${item.href}`
            : item.href
    }));

    const toggleSubMenu = (key: string) => {
        setOpenSubMenu((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const getDarkLogo = (src: string) => {
        if (src.endsWith('.png')) return src.replace('.png', '-white.png');
        if (src.endsWith('.jpg')) return src.replace('.jpg', '-white.jpg');
        if (src.endsWith('.svg')) return src.replace('.svg', '-white.svg');
        return src; // fallback
    };

    const lightLogoSrc = safeImageSrc(logo);
    const darkLogoSrc = safeImageSrc(getDarkLogo(logo));

    return (
        <>
            {/* Desktop Menu */}
            <ul className="hidden lg:flex gap-6 font-semibold text-[17px] main-menu">
                {menuItems.map((item, index) => (
                    item.subMenu ? (
                        // Normal dropdown menu
                        <li key={index} className="group relative">
                            <button className="flex items-center gap-1 py-8">
                                {item.title} <ChevronDown size={14} />
                            </button>
                            <ul className="absolute top-full py-2 left-0 bg-white shadow-lg rounded-lg hidden group-hover:flex flex-col min-w-[220px] z-50 overflow-hidden">
                                {item.subMenu.map((sub, subIndex) => (
                                    <li key={subIndex}>
                                        <Link
                                            href={sub.href || "#"}
                                            className="block px-4 py-2 text-gray-700 hover:translate-x-2 dark:hover:bg-gray-800 transition duration-300"
                                        >
                                            {sub.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ) : item.megaMenu ? (
                        // Mega menu (NO relative on li)
                        <li key={index} className="group">
                            <button className="flex items-center gap-1 py-8">
                                {item.title} <ChevronDown size={14} />
                            </button>
                            <div className="absolute top-full left-0 w-full bg-white shadow-lg hidden group-hover:block rounded-lg z-50">
                                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-5 lg:gap-6 gap-1 lg:p-6 p-0 text-base font-medium text-gray-900">
                                    {item.megaMenu.map((section, secIndex) => (
                                        <div key={secIndex}>
                                            <h4 className="font-semibold mb-4">{section.title}</h4>
                                            <ul className="flex flex-col gap-2">
                                                {section.subMenu.map((sub, subIndex) => (
                                                    <li key={subIndex}>
                                                        <Link
                                                            href={sub.href || "#"}
                                                            className="text-gray-700 hover:translate-x-2 duration-300 transition"
                                                        >
                                                            {sub.title}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                    <div className="hidden lg:flex flex-col justify-between bg-blue-50 rounded-xl p-6">
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Explore more</h4>
                                            <Image
                                                src="/images/menu-right-banner-1.svg"
                                                alt="banner"
                                                width={400}   // required
                                                height={250}  // required
                                                className="my-3"
                                            />
                                        </div>
                                        <a href="blog-1.html" className="text-blue-600 hover:translate-x-2 duration-300 transition font-medium inline-flex items-center gap-1 text-base">
                                            See more content
                                            <ArrowUpRight size={18} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ) : (
                        // Simple link
                        <li key={index}>
                            <Link href={item.href || "#"} className="flex items-center gap-1 py-8">
                                {item.title}
                            </Link>
                        </li>
                    )
                ))}
            </ul>

            {/* Mobile menu + backdrop: portaled to body so z-index is not trapped under main content stacking contexts */}
            {mounted &&
                createPortal(
                    <>
                        {mobileOpen && (
                            <div
                                className="fixed inset-0 z-[11000] bg-black/60 lg:hidden"
                                aria-hidden
                                onClick={() => toggleMobileMenu?.()}
                            />
                        )}
                        <div
                            className={`fixed left-0 z-[11001] flex w-[min(18rem,88vw)] flex-col bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden ${
                                mobileOpen ? "translate-x-0" : "-translate-x-full"
                            }`}
                            style={{
                                top: "var(--maintenance-banner-offset, 0px)",
                                height: "calc(100dvh - var(--maintenance-banner-offset, 0px))",
                            }}
                        >
                            <div className="flex items-center justify-between border-b border-gray-200 p-4">
                                <Link href="/" className="flex items-center" onClick={() => toggleMobileMenu?.()}>
                                    <Image
                                        src={lightLogoSrc}
                                        alt="logo"
                                        width={125}
                                        height={40}
                                        priority
                                        className="h-9 w-auto dark:hidden"
                                    />
                                    <Image
                                        src={darkLogoSrc}
                                        alt="logo dark"
                                        width={125}
                                        height={40}
                                        priority
                                        className="hidden h-9 w-auto dark:flex"
                                    />
                                </Link>
                                <button type="button" onClick={() => toggleMobileMenu?.()} aria-label="Close menu">
                                    <X size={24} />
                                </button>
                            </div>
                            <ul className="flex flex-col gap-2 overflow-y-auto p-4">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        {item.subMenu || item.megaMenu ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSubMenu(`${index}`)}
                                                    className="flex w-full items-center justify-between py-2 font-medium text-gray-900"
                                                >
                                                    {item.title} <ChevronDown size={18} />
                                                </button>
                                                {openSubMenu[`${index}`] && (
                                                    <ul className="mt-2 flex flex-col gap-2 pl-4">
                                                        {item.subMenu &&
                                                            item.subMenu.map((sub, subIndex) => (
                                                                <li key={subIndex}>
                                                                    <Link
                                                                        href={sub.href || '#'}
                                                                        className="block py-1 font-medium text-gray-700"
                                                                        onClick={() => toggleMobileMenu?.()}
                                                                    >
                                                                        {sub.title}
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        {item.megaMenu &&
                                                            item.megaMenu.map((section, secIndex) => (
                                                                <li key={secIndex}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            toggleSubMenu(`${index}-${secIndex}`)
                                                                        }
                                                                        className="flex w-full items-center justify-between py-1 font-medium text-gray-900"
                                                                    >
                                                                        {section.title} <ChevronDown size={16} />
                                                                    </button>
                                                                    {openSubMenu[`${index}-${secIndex}`] && (
                                                                        <ul className="mt-1 flex flex-col gap-1 pl-4">
                                                                            {section.subMenu.map((sub, subIndex) => (
                                                                                <li key={subIndex}>
                                                                                    <Link
                                                                                        href={sub.href || '#'}
                                                                                        className="block py-1 font-medium text-gray-700"
                                                                                        onClick={() => toggleMobileMenu?.()}
                                                                                    >
                                                                                        {sub.title}
                                                                                    </Link>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </li>
                                                            ))}
                                                    </ul>
                                                )}
                                            </>
                                        ) : (
                                            <Link
                                                href={item.href || '#'}
                                                className="block py-2 font-medium text-gray-900"
                                                onClick={() => toggleMobileMenu?.()}
                                            >
                                                {item.title}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-auto border-t border-gray-100 p-4">
                                {isLoggedIn ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white font-extrabold text-sm">
                                                {userInitials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-extrabold text-gray-900 leading-tight">
                                                    {session?.user?.name || 'User'}
                                                </p>
                                                {session?.user?.email && (
                                                    <p className="truncate text-xs text-gray-500 mt-0.5">
                                                        {session.user.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Link
                                                href="/dashboard"
                                                onClick={() => toggleMobileMenu?.()}
                                                className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-800 hover:bg-gray-50 transition"
                                            >
                                                <LayoutDashboard size={14} /> Dashboard
                                            </Link>
                                            <Link
                                                href="/orders"
                                                onClick={() => toggleMobileMenu?.()}
                                                className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-800 hover:bg-gray-50 transition"
                                            >
                                                <ShoppingBag size={14} /> Orders
                                            </Link>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSignOut}
                                            className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                                        >
                                            <LogOut size={14} /> Sign out
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Link
                                            href="/register"
                                            className={`flex items-center justify-center gap-3 rounded-md px-6 py-3 text-sm font-medium transition-all duration-200 hover:opacity-90 ${btnColor} ${btnlinkColor}`}
                                            onClick={() => toggleMobileMenu?.()}
                                        >
                                            Register
                                        </Link>
                                        <Link
                                            href="/login"
                                            className="flex items-center justify-center gap-3 rounded-md border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition"
                                            onClick={() => toggleMobileMenu?.()}
                                        >
                                            Login
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </>
    );
};

export default MenuBlock;
