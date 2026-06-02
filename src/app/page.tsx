"use client";

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroOne from "@/components/layout/Heroone";
import ContactSection from "./(site)/contact/ContactSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import WhyChooseUs2 from "@/components/WhyChooseUs2";
import CategorySection from "@/components/layout/CategorySection";
import FaqSection from "@/components/layout/FaqSection";
import GoogleReviewSection from "@/components/layout/GoogleReviewSection";
import MarketplaceSection from "@/components/layout/MarketplaceSection";

export default function HomePage() {

    return (
        <>
            {/* Header */}
            <Header />
            {/* Hero */}
            <section id="home">
                <HeroOne />
            </section>
            <div className="flex flex-col gap-12 md:gap-16 lg:gap-[4.5rem]">
                <section id="features">
                    <WhyChooseUs2 />
                </section>
                <section id="services">
                    <WhyChooseUs />
                </section>

                <section>
                    <CategorySection />
                </section>



                <section>
                    <GoogleReviewSection />
                </section>

                <section>
                    <MarketplaceSection />
                </section>

                <section>
                    <FaqSection />
                </section>
            </div>

            <section id="contact" className="mt-10 md:mt-14">
                <ContactSection embedded />
            </section>

            {/* dynamic blog section */}
            {/* <BlogSection /> */}

            {/* footer */}
            <Footer />
        </>
    );
}
