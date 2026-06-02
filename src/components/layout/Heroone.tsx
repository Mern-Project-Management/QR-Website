"use client";
import { useState, useEffect } from "react";
import Button from "../ui/Button";
import Image, { StaticImageData } from "next/image";
import TopCarousel from "../ui/TopCarousel";
import { Skeleton } from "../ui/Skeleton";
import { resolveBackendImageSrc } from "@/lib/resolveBackendImageSrc";
import img from "../../../public/images/right-banner-bg.webp";
import shap from "../../../public/images/shap1.webp";

interface HeroContent {
  id?: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  primary_button_text?: string;
  primary_button_href?: string;
  secondary_button_text?: string;
  secondary_button_href?: string;
  stats_text?: string;
  stats_subtext?: string;
  carousel_items?: string;
  avatar1_url?: string;
  avatar2_url?: string;
  avatar3_url?: string;
  main_image_url?: string;
  decorative_image_url?: string;
  floating_icon_type?: string;
  is_active?: boolean;
  sort_order?: number;
}

export const resolveImageUrl = (url: string | null | undefined, fallback: string | StaticImageData) => {
  return resolveBackendImageSrc(url, fallback);
};




export default function HeroOne() {
  const [heroData, setHeroData] = useState<HeroContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeroContent = async () => {
      try {
        const response = await fetch(`/api/backend/hero-content`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Data comes as an array; prefer active items and honor sort_order.
        if (Array.isArray(data) && data.length > 0) {
          const list = data as HeroContent[];
          const active = list.filter((x) => x && x.is_active === true);
          const sorted = (active.length ? active : list).slice().sort((a, b) => (Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)));
          setHeroData(sorted[0] || null);
        }
      } catch (err) {
        console.error('Error fetching hero content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchHeroContent();
  }, []);


  // console.log(resolveImageUrl(heroData?.main_image_url, img));

  // Fallback content when API fails or loading
  const fallbackContent = {
    badge: "Online program is now available",
    title: "Empowering <span className='text-brand-primary'>Superior</span> results by thinking",
    subtitle: "When you join our journey, you are choosing a partner who believes in a healthier, more balanced you — and works tirelessly to help you get there.",
    primary_button_text: "",
    primary_button_href: "",
    secondary_button_text: "Buy Now",
    secondary_button_href: "/about",
    stats_text: "7.65m+",
    stats_subtext: "Content Creators and Teams",
    carousel_items: '["Affordable2 & scalable plans", "Plans that fit every stage", "Built to scale with your needs"]',
    avatar1_url: "/images/avater-11.webp",
    avatar2_url: "/images/avater-12.webp",
    avatar3_url: "/images/avater-13.webp",
    main_image_url: "/images/right-banner-bg.webp",
    decorative_image_url: "/images/text-icon.png",
    floating_icon_type: "boxes"
  };

  const content = heroData || fallbackContent;

  // Parse carousel items from string to array
  const carouselItems = content.carousel_items
    ? JSON.parse(content.carousel_items)
    : ["Affordable & scalable plans", "Plans that fit every stage", "Built to scale with your needs"];

  if (loading) {
    return (
      <div className="banner-wrap relative overflow-x-hidden bg-home-one-gradient-banner pb-10 pt-28 font-dm lg:pb-16 lg:pt-20">
        <div className="mx-auto max-w-screen-xl min-w-0 px-3 pb-0 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
          <div className="grid min-h-[20rem] grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
            <div className="flex flex-col justify-center gap-4 pt-2">
              <Skeleton className="h-8 w-40 rounded-full" rounded="full" />
              <Skeleton className="h-14 w-full max-w-xl" rounded="lg" />
              <Skeleton className="h-14 w-full max-w-lg" rounded="lg" />
              <Skeleton className="h-6 w-full max-w-md" rounded="md" />
              <div className="flex flex-wrap gap-3 pt-4">
                <Skeleton className="h-12 w-36" rounded="lg" />
                <Skeleton className="h-12 w-36" rounded="lg" />
              </div>
            </div>
            <Skeleton className="min-h-[280px] w-full self-center rounded-2xl lg:min-h-[340px]" rounded="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Hero content error:', error);
    // Still render with fallback content
  }

  return (
    <div className="banner-wrap relative overflow-x-hidden bg-home-one-gradient-banner pb-8 pt-24 font-dm sm:pb-10 sm:pt-28 lg:pb-16 lg:pt-20">
      <Image
        src={shap}
        alt=""
        width={800}
        height={600}
        className="pointer-events-none absolute top-0 left-1/2 max-h-[min(80vw,28rem)] w-auto max-w-[100vw] -translate-x-1/2 object-cover object-center opacity-20"
      />
      <div className="mx-auto max-w-screen-xl min-w-0 px-4 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3 pb-0">
        <div className="relative z-10 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 lg:pt-6">
          {/* left side */}
          <div className="flex h-full w-full min-w-0 items-center xl:pr-8">
            <div className="flex min-w-0 flex-col">
              {/* Badge */}
              <div>
                {/* <span className="inline-block py-2 px-3 rounded-full border border-brand-secondary bg-white text-sm text-brand-primary font-medium aos-init aos-animate" data-aos="fade-up" data-aos-duration="200">
                  {content.badge}
                </span> */}
              </div>

              {/* Heading */}
              <h1
                className="break-words text-balance text-gray-900 font-semibold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[80px] mt-2 mb-3 tracking-tight lg:tracking-tighter aos-init aos-animate [overflow-wrap:anywhere]"
                data-aos="fade-up"
                data-aos-duration="400"
                dangerouslySetInnerHTML={{ __html: content.title || fallbackContent.title }}
              />
              <p className="font-medium text-gray-900 max-w-xl lg:pr-10 text-base sm:text-lg aos-init aos-animate" data-aos="fade-up" data-aos-duration="500">
                {content.subtitle}
              </p>

              {/* CTA Buttons — mobile: full-width pills, label + icon grouped; desktop: inline */}
              <div className="flex w-full flex-col gap-3 pt-5 pb-2 sm:flex-row sm:items-center sm:gap-4 md:gap-5 sm:pt-6">
                <Button
                  href={content.secondary_button_href || fallbackContent.secondary_button_href}
                  label={content.secondary_button_text || fallbackContent.secondary_button_text}
                  bgColor="bg-brand-primary"
                  textColor="text-white"
                  padding="py-3.5 px-5 sm:py-4 sm:px-6"
                  className="w-full !rounded-full text-center text-[15px] font-semibold tracking-tight shadow-md sm:w-auto sm:!rounded-xl sm:text-base"
                />
                {/* <Button
                  href={content.primary_button_href?.startsWith('/')
                    ? content.primary_button_href
                    : `/${content.primary_button_href}` || fallbackContent.primary_button_href}

                  label={content.primary_button_text || fallbackContent.primary_button_text}
                  bgColor="bg-brand-secondary"
                  textColor="text-white"
                  padding="py-3.5 px-5 sm:py-4 sm:px-6"
                  className="w-full !rounded-full text-center text-[15px] font-semibold tracking-tight shadow-md sm:w-auto sm:!rounded-xl sm:text-base"
                /> */}
              </div>

              {/* Decorative Image */}
              <div data-aos="zoom-in" data-aos-duration="300" className="aos-init aos-animate">
                {/* <Image
                  src={resolveImageUrl(content.decorative_image_url, fallbackContent.decorative_image_url)}
                  alt="text"
                  className="relative left-5"
                  width={299}
                  height={70}
                  loading="eager"
                /> */}
              </div>
            </div>
          </div>

          {/* right side */}
          <div className="w-full min-w-0">
            <div className="relative min-w-0 overflow-hidden rounded-xl lg:overflow-visible aos-init aos-animate" data-aos="fade-up" data-aos-duration="600">
              {/* Main Image */}
              <Image
                src={resolveImageUrl(content.main_image_url, img)}
                alt="banner"
                decoding="async"
                loading="eager"
                width={637}
                height={721}
                className="w-full rounded-xl"
                priority
              />

              {/* Floating Icon */}
              {/* <div className="absolute top-16 left-0 -translate-x-1/2 hidden lg:flex">
                <div className="w-16 h-16 rounded-xl bg-lime-300 flex items-center justify-center text-center">
                  <Boxes size={34} strokeWidth="1.5" />
                </div>
              </div> */}

              {/* Avatar Group */}
              {/* <div className="absolute top-4 -right-8 bg-white rounded-xl border border-gray-200 shadow-sm p-3 gap-4 mt-4 hidden lg:flex flex-row items-center aos-init aos-animate" data-aos="fade-up" data-aos-duration="400" data-delay="400">
                <div className="flex -space-x-4">
                  <Image
                    src={resolveImageUrl(content.avatar1_url, "")}
                    width={48}
                    height={48}
                    alt="member-avatar"
                    className="w-11 h-11 rounded-full"
                    loading="lazy"
                  />
                  <Image
                    src={resolveImageUrl(content.avatar2_url, "")}
                    width={48}
                    height={48}
                    alt="member-avatar"
                    className="w-11 h-11 rounded-full"
                    loading="lazy"
                  />
                  <Image
                    src={resolveImageUrl(content.avatar3_url, "")}
                    width={48}
                    height={48}
                    alt="member-avatar"
                    className="w-11 h-11 rounded-full"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col leading-tight text-gray-900 font-semibold text-2xl">
                  {content.stats_text || fallbackContent.stats_text}
                  <span className="block text-base font-medium text-gray-800">
                    {content.stats_subtext || fallbackContent.stats_subtext}
                  </span>
                </div>
              </div> */}

              {/* topslider */}
              <TopCarousel
                items={carouselItems}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}