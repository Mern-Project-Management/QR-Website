"use client";

import { useEffect, useRef, useState } from "react";

interface BannerData {
    id: number;
    isActive: boolean;
    message: string;
    textColor: string;
    backgroundColor: string;
    updatedAt: string;
}

export default function MaintenanceBanner() {
    const [bannerData, setBannerData] = useState<BannerData | null>(null);
    const [visible, setVisible] = useState(true);
    const bannerRef = useRef<HTMLDivElement | null>(null);

    // Pause animation on hover for readability
    const [paused, setPaused] = useState(false);

    // Fetch banner config from API
    useEffect(() => {
        fetch("/api/backend/maintenance-banner")
            .then((res) => res.json())
            .then((json) => {
                if (json?.data) {
                    setBannerData(json.data);
                }
            })
            .catch(() => {
                // silently fail — banner simply won't show
            });
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        if (!visible || !bannerData?.isActive) {
            root.style.setProperty("--maintenance-banner-offset", "0px");
            return;
        }

        const updateOffset = () => {
            const height = bannerRef.current?.offsetHeight ?? 0;
            root.style.setProperty("--maintenance-banner-offset", `${height}px`);
        };

        updateOffset();

        const observer = new ResizeObserver(updateOffset);
        if (bannerRef.current) {
            observer.observe(bannerRef.current);
        }

        window.addEventListener("resize", updateOffset);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateOffset);
            root.style.setProperty("--maintenance-banner-offset", "0px");
        };
    }, [visible, bannerData]);

    // Don't render if not fetched yet, not active, or dismissed
    if (!bannerData || !bannerData.isActive || !visible) return null;

    return (
        <div
            ref={bannerRef}
            className="maintenance-banner"
            style={{
                backgroundColor: bannerData.backgroundColor,
                color: bannerData.textColor,
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Close button */}
            <button
                onClick={() => setVisible(false)}
                className="maintenance-banner__close"
                aria-label="Dismiss maintenance banner"
            >
                ✕
            </button>

            {/* Scrolling ticker */}
            <div className="maintenance-banner__track">
                <div
                    className={`maintenance-banner__scroll ${paused ? "maintenance-banner__scroll--paused" : ""}`}
                >
                    {Array.from({ length: 8 }).map((_, i) => (
                        <span key={i} className="maintenance-banner__item">
                            <span className="maintenance-banner__icon">📢</span>
                            {bannerData.message}
                            <span className="maintenance-banner__dot">•</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Scoped styles */}
            <style jsx>{`
        .maintenance-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          overflow: hidden;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.025em;
          z-index: 99999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .maintenance-banner__close {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          background: rgba(0, 0, 0, 0.25);
          border: none;
          color: inherit;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.7rem;
          transition: background 0.2s;
          line-height: 1;
        }

        .maintenance-banner__close:hover {
          background: rgba(0, 0, 0, 0.45);
        }

        .maintenance-banner__track {
          overflow: hidden;
          padding: 0.5rem 2.5rem 0.5rem 0;
        }

        .maintenance-banner__scroll {
          display: flex;
          white-space: nowrap;
          animation: ticker 30s linear infinite;
        }

        .maintenance-banner__scroll--paused {
          animation-play-state: paused;
        }

        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .maintenance-banner__item {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0 1.5rem;
        }

        .maintenance-banner__icon {
          font-size: 1rem;
        }

        .maintenance-banner__dot {
          opacity: 0.5;
          margin-left: 0.6rem;
        }
      `}</style>
        </div>
    );
}
