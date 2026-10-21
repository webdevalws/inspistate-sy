# Capital Gains Calculator

**Area:** Tools · **Route:** `/tools/capital-gains` · **Status:** built

## What it does
Capital gains tax on selling a property, short or long term, under the Finance Act 2024 rules.

## Inputs
- Purchase and sale dates
- Purchase cost, FMV on 1 Apr 2001 (only for pre-2001 purchases), improvement cost
- Sale price, transfer expenses
- Tax slab, residential status
- Sec 54 reinvestment and 54EC bonds (long-term only)

## Outputs
- Holding period and type, capital gain, exemptions, estimated tax incl. 4% cess
- Side-by-side: 12.5% without indexation vs 20% with indexation (indexed cost shown)

## How it works
- Long-term if held > 24 months; short-term taxed at the slab rate.
- Cost for pre-2001 purchases = max(cost, FMV 2001), indexed from FY 2001-02.
- Long-term: 12.5% without indexation; resident individuals who bought before 23 Jul 2024 get the lower of that and 20% with indexation (CII table to FY 2025-26). NRIs cannot use indexation.
- Exemptions: Sec 54 amount + 54EC (capped at ₹50 lakh) reduce the long-term gain.

## Files
- `src/components/islands/MoreTools.tsx (CapitalGains)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/capital-gains — **no calculator**; a content page with a "Legal Services" lead form (name, email, phone, city).

- States: > 24 months = long term; STCG = sale − (transfer expenses + cost + improvement); LTCG = sale − (expenses + indexed cost + indexed improvement) − exemptions (54, 54EC, 54F, 54B); rural agricultural land exclusion distances.
- Its rate table (10% / 15% / 20%) predates the 2024 changes.

## Gaps vs reference
- **Ahead of reference:** working calculator with 2024 rules, both regimes side by side, FMV-2001, exemptions, NRI rule.
- **Not built:** Sec 54F (proportionate) and 54B; expert lead form on the page.
