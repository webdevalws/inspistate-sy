# Women Homebuyers

**Area:** Guides · **Route:** `/women-homebuyers` · **Status:** built

## What it does
Landing page of benefits for women buyers: stamp duty concessions, loan rates, PMAY and tax deductions.

## Inputs
- Get in touch (lead dialog)

## Outputs
- Benefit cards with links to tools
- State concession table (men vs women rate and saving on ₹1 Cr) built from the stamp duty data
- Tax deduction table, checklist, FAQ

## How it works
- `WOMEN_CONCESSIONS` is derived from `STAMP_DUTY`, so the page always matches the calculator.
- The "Income tax deductions" card links to the Home Loan Tax Benefit tool (`/tools/tax-benefit`).

## Files
- `src/pages/women-homebuyers.astro`
- `src/data/stamp-duty.ts`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/women-homebuyers — informational page; "Get in Touch" opens the common OTP lead form.

- Sections: PMAY ownership and subsidy, bank rate concessions, tax deductions (80C, 24b, 80EE), stamp duty concessions, women-borrower statistics, "what we are doing".

## Gaps vs reference
- **Matched:** PMAY, loan rates, tax table, stamp duty concessions, Get in Touch.
- **Better:** concession table with computed savings, linked to our calculator.
- **Not built:** borrower statistics (we do not publish third-party stats).
