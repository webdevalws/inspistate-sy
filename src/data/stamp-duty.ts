// Indicative state stamp duty (% of property value) by buyer gender, plus registration fee rules.
// Used by the stamp duty calculator and the women homebuyers page. See docs/functions/stamp-duty/desc.md.
// Rates change often and vary with area (urban/rural), value slabs and local cess — always indicative.

export type Buyer = 'male' | 'female' | 'joint';

export interface StateDuty {
  state: string;
  /** Same rate for everyone, or per-buyer rates. */
  rate: number | { male: number; female: number; joint: number };
  /** Registration fee as % of value, with optional cap (₹) and women exemption. */
  registration: { pct: number; cap?: number; womenFree?: boolean };
  note?: string;
}

export const STAMP_DUTY: StateDuty[] = [
  { state: 'Andhra Pradesh', rate: 5, registration: { pct: 1 } },
  { state: 'Arunachal Pradesh', rate: 6, registration: { pct: 1 } },
  { state: 'Assam', rate: 8.25, registration: { pct: 1 } },
  { state: 'Bihar', rate: { male: 6.3, female: 5.7, joint: 6 }, registration: { pct: 2 } },
  { state: 'Chhattisgarh', rate: 5, registration: { pct: 4 } },
  { state: 'Delhi', rate: { male: 6, female: 4, joint: 5 }, registration: { pct: 1 }, note: 'Plus ₹100 pasting fee.' },
  { state: 'Goa', rate: 4, registration: { pct: 1 } },
  { state: 'Gujarat', rate: 4.9, registration: { pct: 1, womenFree: true }, note: 'No registration fee when a woman is the buyer.' },
  { state: 'Haryana', rate: { male: 7, female: 5, joint: 6 }, registration: { pct: 1, cap: 50000 }, note: 'Urban areas; rural rates are about 2% lower.' },
  { state: 'Himachal Pradesh', rate: { male: 6, female: 4, joint: 5 }, registration: { pct: 2, cap: 25000 } },
  { state: 'Jammu and Kashmir', rate: 7, registration: { pct: 1.2 } },
  { state: 'Jharkhand', rate: 4, registration: { pct: 3 } },
  { state: 'Karnataka', rate: 5, registration: { pct: 1 }, note: '2–3% for properties up to ₹45 lakh.' },
  { state: 'Kerala', rate: 8, registration: { pct: 2 } },
  { state: 'Madhya Pradesh', rate: 7.5, registration: { pct: 3 } },
  { state: 'Maharashtra', rate: { male: 6, female: 5, joint: 6 }, registration: { pct: 1, cap: 30000 }, note: 'Includes 1% metro cess in Mumbai, Pune and other metro areas; women’s 1% concession applies to the first home.' },
  { state: 'Manipur', rate: 7, registration: { pct: 1 } },
  { state: 'Meghalaya', rate: 9.9, registration: { pct: 1 } },
  { state: 'Mizoram', rate: 9, registration: { pct: 1 } },
  { state: 'Nagaland', rate: 8.25, registration: { pct: 1 } },
  { state: 'Odisha', rate: { male: 5, female: 4, joint: 5 }, registration: { pct: 2 } },
  { state: 'Punjab', rate: { male: 7, female: 5, joint: 6 }, registration: { pct: 1 } },
  { state: 'Rajasthan', rate: { male: 6, female: 5, joint: 6 }, registration: { pct: 1 } },
  { state: 'Sikkim', rate: 4, registration: { pct: 1 } },
  { state: 'Tamil Nadu', rate: 7, registration: { pct: 2 } },
  { state: 'Telangana', rate: 5.5, registration: { pct: 0.5 }, note: 'Includes 1.5% transfer duty.' },
  { state: 'Tripura', rate: 5, registration: { pct: 1 } },
  { state: 'Uttar Pradesh', rate: { male: 7, female: 6, joint: 6.5 }, registration: { pct: 1 }, note: 'Women’s 1% concession applies up to a property value cap.' },
  { state: 'Uttarakhand', rate: { male: 5, female: 3.75, joint: 4.375 }, registration: { pct: 2, cap: 25000 } },
  { state: 'West Bengal', rate: 6, registration: { pct: 1 }, note: '7% above ₹1 crore in urban areas.' },
];

export const MIN_VALUE = 500_000;
export const MAX_VALUE = 500_000_000;

export const hasGenderRates = (s: StateDuty) => typeof s.rate !== 'number';
export const rateFor = (s: StateDuty, buyer: Buyer) => (typeof s.rate === 'number' ? s.rate : s.rate[buyer]);

export function stampDuty(s: StateDuty, value: number, buyer: Buyer) {
  const pct = rateFor(s, buyer);
  const duty = Math.round((value * pct) / 100);
  const r = s.registration;
  let registration = r.womenFree && buyer === 'female' ? 0 : (value * r.pct) / 100;
  if (r.cap) registration = Math.min(registration, r.cap);
  registration = Math.round(registration);
  return { pct, duty, registration, total: duty + registration };
}

/** States where women pay a lower rate than men, for the women homebuyers page. */
export const WOMEN_CONCESSIONS = STAMP_DUTY.flatMap((s) => (typeof s.rate !== 'number' && s.rate.female < s.rate.male ? [{ state: s.state, male: s.rate.male, female: s.rate.female }] : []));
