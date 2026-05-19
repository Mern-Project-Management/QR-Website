'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, ShoppingBag } from 'react-feather';
import { LayoutDashboard } from 'lucide-react';

type UserProfileProps = { variant?: 'default' | 'headerMobile' };

export default function UserProfile({ variant = 'default' }: UserProfileProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut({ redirect: false });
        router.push('/');
    };

    if (!session?.user) {
        return null;
    }

    const compact = variant === 'headerMobile';
    const initials = session.user.name
        ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 rounded-xl transition-all duration-200 active:scale-95 ${
                    compact
                        ? 'p-1 hover:bg-gray-100'
                        : 'px-2.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 shadow-sm'
                }`}
            >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-900 text-white font-extrabold text-xs shadow-sm">
                    {initials}
                </div>
                {!compact && (
                    <span className="hidden md:block text-xs font-bold text-gray-700 max-w-[100px] truncate">
                        {session.user.name || 'User'}
                    </span>
                )}
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-900' : ''} ${compact ? 'hidden sm:block' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-2xl shadow-2xl border border-gray-100/90 py-1.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-250">
                    {/* User Info Header */}
                    <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-900 text-white font-extrabold text-sm shadow-md shadow-blue-900/10">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold text-gray-900 truncate leading-tight">{session.user.name}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{session.user.email}</p>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1 space-y-0.5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/dashboard');
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-gray-600 hover:text-blue-900 hover:bg-blue-50/50 rounded-xl flex items-center gap-3 transition-all"
                        >
                            <LayoutDashboard size={16} className="text-gray-400" />
                            <span>Dashboard</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/orders');
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-gray-600 hover:text-blue-900 hover:bg-blue-50/50 rounded-xl flex items-center gap-3 transition-all"
                        >
                            <ShoppingBag size={16} className="text-gray-400" />
                            <span>My Orders</span>
                        </button>

                        <div className="border-t border-gray-100 my-1 mx-2"></div>

                        <button
                            onClick={handleSignOut}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50/80 hover:text-rose-700 rounded-xl flex items-center gap-3 transition-all"
                        >
                            <LogOut size={16} className="text-rose-400" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}