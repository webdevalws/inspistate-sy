# Customer Reviews

**Area:** Company · **Route:** `/reviews` · **Status:** built

## What it does
Reviews of InspiState by service line and city, plus published project reviews; visitors can write a review.

## Inputs
- Source tab (all, project reviews, buying, renting, selling, home loans, interiors, home services, legal)
- City
- Write a review: stars, service, city, name, title, text

## Outputs
- Average, total, 5→1 star distribution
- Review cards with initial avatar, relative time, city, source
- Pagination (20)
- FAQ

## How it works
- `platform_reviews` table (migration 0009), status pending → published by admin (`/admin#platform-reviews`).
- `listReviews` UNIONs platform and project reviews with filters.
- `POST /api/platform-reviews`: same-origin, 30–2,000 chars, rating 1–5.

## Files
- `src/pages/reviews.astro`
- `src/lib/platform-reviews.ts`
- `src/pages/api/platform-reviews.ts`
- `src/components/islands/PlatformReviewForm.tsx`
- `src/pages/api/admin/platform-reviews/[id].ts`
- `src/pages/admin/index.astro`
- `migrations/0009_platform_reviews.sql`

## Reference behaviour (Square Yards)
Reference: https://www.squareyards.com/reviews — 4.7★ summary, source tabs (Square Yards, Interiors, Azuro, Urban Money) with city sub-filter, Google-sourced review cards via `/fetchPaginationReviews`, numbered pagination, video testimonials, FAQ.

## Gaps vs reference
- **Different:** our own first-party reviews (no imported Google reviews); starts empty — no invented testimonials.
- **Not built:** video testimonials, Google review import.
