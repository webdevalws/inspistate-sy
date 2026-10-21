# Research Reports

**Area:** Insights · **Route:** `/research` · **Status:** built

## What it does
Data-driven market reports computed from our own locality data: national reports plus one per city.

## Inputs
- Category filter (national / city)

## Outputs
- India price index, rental yield report, fastest-growing localities, cost of a 2BHK, city market reports
- Bar charts and tables; print/PDF; Report JSON-LD; methodology

## How it works
- `buildReports()` averages locality price, rent and YoY growth per city; yield = rent×12/price; 2BHK = 1,000 sq ft × rate with EMI at 80% LTV, 8.5%, 20 yrs and income = EMI ÷ 40%.

## Files
- `src/lib/research.ts`
- `src/pages/research/index.astro`
- `src/pages/research/[slug].astro`

## Reference behaviour (Square Yards)
Reference: https://www.squareyards.com/research-reports — server-rendered list of 17 article-style reports (title, thumbnail, author), "Meet the Analysts", no filters; detail pages not captured.

## Gaps vs reference
- **Different:** reports are generated from live data, so they never go stale; no named analysts.
- **Not built:** long-form editorial reports and author pages.
