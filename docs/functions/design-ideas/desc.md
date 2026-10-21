# Interior Design Ideas

**Area:** Interiors · **Route:** `/design-ideas` · **Status:** built

## What it does
Gallery of design ideas for 20 room categories with style / colour / size filters, search, detail pages and "get this design" leads.

## Inputs
- Category
- Filters: style, colour, size (query params)
- Search text (all words must match)
- Load more (page)

## Outputs
- Cards with generated illustration, title, tags, indicative cost, Get this design
- Detail: specs, cost by package, similar ideas
- Cost calculator promo inside the grid

## How it works
- Ideas are generated deterministically per category (24 each) from style × colour × size × feature; cost = category base × size × style factor.
- Illustrations are our own SVGs (`RoomArt`) — no stock or copied photos.

## Files
- `src/pages/design-ideas/index.astro`
- `src/pages/design-ideas/[category].astro`
- `src/pages/design-ideas/[category]/[slug].astro`
- `src/components/RoomArt.astro`
- `src/data/interiors.ts (IDEA_*, ideasFor)`

## Reference behaviour (Square Yards)
Reference: https://www.interiorcompany.com/in/interior-design-ideas — category index with counts; category pages with filters (colour, theme, size, type, floor material, wall colour) and SEO filter URLs, search suggestions (`/api/product-search`), 30 per page with infinite scroll (`/api/productsbyattributes`), cards with download-as-lead and wishlist, no cost shown.

## Gaps vs reference
- **Matched:** category index, filters, search, paging, lead per design, detail pages.
- **Better:** indicative cost per idea and by package.
- **Not built:** real project photos (needs our own photography), wishlist, floor-material/wall-colour filters.
