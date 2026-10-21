# Property Tax Estimator

**Area:** Tools · **Route:** `/tools/property-tax` · **Status:** built

## What it does
Indicative annual municipal property tax for a home or shop.

## Inputs
- City, built-up area, building age
- Use (self-occupied / rented / commercial)
- Construction (RCC / semi-pucca / kutcha)
- Floor (ground / upper)

## Outputs
- Annual and monthly tax, the method the city uses

## How it works
- Tax = city base rate (₹/sq ft/yr) × area × use × age × construction × floor factors.
- Use 1 / 1.5 / 2.5; age ≤10: 1, >10: 0.9, >25: 0.8, >40: 0.7; construction 1 / 0.7 / 0.5; floor ground 1, upper 0.9.
- Cities without data use ₹3/sq ft and are labelled "rough".

## Files
- `src/components/islands/LivingTools.tsx (PropertyTax)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/property-tax-india — **no calculator**; content and a "Legal Services" lead form.

- States the formula: Base value × built-up area × age factor × type of building × category of use × floor factor. No factor values are published.

## Gaps vs reference
- **Ahead of reference:** working estimator using all six factors of the stated formula, with the local method per city.
- **Not built:** exact city methods (Delhi colony categories, Mumbai capital value), pay-online guide.
