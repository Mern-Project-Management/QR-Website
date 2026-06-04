"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Percent, FileText, Headphones, Truck, PhoneCall } from "react-feather";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { Skeleton } from "@/components/ui/Skeleton";

interface BulkPurchaseFaq {
  id: number;
  question: string;
  answer: string;
  sortOrder?: number;
}

const benefits = ["Special bulk pricing", "Priority Logistics ", "Dedicated Support"];

const highlights = [
  {
    icon: Percent,
    title: "Volume Pricing",
    description: "Flexible tiered discounts with savings up to 30% for high-quantity orders.",
  },
  {
    icon: FileText,
    title: "GST Compliant",
    description: "GST invoices, PO handling, and custom branding options for business orders.",
  },
  {
    icon: Headphones,
    title: "Custom Branding",
    description: "Custom branding options for business orders.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Expedited shipping and delivery window of 3-5 business days across major cities.",
  },
];

const fallbackFaqs: Pick<BulkPurchaseFaq, "question" | "answer">[] = [
  {
    question: "What is the minimum order quantity for bulk purchase?",
    answer:
      "Bulk pricing starts from 25 units. For larger quantities, our team can provide custom slabs and enterprise offers.",
  },
  {
    question: "How quickly can you deliver bulk orders?",
    answer:
      "Most bulk orders are dispatched within 24-48 hours and delivered within 3-5 business days based on location.",
  },
  {
    question: "Do you provide GST invoices and branded packaging?",
    answer:
      "Yes. We provide GST-compliant invoices and can support custom branding/packaging for eligible order sizes.",
  },
  {
    question: "Which payment methods are available for bulk orders?",
    answer:
      "We support UPI, cards, net banking, and bank transfer. For enterprise buyers, PO and invoiced payments can be discussed.",
  },
];

export default function BulkPurchasePage() {
  const [faqs, setFaqs] = useState<Pick<BulkPurchaseFaq, "question" | "answer">[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const response = await fetch("/api/public/bulk-purchase/faqs");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = (await response.json()) as {
          success?: boolean;
          data?: BulkPurchaseFaq[];
        };

        const items = Array.isArray(json.data)
          ? json.data
              .filter((item) => item.question?.trim() && item.answer?.trim())
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((item) => ({
                question: item.question.trim(),
                answer: item.answer.trim(),
              }))
          : [];

        setFaqs(items);
      } catch (error) {
        console.error("Error fetching bulk purchase FAQs:", error);
        setFaqs([]);
      } finally {
        setFaqsLoading(false);
      }
    };

    fetchFaqs();
  }, []);

  const displayFaqs = faqs.length > 0 ? faqs : fallbackFaqs;

  return (
    <>
      <div className="pt-24 pb-10 max-w-screen mx-auto font-dm">
        <PageTitle title="Bulk Purchase" subtitle="Special pricing for socities , teams and businesses">
          
        </PageTitle>
      </div>

      <section className="font-dm lg:pb-24 pb-12">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 rounded-2xl border border-gray-200 bg-white p-6 md:p-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-secondary px-3 py-1 text-sm font-medium text-brand-primary">
                <CheckCircle size={15} />
                Bulk Orders
              </span>
              <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mt-4 tracking-tight">
                Bulk Purchase for Everyone
              </h1>
              <p className="text-gray-600 text-lg mt-4 max-w-xl">
                Unlock special pricing for societies, corporate gifting, institutions, Businesses and reseller networks with
                dedicated support at every step.
              </p>

              <ul className="mt-6 space-y-3">
                {benefits.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-gray-800 font-medium">
                    <CheckCircle size={18} className="mt-0.5 text-brand-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/contact" label="Contact Us" bgColor="bg-brand-primary" textColor="text-white" />
                <Button href="/shop" label="Explore Products" bgColor="bg-brand-secondary" textColor="text-white" />
              </div>
            </div>

            <div className="rounded-2xl bg-home-one-gradient-banner border border-gray-200 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Why Clients choose our bulk program</h3>
                <p className="text-gray-700 mt-3">
                  Designed for procurement teams, event planners, resellers, and enterprise buyers who need reliable
                  delivery and predictable pricing.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="rounded-xl bg-white p-4 border border-gray-200">
                  
                  <p className="text-sm font-semibold text-brand-primary">Volume Pricing</p>
                </div>
                <div className="rounded-xl bg-white p-4 border border-gray-200">
                  
                  <p className="text-sm font-semibold text-brand-primary">Fast Delivery</p>
                </div>
                <div className="rounded-xl bg-white p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-brand-primary">GST Compliant</p>
                </div>
                <div className="rounded-xl bg-white p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-brand-primary">Dedicated Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="font-dm lg:pb-24 pb-12">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 text-center">Bulk Purchase Highlights</h2>
          <p className="text-gray-600 text-center mt-3 max-w-2xl mx-auto">
            Everything you need to place and manage bulk orders confidently.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="w-11 h-11 rounded-lg bg-brand-primary text-white flex items-center justify-center mb-4">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 mt-2 leading-7">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="font-dm lg:pb-24 pb-12">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl bg-brand-primary text-white p-7 md:p-10">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Ready to Scale?</h2>
              <p className="mt-3 text-white/90 max-w-2xl">
                Get custom pricing, dedicated support, and tailored fulfillment options for your organization.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/contact" label="Contact Us" bgColor="bg-white" textColor="text-brand-primary" />

              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 lg:sticky lg:top-24 h-fit">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0">
                  <PhoneCall size={16} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">Need immediate assistance?</p>
                  <p className="text-gray-600 mt-2">
                    Call or message our bulk support team for urgent order queries and fast quote turnaround.
                  </p>
                  <Link href="/contact" className="inline-block mt-3 text-brand-primary font-semibold hover:underline">
                    Contact support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="font-dm lg:pb-24 pb-14">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 text-center">Frequently Asked Questions</h2>
          <p className="text-gray-600 text-center mt-3 max-w-2xl mx-auto">
            Quick answers for common bulk order questions.
          </p>

          <div className="mt-8 space-y-4 max-w-4xl mx-auto">
            {faqsLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" rounded="md" />
                  <Skeleton className="h-4 w-full" rounded="md" />
                  <Skeleton className="h-4 w-5/6" rounded="md" />
                </div>
              ))
            ) : (
              displayFaqs.map((item, index) => (
                <details
                  key={`${item.question}-${index}`}
                  className="group rounded-xl border border-gray-200 bg-white p-5"
                  open={index === 0}
                >
                  <summary className="cursor-pointer list-none text-lg font-semibold text-gray-900 flex items-center justify-between">
                    {item.question}
                    <span className="ml-3 text-brand-primary group-open:rotate-45 transition-transform text-2xl leading-none">
                      +
                    </span>
                  </summary>
                  <p className="text-gray-600 mt-3 leading-7">{item.answer}</p>
                </details>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
