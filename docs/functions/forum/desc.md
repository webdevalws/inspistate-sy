# Real Estate Forum

**Area:** Community · **Route:** `/forum` · **Status:** built

## What it does
Q&A for logged-in users.

## Inputs
- Question title/body/city; answers

## Outputs
- Threads

## How it works
- Same-origin form posts; login required.
- Question pages emit QAPage JSON-LD containing user text (title, body, answers, author names from the
  profile). It is serialised with `jsonLd()` (`src/lib/jsonld.ts`), which writes `<`, `>`, `&`, U+2028 and
  U+2029 as `\u` escapes, so a title or name containing `</script>` stays text and cannot close the tag.
  Every `<script type="application/ld+json">` on the site uses this helper (Base, Breadcrumbs, Faq, research).

## Files
- `src/pages/forum/*`, `src/lib/jsonld.ts`
- `src/pages/api/forum.ts`
- `src/lib/forum.ts`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
