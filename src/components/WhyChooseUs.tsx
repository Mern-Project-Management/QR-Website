'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  LayoutDashboard,
  Moon,
  QrCode,
  Shield,
  Sparkles,
} from 'lucide-react';
import { resolveBackendImageSrc } from '@/lib/resolveBackendImageSrc';

interface WhyChooseUsItem {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SectionData {
  tag_line?: string;
  parent_title?: string;
  parent_subtitle?: string;
  [key: string]: unknown;
}

/** Pastel icon tiles — distinct from How it works section but same layout language. */
const FEATURE_THEMES: { Icon: LucideIcon; boxClass: string }[] = [
  { Icon: QrCode, boxClass: 'bg-blue-100 text-blue-600' },
  { Icon: Shield, boxClass: 'bg-purple-100 text-purple-600' },
  { Icon: Moon, boxClass: 'bg-cyan-100 text-cyan-600' },
  { Icon: Bell, boxClass: 'bg-orange-100 text-orange-600' },
  { Icon: Sparkles, boxClass: 'bg-green-100 text-green-600' },
  { Icon: LayoutDashboard, boxClass: 'bg-pink-100 text-pink-600' },
];

function gridClassForCount(count: number): string {
  if (count <= 0) {
    return 'grid grid-cols-1 gap-5 sm:gap-6';
  }
  if (count === 1) {
    return 'grid grid-cols-1 gap-5 sm:gap-6 max-w-md mx-auto';
  }
  if (count === 2) {
    return 'grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 max-w-3xl mx-auto';
  }
  if (count === 3) {
    return 'grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto';
  }
  if (count === 4) {
    return 'grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 max-w-4xl mx-auto';
  }
  if (count === 5) {
    return 'grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto';
  }
  return 'grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto';
}

const fallbackData: WhyChooseUsItem[] = [
  {
    id: '1',
    image: '',
    title: 'Smart QR Codes',
    subtitle:
      'Category-wise QR designs for vehicles, pets & miscellaneous assets with unique 6-digit codes.',
    is_active: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    image: '',
    title: 'Masked Calling',
    subtitle:
      'Privacy-first communication — real phone numbers are never exposed to scanners.',
    is_active: true,
    sort_order: 1,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    image: '',
    title: 'DND Controls',
    subtitle:
      'Time-based Do Not Disturb per asset. Hide calling options while keeping WhatsApp/SMS available.',
    is_active: true,
    sort_order: 2,
    created_at: '',
    updated_at: '',
  },
  {
    id: '4',
    image: '',
    title: 'Emergency Alerts',
    subtitle:
      'OTP-verified emergency flow with instant SMS to all emergency contacts with location.',
    is_active: true,
    sort_order: 3,
    created_at: '',
    updated_at: '',
  },
  {
    id: '5',
    image: '',
    title: 'Lifetime Validity',
    subtitle:
      'QR codes remain valid forever with unlimited scans. No expiration dates or renewal needed.',
    is_active: true,
    sort_order: 4,
    created_at: '',
    updated_at: '',
  },
  {
    id: '6',
    image: '',
    title: 'Multi-Asset Profiles',
    subtitle:
      'One profile, unlimited assets. Manage all your vehicles, pets & items from a single dashboard.',
    is_active: true,
    sort_order: 5,
    created_at: '',
    updated_at: '',
  },
];

export default function WhyChooseUs() {
  const [whyChooseUsData, setWhyChooseUsData] = useState<WhyChooseUsItem[]>([]);
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWhyChooseUs = async () => {
      try {
        const sectionRes = await fetch('/api/backend/feature-sections?section_name=why_choose_us');
        if (sectionRes.ok) {
          const sData = await sectionRes.json();
          setSectionData(sData);
        }

        const response = await fetch(`/api/backend/why-choose-us`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const activeItems = Array.isArray(data)
          ? data
            .filter((item: WhyChooseUsItem) => item.is_active)
            .sort((a: WhyChooseUsItem, b: WhyChooseUsItem) => a.sort_order - b.sort_order)
          : [];

        setWhyChooseUsData(activeItems);
      } catch (err) {
        console.error('Error fetching why choose us data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchWhyChooseUs();
  }, []);

  const displayData =
    whyChooseUsData.length > 0 ? whyChooseUsData : fallbackData;
  const gridClass = gridClassForCount(displayData.length);

  if (loading) {
    return (
      <section
        id="why_choose_us"
        className="bg-home-one-gradient-banner px-4 py-12 sm:px-6 md:py-16 lg:px-8"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 text-center sm:mb-10">
            <div className="mx-auto h-8 w-56 animate-pulse rounded-lg bg-gray-200" />
            <div className="mx-auto mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-gray-100" />
          </div>
          <div className={gridClassForCount(6)}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-gray-100 sm:h-28"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error('Why choose us error:', error);
  }

  const title = sectionData?.parent_title || 'Why Choose Us';
  const subtitle =
    sectionData?.parent_subtitle ||
    'Everything you need for secure, privacy-first QR code communication.';
  const words = title.trim().split(/\s+/);
  const lastWord = words.length > 1 ? words.pop() : '';
  const firstPart = words.join(' ');

  return (
    <section
      id="why_choose_us"
      className="bg-home-one-gradient-banner px-4 py-12 text-gray-900 sm:px-6 md:py-16 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div
          className="mb-8 text-center sm:mb-10"
          data-aos="fade-up"
          data-aos-duration="300"
        >
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900 sm:mb-3 sm:text-3xl md:text-4xl">
            {firstPart}{' '}
            {lastWord ? (
              <span className="text-brand-primary">{lastWord}</span>
            ) : null}
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-600 sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className={gridClass}>
          {displayData.map((feature, index) => {
            const { Icon, boxClass } =
              FEATURE_THEMES[index % FEATURE_THEMES.length];
            return (
              <div
                key={feature.id}
                className="flex flex-row items-start gap-3 rounded-xl border border-gray-100/80 bg-gray-50 p-4 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:gap-3.5"
                data-aos="fade-up"
                data-aos-delay={Math.min(index * 80, 400)}
                data-aos-duration="350"
              >
                {feature.image ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveBackendImageSrc(feature.image, '') as string}
                      alt={feature.title || 'Why choose us'}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${boxClass}`}
                    aria-hidden
                  >
                    <Icon
                      className="h-[18px] w-[18px] sm:h-5 sm:w-5"
                      strokeWidth={2}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-snug text-gray-900 sm:text-base">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 sm:text-sm sm:leading-relaxed">
                    {feature.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
