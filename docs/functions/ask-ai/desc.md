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

## Files
- `src/lib/nlsearch.ts`
- `src/pages/api/ask.ts`
- `src/components/islands/ChatWidget.tsx`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
