# Legal Services catalogue

**Area:** Services · **Route:** `/services/legal-services` · **Status:** built

## What it does
Tabbed catalogue of fixed-price property legal services with Book Now leads.

## Inputs
- Tab (Legal services / Monitoring & valuation)
- Book Now → name, phone (lead dialog)

## Outputs
- Service tiles: name, badge, 3 inclusions, offer price (or FREE) and struck-through list price
- Order now for services we fulfil online (title search, litigation search, valuation)

## How it works
- Catalogue data `LEGAL_CATALOGUE` in `src/data/services.ts`; Book Now opens `LeadDialog` with subject "Legal service: <name>".

## Files
- `src/components/islands/LegalOrders.tsx (LegalCatalogue)`
- `src/pages/services/legal-services.astro`
- `src/data/services.ts`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/legal-services-for-real-estate — `propamc-common-services-*.min.js`.

- Tabs "Litigation Services" and "Monitoring and Valuation"; tiles with bullets, optional sample report PDF, offer price + MRP, Book Now. Services: document review (free), POA, lease agreement, sale agreement, due diligence, property complaints, title search, litigation search, project monitoring report.
- Book Now loads a common OTP lead form (`/getcommonleadform` → `/lead/globalsendotp-v2` → `/user/lead/globalverifyotp`) tagged with service and sub-service.

## Gaps vs reference
- **Matched:** tabbed catalogue, same service range, offer vs list price, free document review, badges, Book Now leads tagged by service.
- **Not built:** sample report PDFs per tile; OTP verification of leads; testimonials.
