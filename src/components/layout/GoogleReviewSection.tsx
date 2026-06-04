"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "react-feather";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css";

interface GoogleReviewItem {
  id?: string | number;
  name?: string;
  review?: string;
  rating?: number;
  is_active?: boolean;
  sort_order?: number;
}

type DisplayReview = {
  name: string;
  review: string;
  rating: number;
};

const fallbackReviews: DisplayReview[] = [
  {
    name: "Rahul Sharma",
    review:
      "Great product quality and very easy setup. The QR sticker helped me reconnect with my lost keys in less than an hour.",
    rating: 5,
  },
  {
    name: "Neha Verma",
    review:
      "Customer support is quick and helpful. The privacy-first contact flow is exactly what I needed for my vehicle.",
    rating: 5,
  },
  {
    name: "Aman Patel",
    review:
      "Clean dashboard, simple activation, and reliable notifications. Highly recommended for pet and luggage tags.",
    rating: 5,
  },
];

function ReviewCard({ item }: { item: DisplayReview }) {
  return (
    <div className="h-full min-h-[220px] rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center gap-1 text-brand-primary">
        {Array.from({ length: item.rating }).map((_, starIndex) => (
          <Star key={starIndex} size={16} fill="currentColor" />
        ))}
      </div>
      <p className="line-clamp-5 text-gray-700 dark:text-gray-200 leading-7">{item.review}</p>
      <p className="mt-4 font-semibold text-gray-900 dark:text-white">{item.name}</p>
    </div>
  );
}

function AverageStars({ value, size = 20 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = value >= starValue - 0.25;
        const half = !filled && value >= starValue - 0.75;

        return (
          <Star
            key={index}
            size={size}
            className={
              filled
                ? "fill-brand-primary text-brand-primary"
                : half
                  ? "fill-brand-primary/40 text-brand-primary"
                  : "text-gray-300 dark:text-gray-600"
            }
            fill={filled ? "currentColor" : "none"}
          />
        );
      })}
    </div>
  );
}

export default function GoogleReviewSection() {
  const [reviews, setReviews] = useState<GoogleReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<string>("");
  const [form, setForm] = useState<{ name: string; review: string; rating: 1 | 2 | 3 | 4 | 5 }>({
    name: "",
    review: "",
    rating: 5,
  });

  const fetchGoogleReviews = async () => {
    try {
      const response = await fetch("/api/backend/google-reviews");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const parsedData = Array.isArray(data) ? data : [];
      const activeSorted = parsedData
        .filter((item: GoogleReviewItem) => item?.is_active !== false)
        .sort(
          (a: GoogleReviewItem, b: GoogleReviewItem) =>
            (a.sort_order ?? 9999) - (b.sort_order ?? 9999),
        );

      setReviews(activeSorted);
    } catch (error) {
      console.error("Error fetching Google reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleReviews();
  }, []);

  const submitReview = async () => {
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const payload = {
        name: form.name.trim(),
        review: form.review.trim(),
        rating: form.rating,
      };

      if (!payload.name || !payload.review) {
        setSubmitError("Please enter your name and review.");
        return;
      }

      const res = await fetch("/api/backend/google-reviews/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const json = (() => {
        try {
          return JSON.parse(text) as { success?: boolean; message?: string };
        } catch {
          return null;
        }
      })();

      if (!res.ok || json?.success === false) {
        setSubmitError(json?.message || "Failed to submit review. Please try again.");
        return;
      }

      setSubmitSuccess("Thanks! Your review has been submitted.");
      setForm({ name: "", review: "", rating: 5 });
      setReviewModalOpen(false);
      await fetchGoogleReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      setSubmitError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayReviews = useMemo((): DisplayReview[] => {
    if (!reviews.length) return fallbackReviews;
    return reviews.map((item) => ({
      name: item.name?.trim() || "Verified Customer",
      review: item.review?.trim() || "Great experience with the service.",
      rating: Math.max(1, Math.min(5, Number(item.rating) || 5)),
    }));
  }, [reviews]);

  const { averageRating, averageLabel, reviewCount } = useMemo(() => {
    if (!displayReviews.length) {
      return { averageRating: 5, averageLabel: "5.0", reviewCount: 0 };
    }
    const total = displayReviews.reduce((sum, item) => sum + item.rating, 0);
    const avg = total / displayReviews.length;
    return {
      averageRating: avg,
      averageLabel: avg.toFixed(1),
      reviewCount: displayReviews.length,
    };
  }, [displayReviews]);

  const sliderItems = loading ? fallbackReviews : displayReviews;
  const enableLoop = sliderItems.length > 3;

  return (
    <section className="bg-white py-12 dark:bg-gray-900 lg:py-16">
      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-14 lg:px-14 xl:px-18 2xl:px-3">
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-secondary px-4 py-2 text-sm font-medium text-brand-primary bg-white dark:bg-gray-800">
            <Star size={14} fill="currentColor" />
             Reviews
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white">
            Loved by our customers
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl">
            Real feedback from users who trust our QR safety solutions for vehicles, pets, and valuables.
          </p>

          <div
            className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:gap-3"
            aria-label={`Average rating ${averageLabel} out of 5 from ${reviewCount} reviews`}
          >
            <AverageStars value={averageRating} size={22} />
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:text-left">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageLabel}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">out of 5</span>
              <span className="hidden text-gray-400 sm:inline">·</span>
              {/* <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
              </span> */}
            </div>
          </div>
        </div>

        <Splide
          aria-label="Customer reviews carousel"
          options={{
            type: enableLoop ? "loop" : "slide",
            perPage: 1,
            perMove: 1,
            gap: "1.25rem",
            arrows: sliderItems.length > 1,
            pagination: sliderItems.length > 1,
            autoplay: sliderItems.length > 1,
            interval: 5000,
            pauseOnHover: true,
            pauseOnFocus: true,
            drag: true,
            breakpoints: {
              640: {
                perPage: Math.min(2, sliderItems.length),
                gap: "1.5rem",
              },
              1024: {
                perPage: Math.min(3, sliderItems.length),
                gap: "1.75rem",
              },
            },
          }}
          className="google-reviews-slider slider-arrows-outside slider-arrows-white slider-dots-round splide-pagination-bottom pb-10"
        >
          {sliderItems.map((item, index) => (
            <SplideSlide key={`review-${item.name}-${index}`}>
              <ReviewCard item={item} />
            </SplideSlide>
          ))}
        </Splide>

        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setSubmitError("");
              setSubmitSuccess("");
              setReviewModalOpen(true);
            }}
            className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Share your review
          </button>
        </div>
      </div>

      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Share your review</h3>
                <p className="mt-1 text-sm text-gray-600">Tell us what you think. It helps others.</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Your name"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, rating: r as 1 | 2 | 3 | 4 | 5 }))}
                      className={`rounded-lg px-2 py-2 transition ${form.rating >= r ? "text-brand-primary" : "text-gray-300"}`}
                      aria-label={`Rate ${r}`}
                    >
                      <Star size={18} fill="currentColor" />
                    </button>
                  ))}
                  <span className="ml-1 text-sm font-semibold text-gray-700">{form.rating}/5</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Review</label>
                <textarea
                  className="h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  value={form.review}
                  onChange={(e) => setForm((s) => ({ ...s, review: e.target.value }))}
                  placeholder="Write your review…"
                />
              </div>

              {(submitError || submitSuccess) && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${submitError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
                    }`}
                >
                  {submitError || submitSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting}
                  className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}