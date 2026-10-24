# Vastu Calculator

**Area:** Tools · **Route:** `/tools/vastu` · **Status:** built (v2 — floor-plan analyzer)

## What it does
Analyses an uploaded floor plan: works out which compass direction each room sits in from the home's centre, rates it against Vastu rules and gives a score, per-room verdicts and remedies.

## Inputs
- Floor plan image — JPG or PNG, max 5 MB (click or drag-drop)
- North orientation — dial rotated in 22.5° steps (pre-set if AI finds a north arrow)
- Centre point of the home — draggable dot (or click on plan)
- Room points — auto-detected, then verified: drag, retype, delete or add (20 room types)

## Outputs
- Vastu score % and verdict (Excellent ≥80, Good ≥65, Needs attention ≥45, else Major corrections advised)
- Plan overlay with 8 sector lines, direction labels and colour-coded room badges
- Table: room, direction, rating (Best/Good/Poor/Danger), ideal directions
- Remedies for every Poor/Danger room; print/PDF; "Talk to a Vastu expert" callback lead

## How it works
- Direction: `dx = (x − cx)·aspect`, `dy = y − cy`; bearing = `atan2(dx, −dy)` in degrees minus north rotation, normalised to 0–360; sector = `floor((bearing + 22.5) % 360 / 45)` → N, NE, E, SE, S, SW, W, NW. Distance < 0.01 = Centre (not scored).
- Rating points: Best 3, Good 2, Poor 1, Danger 0. Score = Σ points / (3 × scored rooms) × 100.
- Detection: client downscales the image to ≤1600 px JPEG and POSTs base64 to `/api/tools/vastu-detect`, which calls Claude (`claude-opus-5-5`, server-side fallback enabled) with a JSON-schema output of `{is_floor_plan, north_arrow_degrees, rooms[{type, x, y, label_on_plan}]}`. North is snapped to 22.5°. Rejects non-plans and refusals; same-origin only; 10 calls per hashed IP per day (`ai_usage` table). Without `ANTHROPIC_API_KEY` it returns 503 and the user marks rooms manually.
- Detection runs in the background while the user sets orientation and centre.
- **Site-wide cap (item 59):** besides 10 per client per day, all users together get **200 detections per UTC
  day** (`SITE_DAILY_LIMIT`, an `ai_usage` row with client `all-users`). When it is reached the API returns 429
  with a friendly message to mark rooms manually or try tomorrow; neither counter keeps that use.
- The daily count goes up before the Claude call. **Failures on our side give it back** (API or rate-limit
  errors, a reply cut off at `max_tokens` → 502 "Detection was cut short…", or a reply that can't be
  read). Refusals and "not a floor plan" answers still count, because those calls were made and billed.

## Files
- `src/components/islands/VastuAnalyzer.tsx` — 5-step UI
- `src/data/vastu.ts` — directions, room rating table, remedies, `directionOf`, `vastuReport`
- `src/pages/api/tools/vastu-detect.ts` — AI room detection
- `migrations/0006_ai_usage.sql` — `ai_usage`, now a general daily counter keyed by (hashed client, feature, UTC day); Vastu uses feature `vastu`, login codes use `otp-phone` / `otp-ip` (see `docs/functions/login/desc.md`), and the public endpoints use `view-number`, `enquiry`, `orders`, `reviews`, `platform-reviews`, `newsletter`, `coupon` and `ask` (see `docs/functions/leads/desc.md`)
- `src/pages/tools/[tool].astro`, `src/lib/catalog.ts`

## Tests
- Localhost end-to-end (Playwright, 2026-10-18): upload 2×2 plan, rotation 0, centre drag, toilet NE / living NW / master bed SW / kitchen SE → 67% "Good", Danger remedy shown, no page errors.
- API: cross-site POST → 403; no API key → 503 with manual-mode message.

## Reference behaviour (Square Yards)
Reference pages: https://www.squareyards.com/vastu-calculator (landing) and `/vastu-calculator-process` — script `vastuFloorplan-*.min.js`.

- **Landing:** JPEG/PNG up to 5 MB (click or drag-drop), stored as a data URL in localStorage key `floorplan`, then redirects to the process page.
- **Process — 5 steps:** Upload Floor Plan (or pick a project unit from their database via `/autosuggest` + `/getProjectUnitData`) → **Set Orientation** (compass dial rotated in 22.5° steps) → **Confirm Center Point** (draggable purple dot) → **Verify Room Labels** (`POST /generate-node-points {imageBuffer}` auto-detects room points; user can delete/add points) → **Get Report**.
- **Maths:** `DIRECTION_CONFIG {SECTOR_SIZE: 45, HALF_SECTOR: 22.5, DISTANCE_THRESHOLD: .01}`; angle = `(atan2(dx, -dy)·180/π + 360) % 360` from the centre, minus the north rotation, bucketed into 8 sectors of 45°. Points within the threshold count as centre. Option to flip the plan.
- **Ratings:** room type × direction table rated **Best / Good / Poor / Danger** (priority 3–0), ~49 room types.
- **Monetisation:** free preview, then "Unlock Full Report ₹399" (name, email, phone → `/vastu-order-id`, `/vastu-payment-post`, `/vastu-report-status`; drafts via `/vastu-save-draft`).

## Gaps vs reference
- **Matched:** upload limits, 22.5° orientation dial, draggable centre, auto-detect + manual verify, same sector maths, 4-level ratings, score + per-room report + remedies, PDF via print.
- **Different by design:** rating table and remedies are our own (20 room types, not 49); full report is free with an expert-callback lead instead of a ₹399 paywall; detection uses Claude vision (`/api/tools/vastu-detect`), capped at 10 per client and 200 for all users per day.
- **Not yet built:** choosing a floor plan from our project database, plan flip, saved drafts, paid report option.
