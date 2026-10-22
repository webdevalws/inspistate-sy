# Ask AI search & assistant

**Area:** Search · **Route:** `/api/ask` · **Status:** built

## What it does
Turns a sentence into a search URL.

## Inputs
- Free text, current city

## Outputs
- URL + human-readable summary

## How it works
- Rule-based parser: city/alias, locality, mode, BHK, type, budget phrases, possession, furnishing, owner, sort.
- `parseQuery(text, cities, localities, fallbackCity, defaultMode = 'buy')`: the mode comes from words in
  the text (buy/sale → buy, rent/lease → rent, office/shop → commercial, new launch → new projects),
  otherwise `defaultMode`. The search pages also use it for the search box's free text (`?q=`), passing the
  current tab as `defaultMode` (see `docs/functions/property-search/desc.md`).
- `GET /api/ask` is same-site only (`Sec-Fetch-Site`) and limited to 60 queries per IP per day (`guard()` in `src/lib/limits.ts`).

## Files
- `src/lib/nlsearch.ts`
- `src/pages/api/ask.ts`
- `src/components/islands/ChatWidget.tsx`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
