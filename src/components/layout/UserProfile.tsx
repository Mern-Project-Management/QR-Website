'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, ChevronDown, LogOut, ShoppingBag } from 'react-feather';
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

    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={
                    compact
                        ? 'flex items-center gap-1 rounded-lg px-1.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2 hover:bg-gray-100 transition-colors'
                        : 'flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors'
                }
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                    <User size={16} className="text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                    {session.user.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''} ${compact ? 'hidden sm:block' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {/* User Info */}
                    <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                        <p className="text-xs text-gray-500">{session.user.email}</p>
                    </div>

                    {/* Menu Items */}
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/dashboard');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                        <LayoutDashboard size={14} />
                        <span>Dashboard</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/orders');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                        <ShoppingBag size={14} />
                        <span>My Orders</span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                    </button>
                </div>
            )}
        </div>
    );
}