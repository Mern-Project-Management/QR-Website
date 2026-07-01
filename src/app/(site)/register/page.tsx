"use client";
import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { safeImageSrc } from '@/lib/safeImageSrc';
import { CUSTOMER_REGISTER_REQUEST_OTP, CUSTOMER_REGISTER_VERIFY_OTP } from '@/lib/customerAuthPaths';
import { redirectAfterAuth, resolveCallbackUrl } from '@/lib/authRedirect';

/* ─────────────────────────────────────────────
   SVG Illustration  (SVG attrs are not CSS —
   fill/stroke props on SVG elements are fine)
───────────────────────────────────────────── */
function RegisterIllustration() {
    return (
        <svg
            viewBox="0 0 480 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto block w-full max-w-[380px]"
        >
            <rect x="40" y="50" width="400" height="300" rx="28" fill="white" fillOpacity=".05" stroke="white" strokeOpacity=".1" strokeWidth="1.5" />
            <rect x="55" y="55" width="380" height="40" rx="8" fill="white" fillOpacity=".04" />
            <circle cx="240" cy="148" r="56" fill="url(#aG)" />
            <circle cx="240" cy="134" r="24" fill="white" fillOpacity=".88" />
            <ellipse cx="240" cy="175" rx="38" ry="22" fill="white" fillOpacity=".88" />
            <rect x="278" y="104" width="76" height="28" rx="14" fill="#22c55e" />
            <text x="291" y="122" fontFamily="sans-serif" fontSize="10.5" fill="white" fontWeight="700">✓ Verified</text>
            <circle cx="100" cy="95" r="4" fill="#818cf8" fillOpacity=".5" />
            <circle cx="380" cy="90" r="6" fill="#a78bfa" fillOpacity=".4" />
            <circle cx="88" cy="300" r="5" fill="#6366f1" fillOpacity=".45" />
            <circle cx="392" cy="310" r="9" fill="#8b5cf6" fillOpacity=".35" />
            <rect x="80" y="218" width="320" height="13" rx="6.5" fill="white" fillOpacity=".12" />
            <rect x="80" y="242" width="260" height="13" rx="6.5" fill="white" fillOpacity=".08" />
            <rect x="80" y="266" width="295" height="13" rx="6.5" fill="white" fillOpacity=".08" />
            <rect x="80" y="298" width="320" height="38" rx="12" fill="url(#bG)" />
            <text x="240" y="322" fontFamily="sans-serif" fontSize="12.5" fill="white" fontWeight="700" textAnchor="middle" letterSpacing="2">CREATE ACCOUNT</text>
            <circle cx="240" cy="148" r="74" stroke="white" strokeOpacity=".07" strokeWidth="1" strokeDasharray="5 7" />
            <defs>
                <linearGradient id="aG" x1="184" y1="92" x2="296" y2="204" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#818cf8" />
                    <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="bG" x1="80" y1="298" x2="400" y2="336" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
            </defs>
        </svg>
    );
}

/* ─────────────────────────────────────────────
   Step indicator
───────────────────────────────────────────── */
function StepIndicator({ step }: { step: 1 | 2 }) {
    return (
        <div className="flex items-center gap-3 m-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${step >= 1 ? 'bg-brand-primary text-white shadow-brand-primary/30' : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-white/40'}`}>1</div>
            <div className={`h-px flex-1 transition-all duration-500 ${step >= 2 ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-white/10'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${step >= 2 ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-white/40'}`}>2</div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Reusable Field
───────────────────────────────────────────── */


/* ─────────────────────────────────────────────
   Spinner
───────────────────────────────────────────── */
function Spinner() {
    return (
        <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </span>
    );
}



/* ─────────────────────────────────────────────
   Main Content
───────────────────────────────────────────── */
function RegisterContent() {
    const { status } = useSession();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState<null | 'send' | 'verify' | 'resend'>(null);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', otp: '' });
    const [error, setError] = useState<string>('');
    const [info, setInfo] = useState<string>('');
    const [resendIn, setResendIn] = useState<number>(0);
    const otpRef = useRef<HTMLInputElement | null>(null);
    const redirectingRef = useRef(false);

    const callbackUrl = resolveCallbackUrl(searchParams.get('callbackUrl'));

    const completeAuthRedirect = useCallback(async () => {
        if (redirectingRef.current) return;
        redirectingRef.current = true;
        await redirectAfterAuth(callbackUrl);
    }, [callbackUrl]);

    useEffect(() => {
        if (status === 'authenticated') {
            void completeAuthRedirect();
        }
    }, [status, completeAuthRedirect]);

    useEffect(() => {
        if (showOtpInput) setTimeout(() => otpRef.current?.focus(), 0);
    }, [showOtpInput]);

    useEffect(() => {
        if (!resendIn) return;
        const t = setInterval(() => {
            setResendIn((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(t);
    }, [resendIn]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading('send');
        try {
            const res = await fetch(CUSTOMER_REGISTER_REQUEST_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.name, email: formData.email, phone: formData.phone }),
            });
            console.log(res);

            const text = await res.text();
            const data = (() => { try { return JSON.parse(text); } catch { return null; } })();

            if (res.ok) {
                setShowOtpInput(true);
                setResendIn(60);
                setInfo((data && data.message) || "OTP sent. Please check your email.");
            } else {
                setError((data && data.message) || text || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError('Registration failed');
        } finally {
            setLoading(null);
        }
    };

    const handleOtpVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading('verify');
        try {
            const otp = formData.otp.replace(/\D/g, '').slice(0, 6);
            const verifyRes = await fetch(CUSTOMER_REGISTER_VERIFY_OTP, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email, otp }),
            });
            const verifyText = await verifyRes.text();
            const verifyData = (() => { try { return JSON.parse(verifyText); } catch { return null; } })() as null | { message?: string; token?: string; accessToken?: string; jwt?: string; user?: unknown; data?: unknown };
            if (!verifyRes.ok) {
                setError((verifyData && (verifyData as { message?: string }).message) || verifyText || "Invalid OTP. Please try again.");
                return;
            }

            const token =
                (verifyData && ((verifyData as { token?: string }).token || (verifyData as { accessToken?: string }).accessToken || (verifyData as { jwt?: string }).jwt)) ||
                (verifyData && (verifyData as { data?: { token?: string; accessToken?: string; jwt?: string } }).data?.token) ||
                (verifyData && (verifyData as { data?: { token?: string; accessToken?: string; jwt?: string } }).data?.accessToken) ||
                (verifyData && (verifyData as { data?: { token?: string; accessToken?: string; jwt?: string } }).data?.jwt) ||
                null;

            const user =
                (verifyData && (verifyData as { user?: unknown }).user) ||
                (verifyData && (verifyData as { data?: { user?: unknown } }).data?.user) ||
                null;

            const result = await signIn('credentials', {
                redirect: false,
                email: formData.email,
                otp,
                passthrough: "true",
                accessToken: token || "",
                user: user ? JSON.stringify(user) : "",
            });
            if (result?.error) {
                setError(result.error === "CredentialsSignin" ? "Registration succeeded, but sign-in failed. Please login." : result.error);
                return;
            }
            if (result?.ok) {
                setInfo('Account ready. Redirecting…');
                await completeAuthRedirect();
            }
        } catch (error) {
            console.error('OTP verification error:', error);
            setError('OTP verification failed');
        } finally {
            setLoading(null);
        }
    };

    const handleResendOtp = async () => {
        if (resendIn > 0) return;
        setError('');
        setInfo('');
        setLoading('resend');
        try {
            const res = await fetch(CUSTOMER_REGISTER_REQUEST_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.name, email: formData.email, phone: formData.phone }),
            });
            const text = await res.text();
            const data = (() => { try { return JSON.parse(text); } catch { return null; } })();
            if (res.ok) {
                setResendIn(60);
                setInfo((data && data.message) || 'OTP resent successfully');
            } else {
                setError((data && data.message) || text || 'Failed to resend OTP');
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            setError('Failed to resend OTP');
        } finally {
            setLoading(null);
        }
    };

    // Session loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a1a]">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
        );
    }


    const field = (
        id: string, label: string, type: string, placeholder: string,
        value: string, onChange: (v: string) => void, extra?: object
    ) => (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-xs font-semibold tracking-widest uppercase text-gray-500 dark:text-white/50">{label}</label>
            <input
                id={id} type={type} placeholder={placeholder} value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20
                           focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-white/8 focus:ring-1 focus:ring-blue-500/50
                           transition-all duration-200 text-sm shadow-sm dark:shadow-none"
                {...extra}
            />
        </div>
    );

    return (
        /* ── Page wrapper — mesh gradient background via Tailwind arbitrary values ── */
        <div className="relative flex min-h-[80%] items-center justify-center bg-home-one-gradient-banner px-4 pb-20 pt-28 lg:pt-32">
            <div className="pointer-events-none absolute inset-0 bg-auth-image-one bg-cover bg-center opacity-[0.08]" />

            {/* ── Card ── */}
            <div className="relative z-10 flex w-full max-w-5xl mt-6 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.10)] lg:flex-row">

                {/* ════════════════════════════
                    LEFT PANEL
                ════════════════════════════ */}
                <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-gray-900 p-12 lg:flex lg:w-[45%]">

                    {/* Dot grid overlay */}
                    <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle,rgba(255,255,255,0.065)_1px,transparent_1px)] [background-size:28px_28px]" />

                    {/* Radial glow overlays */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_30%_30%,rgba(129,140,248,0.18),transparent),radial-gradient(ellipse_50%_50%_at_70%_70%,rgba(167,139,250,0.14),transparent)]" />

                    {/* Corner blur blob */}
                    <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-[60px]" />

                    {/* Content */}
                    <div className="relative z-10 flex w-full flex-col items-center gap-8">

                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 self-start">
                            {/* <LogoMark size="md" /> */}
                            <Image
                                src={safeImageSrc("/images/logo/combined-logo-white.png")}
                                alt="odokho"
                                width={160}
                                height={40}
                                className="h-7 w-auto object-contain"
                                priority
                            />
                        </Link>

                        {/* Floating illustration */}
                        <div className="w-full animate-[float_5s_ease-in-out_infinite] [animation-name:float]">
                            <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
                            <RegisterIllustration />
                        </div>

                        {/* Heading */}
                        <div className="space-y-3 text-center">
                            <h2 className="font-display text-2xl font-bold leading-snug text-white">
                                Join thousands of<br />happy members
                            </h2>
                            <p className="mx-auto max-w-[270px] text-sm leading-relaxed text-white/40">
                                Create your account in seconds and unlock everything we offer.
                            </p>
                        </div>

                        {/* Social proof */}
                        {/* <div className="flex items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.05] px-5 py-3">
                            <div className="flex">
                                {[
                                    { bg: 'bg-blue-400', letter: 'A' },
                                    { bg: 'bg-blue-400', letter: 'D' },
                                    { bg: 'bg-violet-300', letter: 'G' },
                                    { bg: 'bg-blue-500', letter: 'J' },
                                ].map(({ bg, letter }, i) => (
                                    <div
                                        key={letter}
                                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1e1b4b] text-[10px] font-bold text-white ${bg} ${i !== 0 ? '-ml-2' : ''}`}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white">12,000+ members</p>
                                <p className="text-[10px] text-white/35">growing every day</p>
                            </div>
                        </div> */}
                    </div>
                </div>

                {/* ════════════════════════════
                    RIGHT PANEL
                ════════════════════════════ */}
                <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 bg-white rounded-r-3xl">

                    {/* Mobile logo */}
                    <Link href="/" className="flex items-center gap-3 mb-8 lg:hidden">
                        <div className="h-10 w-10 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <Image
                                src={safeImageSrc("/images/logo/combined-logo-white.png")}
                                alt="odokho"
                                width={48}
                                height={48}
                                className="h-full w-full object-contain p-2"
                                priority
                            />
                        </div>
                        <Image
                            src={safeImageSrc("/images/logo/combined-logo.png")}
                            alt="odokho"
                            width={160}
                            height={40}
                            className="h-7 w-auto object-contain"
                            priority
                        />
                    </Link>

                    {/* Step indicator */}
                    <StepIndicator step={showOtpInput ? 2 : 1} />

                    {/* Heading */}
                    <div className="mb-7">
                        <h1 className="font-display text-3xl font-extrabold text-gray-900 dark:text-white mb-1.5">
                            {showOtpInput ? 'Verify your email' : 'Create account'}
                        </h1>
                        <p className="text-gray-500 dark:text-white/40 text-sm">
                            {showOtpInput
                                ? `Enter the 6-digit code sent to ${formData.email}`
                                : 'Fill in your details to get started for free'}
                        </p>
                    </div>

                    {(error || info) && (
                        <div className={`mb-5 rounded-2xl border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
                            {error || info}
                        </div>
                    )}

                    {/* ── REGISTER FORM ── */}
                    {!showOtpInput ? (
                        <form onSubmit={handleRegister} className="space-y-4">
                            {field(
                                "name", "Full Name", "text", "John Doe",
                                formData.name, (v) => setFormData({ ...formData, name: v }), { required: true }
                            )}
                            {field(
                                "email", "Email Address", "email", "you@example.com",
                                formData.email, (v) => setFormData({ ...formData, email: v }), { required: true }
                            )}
                            {field(
                                "phone", "Phone Number", "tel", "+1 (555) 000-0000",
                                formData.phone, (v) => setFormData({ ...formData, phone: v }), { required: true }
                            )}

                            {/* Terms */}
                            <div className="pt-1">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input type="checkbox" required
                                        className="mt-0.5 w-4 h-4 rounded accent-blue-500 cursor-pointer" />
                                    <span className="text-xs text-gray-500 dark:text-white/40 group-hover:text-gray-700 dark:group-hover:text-white/60 transition-colors leading-relaxed">
                                        I agree to the{' '}
                                        <Link href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2">Privacy Policy</Link>
                                        {' '}and{' '}
                                        <Link href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2">Terms of Service</Link>
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={!!loading}
                                className="mt-1 w-full rounded-xl bg-brand-primary py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_26px_rgba(37,99,235,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(37,99,235,0.26)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading === 'send' ? <Spinner /> : 'Create Account →'}
                            </button>
                        </form>
                    ) : (
                        /* ── OTP FORM ── */
                        <form onSubmit={handleOtpVerification} className="space-y-5">

                            {/* OTP notice */}
                            <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-4 flex gap-3 items-start">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" stroke="#6366f1" className="dark:stroke-[#818cf8]" strokeWidth="2" />
                                        <path d="M22 6l-10 7L2 6" stroke="#6366f1" className="dark:stroke-[#818cf8]" strokeWidth="2" />
                                    </svg>
                                </div>
                                <p className="text-blue-900 dark:text-blue-300 text-sm leading-relaxed">
                                    Check your inbox at <strong className="text-blue-700 dark:text-blue-200">{formData.email}</strong> for your one-time code.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="otp" className="block text-xs font-semibold tracking-widest uppercase text-gray-500 dark:text-white/50">6-Digit Code</label>
                                <input
                                    id="otp" type="text" placeholder="••••••"
                                    ref={otpRef}
                                    value={formData.otp} maxLength={6} required
                                    onChange={e => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                    className="otp-input w-full px-4 py-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/15
                                               focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-transparent focus:ring-1 focus:ring-blue-500/50 transition-all duration-200"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!!loading}
                                className="w-full rounded-xl bg-brand-primary py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_26px_rgba(37,99,235,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(37,99,235,0.26)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading === 'verify' ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verifying…
                                    </span>
                                ) : 'Verify OTP →'}
                            </button>

                            <div className="flex items-center justify-between text-sm pt-1">
                                <button type="button" onClick={handleResendOtp} disabled={!!loading || resendIn > 0}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition disabled:opacity-50 text-xs">
                                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                                </button>
                                <button type="button" onClick={() => { setShowOtpInput(false); setFormData({ ...formData, otp: '' }); setError(''); setInfo(''); }}
                                    className="text-gray-500 dark:text-white/30 hover:text-gray-800 dark:hover:text-white/60 font-medium transition text-xs">
                                    ← Back
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Divider */}
                    {/* <div className="flex items-center gap-4 my-7">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
                        <span className="text-gray-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">or continue with</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
                    </div> */}

                    {/* Social buttons */}
                    {/* <div className="flex gap-3">
                        <button type="button" className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-200 shadow-sm dark:shadow-none text-sm font-medium">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span className="font-semibold text-gray-700 dark:text-white/70 text-xs">Google</span>
                        </button>
                        <button type="button" className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-200 shadow-sm dark:shadow-none text-sm font-medium">
                            <svg className="w-4 h-4 fill-gray-800 dark:fill-white/80" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                            </svg>
                            <span className="font-semibold text-gray-700 dark:text-white/70 text-xs">GitHub</span>
                        </button>
                    </div> */}

                    {/* Sign in link */}
                    <p className="text-center text-gray-500 dark:text-white/30 text-sm mt-8">
                        Already have an account?{' '}
                        <Link
                            href={`/login?callbackUrl=${searchParams.get('callbackUrl') || '/'}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition underline underline-offset-2">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterContent />
        </Suspense>
    );
}