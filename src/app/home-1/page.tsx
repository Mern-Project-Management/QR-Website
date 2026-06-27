"use client";


import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PageTitle3 from '@/components/ui/PageTitle3';
import Button from '@/components/ui/Button';
import PriceCard from "@/components/ui/PriceCard";
import Image from "next/image";
import CounterCarousel from "@/components/ui/MainSlider";
import maincarsoul from "@/data/maincarsoul.json";
import videoTestimonials from "@/data/video-testimonials.json";
import HeroOne from "@/components/layout/Heroone";
import { Car, PawPrint, Package } from "lucide-react";
import { Zap } from "react-feather";
import FeatureCard from "@/components/ui/FeatureCard4";
import PageTitle2 from "@/components/ui/PageTitle2";
import ContactSection from "../(site)/contact/ContactSection";
import bannerImage from "../../../public/images/right-banner-bg.webp";
import avatarImage from "../../../public/images/logo/icon-logo.png";
import Link from "next/link";
// Helper to get video ID from YouTube URL
const getYouTubeVideoId = (url: string) => {
    let videoId = '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.substring(1).split('?')[0];
        } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
            videoId = urlObj.searchParams.get('v') || '';
        }
    } catch (e) {
        console.error("Invalid URL", e);
    }
    return videoId;
};


export default function HomePage() {

    const [singleVideo, ...carouselVideos] = videoTestimonials;
    const singleVideoId = getYouTubeVideoId(singleVideo.src);
    const singleVideoEmbedUrl = `https://www.youtube.com/embed/${singleVideoId}`;

    return (
        <>
            {/* Header */}
            <Header />
            {/* Hero */}
            <section id="home">
                <HeroOne />
            </section>
            {/* category cards */}
            <div id="features" className="counter-wrap font-dm bg-home-one-gradient-banner relative py-12 sm:py-16 lg:py-24">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-4">
                    {/* title */}
                    <PageTitle3
                        badgeText=""
                        title="Shop by Category"
                        subtitle="Select a category to find the perfect QR solution for your needs."
                        widthClass="xl:w-7/12 lg:w-2/3 mx-auto"
                        alignment="center"
                        padding="pb-10 sm:pb-12 lg:pb-16"
                        textColor=""
                    />
                    <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 justify-center gap-4 sm:gap-6">
                        <Link href="/cart" className="w-full block">
                            <FeatureCard
                                icon={<Car fill="white" size={26} className="text-white" />}
                                title="Vehicle"
                                description="Secure QR tags for cars and bikes to manage parking and safety."
                                delay={100}
                                bgColor="bg-blue-500"
                                layout="centered"
                            />
                        </Link>
                        <Link href="/cart" className="w-full block">
                            <FeatureCard
                                icon={<PawPrint fill="white" size={26} className="text-white" />}
                                title="Pets"
                                description="Smart tags to ensure your furry friends can always be identified."
                                delay={100}
                                bgColor="bg-blue-500"
                                layout="centered"
                            />
                        </Link>
                        <Link href="/cart" className="w-full block">
                            <FeatureCard
                                icon={<Package fill="white" size={26} className="text-white" />}
                                title="Miscellaneous"
                                description="Versatile QR stickers for keys, luggage, laptops, and more."
                                delay={100}
                                bgColor="bg-blue-500"
                                layout="centered"
                            />
                        </Link>
                    </div>
                </div>
            </div>
            {/* service wrap */}
            <section id="services" className="service-wrap py-12 sm:py-16 lg:py-24">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
                    <div className="flex flex-col gap-y-5 pb-10 sm:pb-12 lg:pb-16 lg:flex-row lg:flex-wrap lg:justify-between lg:gap-y-4">
                        <PageTitle3
                            badgeText=""
                            title="Expectations customers feeling truly delighted"
                            subtitle="Genuine feedback from those who know us best."
                            widthClass="w-full xl:w-6/12 lg:w-7/12"
                            alignment="start"
                            padding="pb-0"
                        />
                        <div className="lg:text-right lg:mt-auto">
                            <Button href="/about" label="Our service" bgColor="bg-blue-600" textColor="text-white" />
                        </div>
                    </div>
                    <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 sm:gap-6 mb-4 sm:mb-6">
                        <div className="w-full lg:col-span-2 overflow-hidden relative rounded-xl" data-aos-duration="400" data-aos="fade-up">
                            {/* slider */}
                            <CounterCarousel slides={maincarsoul} />
                        </div>
                        <div className="w-full" data-aos-duration="400" data-aos="fade-up">
                            <div className="overflow-hidden relative rounded-xl h-64 sm:h-80 lg:h-[350px]">
                                <Image
                                    src={bannerImage}
                                    alt="about"
                                    width={416}
                                    height={350}
                                    loading="lazy"
                                    className="w-full h-full object-cover hover:scale-[1.05] transition-all duration-[1s]"
                                />

                                {/* Content Overlay */}
                                <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.5)_100%)]"></div>

                                <div className="absolute bottom-0 left-0 w-full p-4 sm:p-5 z-10">
                                    <div className="flex flex-row justify-between px-1 sm:px-2">
                                        <div>
                                            <h3 className="text-white text-4xl sm:text-5xl lg:text-6xl font-medium mb-1">98.2%</h3>
                                            <p className="text-gray-200 font-medium text-sm sm:text-base lg:text-lg leading-snug sm:leading-6 mb-0 xl:pr-12">The Truest feedback comes from those who know you best.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 sm:gap-6 mb-4 sm:mb-6">
                        <div className="w-full" data-aos-duration="400" data-aos="fade-up">
                            <div className="relative overflow-hidden rounded-xl aspect-video sm:h-80 lg:h-[350px]">
                                {singleVideoId ? (
                                    <iframe
                                        src={singleVideoEmbedUrl}
                                        title={singleVideo.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                    ></iframe>
                                ) : (
                                    <div className="w-full h-full bg-black flex items-center justify-center">
                                        <p className="text-white">Invalid video source</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-full lg:col-span-2" data-aos="fade-up" data-aos-duration="400" data-aos-delay="0">
                            <CounterCarousel slides={carouselVideos} />
                        </div>
                    </div>
                </div>
            </section>

            {/* how it works wrap */}
            <section id="about">
                <PageTitle2
                    icon={Zap}
                    label="Secure QR Communication"
                    title="How it works"
                    subtitle="Smart QR Solutions for Vehicles, Pets & Valuables"
                    align="center"
                    widthClass="xl:w-7/12 lg:w-9/12"
                />
                <div className="about-wrap pb-12 sm:pb-16 lg:pb-20">
                    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-14 lg:px-14 xl:px-20 2xl:px-5">
                        <div className="grid md:grid-cols-2 grid-cols-1 justify-center gap-4 sm:gap-6 pb-10 sm:pb-12 lg:pb-16">
                            {/* left side */}
                            <div className="relative w-full h-72 sm:h-96 md:h-[615px] rounded-xl">
                                <Image
                                    src={bannerImage}
                                    alt="banner"
                                    fill
                                    sizes="(max-width: 768px) 100vw,  (max-width: 1200px) 50vw,  33vw"
                                    className="object-cover rounded-xl"
                                    priority
                                />
                            </div>
                            {/* right side */}
                            <div className="space-y-4 sm:space-y-6">
                                <div className="relative w-full h-56 sm:h-72 md:h-[319px] rounded-xl">
                                    <Image
                                        src={bannerImage}
                                        alt="banner"
                                        fill
                                        sizes="(max-width: 768px) 100vw,  (max-width: 1200px) 50vw,  33vw"
                                        className="object-cover rounded-xl"
                                        priority
                                    />
                                </div>
                                <div className="w-full" data-aos="fade-up" data-aos-duration="400" data-aos-delay="0">
                                    <div className="font-dm bg-cyan-gradient rounded-xl p-5 sm:p-6 min-h-[220px] sm:min-h-[260px] md:h-[275px] flex flex-col dark:bg-image-none dark:bg-gray-800">
                                        {/* Avatar group  */}
                                        <div className="flex -space-x-4">
                                            <Image
                                                src={avatarImage}
                                                width={48}
                                                height={48}
                                                alt="member-avatar"
                                                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full"
                                                loading="lazy"
                                            />
                                            <Image
                                                src={avatarImage}
                                                width={48}
                                                height={48}
                                                alt="member-avatar"
                                                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full"
                                                loading="lazy"
                                            />
                                            <Image
                                                src={avatarImage}
                                                width={48}
                                                height={48}
                                                alt="member-avatar"
                                                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full"
                                                loading="lazy"
                                            />
                                            <Image
                                                src={avatarImage}
                                                width={48}
                                                height={48}
                                                alt="member-avatar"
                                                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Text block */}
                                        <div className="mt-auto">
                                            <h3 className="text-gray-900 font-medium mb-1 text-5xl sm:text-6xl md:text-[75px] leading-none">30x</h3>
                                            <p className="text-gray-900 text-base sm:text-lg md:text-[22px] leading-snug sm:leading-7 font-normal italic md:w-2/3 mb-0 pe-2">Secure &amp; Instant Connections Made Simple.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </div>
                        <div className="grid md:grid-cols-2 grid-cols-1 justify-center gap-6 md:gap-8">
                            <div className="w-full">
                                <h3 className="text-gray-900 font-semibold text-xl sm:text-2xl lg:text-[34px] leading-tight lg:w-5/6 tracking-tight aos-init aos-animate">We built a smart QR-based safety platform so you can stay reachable without compromising your privacy</h3>
                            </div>
                            <div className="w-full space-y-4 sm:space-y-6">
                                <p className="text-gray-600 text-base sm:text-[17px] font-medium max-w-xl lg:pr-8 px-0 aos-init aos-animate" data-aos="fade-up" data-aos-duration="300">
                                    Our solution allows anyone who scans your QR code to contact you instantly while keeping your personal details completely protected. When a QR code attached to your car, dog collar, or valuable item is scanned, the finder is redirected to a secure contact page. From there, they can connect with you via masked calling, WhatsApp, or SMS without ever seeing your private phone number.
                                </p>
                                <p className="text-gray-600 text-base sm:text-[17px] font-medium max-w-xl lg:pr-8 px-0 aos-init aos-animate" data-aos="fade-up" data-aos-duration="300">
                                    Do not risk losing your vehicle, pet, or belongings due to a lack of communication. With our QR system, you stay connected in real time while maintaining full control over your personal information.
                                    Whether it’s a parking issue, a lost pet, or misplaced item, our platform ensures fast communication, quick resolution, and complete privacy protection.
                                </p>
                                <div className="aos-init aos-animate" data-aos="fade-up" data-aos-delay="200" data-aos-duration="400">
                                    <Button href="/about" label="Who we are" bgColor="bg-blue-600" textColor="text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* price wrap */}
            <section id="pricing" className="pt-12 sm:pt-16 lg:pt-24 relative overflow-hidden">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-20">
                    <PageTitle3
                        badgeText=""
                        title="Built to scale with flexible pricing with your need"
                        subtitle="Join thousands who trust us for quality and lasting relationships"
                        widthClass="xl:w-7/12 lg:w-2/3 mx-auto w-full"
                        alignment="center"
                        padding="pb-10 sm:pb-12 lg:pb-16"
                    />
                    <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 md:grid-cols-2 sm:grid-cols-1">
                        {/* price 1st */}
                        <PriceCard
                            title="Startup"
                            description="Best for startup business owners who needs for business."
                            price="$29"
                            priceSuffix="/month"
                            borderColor="border-gray-200"
                            buttonText="Start trial for 14 days"
                            buttonLink="/pricing"
                            discountText=""
                            features={[
                                { text: "10 GB disk space availability" },
                                { text: "10 GB NVMe SSD for use" },
                                { text: "Free platform access for all" },
                                { text: "Lifetime updates facility" },
                                { text: "One year support" },
                            ]}

                        />

                        {/* price 2nd */}
                        <PriceCard
                            title="Professional"
                            description="Perfect for new professionals needing essential tools for growth."
                            price="$49"
                            priceSuffix="/month"
                            borderColor="border-blue-700"
                            buttonText="Start trial for 14 days"
                            buttonLink="/pricing"
                            discountText="Get 20% off"
                            features={[
                                { text: "15 GB disk space availability" },
                                { text: "75 GB NVMe SSD for use" },
                                { text: "Free platform access for all" },
                                { text: "Lifetime updates facility" },
                                { text: "One year support" },
                            ]}

                        />

                        {/* price 3rd */}
                        <PriceCard
                            title="Enterprise"
                            description="Perfect for new businesses needing essential tools for growth."
                            price="$99"
                            priceSuffix="/month"
                            borderColor="border-gray-200"
                            buttonText="Start trial for 14 days"
                            buttonLink="/pricing"
                            discountText=""
                            features={[
                                { text: "100 GB disk space availability" },
                                { text: "100 GB NVMe SSD for use" },
                                { text: "Free platform access for all" },
                                { text: "Lifetime updates facility" },
                                { text: "One year support" },
                            ]}

                        />
                    </div>
                </div>
            </section>

            {/* cta wrap */}
            <section id="contact">
                <ContactSection embedded />
            </section>
            {/* <CtaSection /> */}
            {/* footer */}
            <Footer />
        </>
    );
}
