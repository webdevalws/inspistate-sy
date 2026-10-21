# Price Heatmap

**Area:** Insights · **Route:** `/heatmap/{city}` · **Status:** built

## What it does
Map of localities coloured by sale rate, growth or rent.

## Inputs
- City, metric

## Outputs
- Leaflet map with circles; most expensive / affordable lists

## How it works
- Circle colour = metric scaled green→amber→red; size = live listings.

## Files
- `src/pages/heatmap/[city].astro`
- `src/components/islands/HeatMap.tsx`
- `src/lib/community.ts (localityMarket)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/heatmap/mumbai — a separate **Next.js** app (`/heatmap/_next/`) rendering vector tiles with **MapLibre GL**.

## Gaps vs reference
- Ours uses Leaflet + OSM raster tiles with locality circles. Functionally equivalent for our data size.
