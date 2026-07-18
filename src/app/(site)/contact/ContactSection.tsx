"use client";

import { FormEvent, useState, useEffect } from "react";
import { ArrowUpRight } from "react-feather";
import { cn } from "@/lib/cn";

interface SectionData {
    tag_line?: string;
    parent_title?: string;
    parent_subtitle?: string;
    [key: string]: unknown;
}

export default function ContactSection({ embedded = false }: { embedded?: boolean }) {
    const [submitted, setSubmitted] = useState(false);
    const [sectionData, setSectionData] = useState<SectionData | null>(null);

    useEffect(() => {
        const fetchSectionData = async () => {
            try {
                const sectionRes = await fetch("/api/backend/feature-sections?section_name=contact_us");
                if (sectionRes.ok) {
                    const data = await sectionRes.json();
                    setSectionData(data);
                }
            } catch (err) {
                console.error("Error fetching contact_us section data:", err);
            }
        };

        fetchSectionData();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch("/api/backend/inquiries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setSubmitted(true);
                form.reset();
            } else {
                console.error("Failed to submit form");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    return (
        <div className="contact-wrap relative isolate font-dm">
            <section
                className={cn(
                    "bg-light-blue-banner border-b border-slate-200/60 pb-10 sm:pb-12 lg:pb-16",
                    embedded ? "pt-4 sm:pt-6 md:pt-8" : "pt-24 sm:pt-28 lg:pt-32"
                )}
            >
                <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 lg:items-start">
                        <div className="w-full lg:pr-8 xl:pr-12">
                            {(() => {
                                const title = sectionData?.parent_title || "Get in touch, let us know how we help";
                                const words = title.trim().split(" ");
                                const lastWord = words.length > 1 ? words.pop() : "";
                                const firstPart = words.join(" ");
                                return (
                                    <h2 className="text-4xl font-semibold tracking-tight text-gray-900 lg:text-5xl xl:text-6xl xl:leading-[1.05] lg:leading-[1.08] mb-5 mt-0">
                                        {firstPart} <span className="text-blue-900">{lastWord}</span>
                                    </h2>
                                );
                            })()}

                            <p className="text-base font-medium leading-relaxed text-gray-600 lg:pr-8 xl:pr-12 max-w-xl">
                                {sectionData?.parent_subtitle ||
                                    "Use the contact form to get in touch or email us at info@uitheme.net. We will get back to you asap. Want to know more about our platform?"}
                            </p>
                        </div>

                        <div className={cn("w-full", !embedded && "lg:sticky lg:top-28")}>
                            <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/[0.03] sm:p-8 lg:p-9">
                                <h4 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Connect with us</h4>
                                <p className="mt-2 text-[15px] font-medium leading-relaxed text-gray-600 sm:text-base">
                                    Tell us what you need—we usually reply within one business day.
                                </p>

                                <div className="mt-6">
                                    <form onSubmit={handleSubmit} id="contactForm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label
                                                    htmlFor="firstName"
                                                    className="block text-gray-900 text-base font-medium mb-2"
                                                >
                                                    First name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    name="firstName"
                                                    placeholder="Sophia etc."
                                                    required
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="lastName"
                                                    className="block text-gray-900 text-base font-medium mb-2"
                                                >
                                                    Last name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    name="lastName"
                                                    placeholder="Carter etc."
                                                    required
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label
                                                htmlFor="email"
                                                className="block text-gray-900 text-base font-medium mb-2"
                                            >
                                                Enter email address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                placeholder="support@gmail.com"
                                                required
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label
                                                htmlFor="phone"
                                                className="block text-gray-900 text-base font-medium mb-2"
                                            >
                                                Phone number
                                            </label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                name="phone"
                                                placeholder="9876543210"
                                                inputMode="numeric"
                                                maxLength={10}
                                                onInput={(e) => {
                                                    const input = e.currentTarget;
                                                    input.value = input.value.replace(/\D/g, "").slice(0, 10);
                                                }}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label
                                                htmlFor="inquiryType"
                                                className="block text-gray-900 text-base font-medium mb-2"
                                            >
                                                Inquiry type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="inquiryType"
                                                name="inquiryType"
                                                required
                                                defaultValue=""
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                                            >
                                                <option value="" disabled>
                                                    Select an inquiry type
                                                </option>
                                                <option value="general_inquiry">General Inquiry</option>
                                                <option value="bulk_purchase">Bulk Purchase</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div className="mb-4">
                                            <label
                                                htmlFor="message"
                                                className="block text-gray-900 text-base font-medium mb-2"
                                            >
                                                Put the message <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                id="message"
                                                name="message"
                                                rows={3}
                                                placeholder="Provide any details regarding your query …"
                                                required
                                                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                                            ></textarea>
                                        </div>

                                        <div>
                                            <button
                                                type="submit"
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-6 py-3 text-base font-medium text-white transition hover:bg-blue-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                                            >
                                                <span>Send message</span>
                                                <ArrowUpRight size={20} />
                                            </button>
                                        </div>
                                        {submitted && (
                                            <p className="bg-green-100 text-green-800 font-medium py-3 px-4  rounded-md mt-3">
                                                Form submitted successfully!
                                            </p>
                                        )}
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
