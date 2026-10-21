// Interior estimators and design-idea gallery data. All rates are our own indicative prices (₹, 2026).
// See docs/functions/{interior-cost,modular-kitchen,design-ideas}/desc.md.

// ---------- Packages ----------
export type Tier = 'essential' | 'premium' | 'luxe';
export const TIERS: Record<Tier, { label: string; k: number; specs: string[] }> = {
  essential: { label: 'Essential', k: 1, specs: ['Pre-laminated MDF carcass', 'Laminate shutters in matt/suede finish', 'Soft-close hinges and channels', 'Standard handles and basic accessories'] },
  premium: { label: 'Premium', k: 1.35, specs: ['Pre-laminated HDHMR carcass (moisture resistant)', 'Gloss or textured laminates', 'Branded soft-close hardware', 'Pull-outs, organisers and profile handles'] },
  luxe: { label: 'Luxe', k: 1.8, specs: ['Post-laminated HDHMR with wide colour range', 'Acrylic, membrane, glass or PU shutters', 'Premium imported hardware', 'Corner and tall units, designer handles, bespoke detailing'] },
};

// ---------- Modular kitchen ----------
export const KITCHEN_SHAPES = {
  straight: { label: 'Straight', sides: ['A'] },
  l: { label: 'L-shaped', sides: ['A', 'B'] },
  parallel: { label: 'Parallel', sides: ['A', 'B'] },
  u: { label: 'U-shaped', sides: ['A', 'B', 'C'] },
  island: { label: 'Island', sides: ['A', 'Island'] },
} as const;
export type KitchenShape = keyof typeof KITCHEN_SHAPES;
/** Cabinet face area per running foot of counter (base + wall units), in sq ft. */
export const SQFT_PER_RUNNING_FT = 2.5;
export const KITCHEN_PACKAGES = {
  basic: { label: 'Basic', rate: 3900, board: 'MDF', counter: 'Granite 16 mm (black)', finish: 'Matt laminate', excludes: ['Appliances', 'Painting', 'Electrical changes'] },
  plus: { label: 'Plus', rate: 4500, board: 'HDHMR', counter: 'Granite 18 mm (galaxy)', finish: 'High-gloss laminate', excludes: ['Appliances', 'False ceiling', 'Wall tiles'] },
  signature: { label: 'Signature', rate: 5200, board: 'BWP plywood / HDHMR', counter: 'Quartz 20 mm', finish: 'Acrylic shutters', excludes: ['Appliances', 'False ceiling', 'Electrical and plumbing changes'] },
} as const;
export type KitchenPackage = keyof typeof KITCHEN_PACKAGES;
export const KITCHEN_ADDONS = [
  { id: 'chimney', label: 'Chimney (60 cm, auto-clean)', price: 18000 },
  { id: 'hob', label: 'Built-in hob (3 burner)', price: 14000 },
  { id: 'sink', label: 'Steel sink with faucet', price: 9000 },
  { id: 'tall', label: 'Tall pantry unit', price: 28000 },
  { id: 'lights', label: 'Under-cabinet lights', price: 6000 },
] as const;
export function kitchenCost(sidesFt: number[], pkg: KitchenPackage, addons: string[]) {
  const runningFt = sidesFt.reduce((s, x) => s + Math.max(0, x), 0);
  const sqft = SQFT_PER_RUNNING_FT * runningFt;
  const cabinets = Math.round(sqft * KITCHEN_PACKAGES[pkg].rate);
  const extras = KITCHEN_ADDONS.filter((a) => addons.includes(a.id)).reduce((s, a) => s + a.price, 0);
  return { runningFt, sqft, cabinets, extras, total: cabinets + extras };
}

// ---------- Full home estimator ----------
export const HOME_BHK = ['1 BHK', '2 BHK', '3 BHK', '4 BHK'] as const;
export const AREA_BANDS: Record<string, { label: string; sqft: number }[]> = {
  '1 BHK': [{ label: 'Up to 600 sq ft', sqft: 550 }, { label: '600–800 sq ft', sqft: 700 }],
  '2 BHK': [{ label: 'Up to 1,100 sq ft', sqft: 1000 }, { label: '1,100–1,400 sq ft', sqft: 1250 }],
  '3 BHK': [{ label: 'Up to 1,500 sq ft', sqft: 1400 }, { label: '1,500–2,100 sq ft', sqft: 1800 }, { label: 'Above 2,100 sq ft', sqft: 2300 }],
  '4 BHK': [{ label: 'Up to 3,500 sq ft', sqft: 3000 }, { label: 'Above 3,500 sq ft', sqft: 4000 }],
};
/** unit 'nos' = quantity; 'sqft' = area. price is the Essential rate per unit. */
export interface Item { id: string; name: string; unit: 'nos' | 'sqft'; price: number; qty: (bhk: number, area: number) => number; on?: boolean }
export interface Room { id: string; name: string; count: (bhk: number) => number; items: Item[] }
export const ROOMS: Room[] = [
  { id: 'living', name: 'Living room', count: () => 1, items: [
    { id: 'tv', name: 'TV unit', unit: 'nos', price: 32000, qty: () => 1, on: true },
    { id: 'shoe', name: 'Shoe rack', unit: 'nos', price: 14000, qty: () => 1, on: true },
    { id: 'panel', name: 'Wall panelling', unit: 'sqft', price: 450, qty: () => 60 },
    { id: 'ceiling', name: 'False ceiling', unit: 'sqft', price: 140, qty: (_b, a) => Math.round(a * 0.25), on: true },
    { id: 'sofa', name: 'Sofa set (loose)', unit: 'nos', price: 55000, qty: () => 1 },
  ] },
  { id: 'kitchen', name: 'Kitchen', count: () => 1, items: [
    { id: 'base', name: 'Base and wall cabinets', unit: 'sqft', price: 3900, qty: (b) => (b >= 3 ? 50 : 40), on: true },
    { id: 'tall', name: 'Tall pantry unit', unit: 'nos', price: 28000, qty: () => 1 },
    { id: 'kceiling', name: 'False ceiling', unit: 'sqft', price: 140, qty: () => 80 },
  ] },
  { id: 'master', name: 'Master bedroom', count: () => 1, items: [
    { id: 'wardrobe', name: 'Wardrobe (sliding / hinged)', unit: 'sqft', price: 1600, qty: () => 49, on: true },
    { id: 'bed', name: 'Bed with storage', unit: 'nos', price: 48000, qty: () => 1, on: true },
    { id: 'side', name: 'Side tables', unit: 'nos', price: 9000, qty: () => 2 },
    { id: 'dresser', name: 'Dressing unit', unit: 'nos', price: 22000, qty: () => 1 },
    { id: 'mceiling', name: 'False ceiling', unit: 'sqft', price: 140, qty: () => 150 },
  ] },
  { id: 'bedroom', name: 'Other bedrooms', count: (b) => Math.max(0, b - 1), items: [
    { id: 'bwardrobe', name: 'Wardrobe', unit: 'sqft', price: 1600, qty: () => 42, on: true },
    { id: 'bbed', name: 'Bed with storage', unit: 'nos', price: 40000, qty: () => 1, on: true },
    { id: 'study', name: 'Study table', unit: 'nos', price: 18000, qty: () => 1 },
  ] },
  { id: 'dining', name: 'Dining', count: () => 1, items: [
    { id: 'crockery', name: 'Crockery unit', unit: 'nos', price: 38000, qty: () => 1 },
    { id: 'table', name: 'Dining table set (loose)', unit: 'nos', price: 45000, qty: () => 1 },
  ] },
  { id: 'pooja', name: 'Pooja unit', count: () => 1, items: [{ id: 'mandir', name: 'Mandir unit', unit: 'nos', price: 30000, qty: () => 1 }] },
  { id: 'services', name: 'Painting & services', count: () => 1, items: [
    { id: 'paint', name: 'Wall painting (premium emulsion)', unit: 'sqft', price: 24, qty: (_b, a) => Math.round(a * 3.5), on: true },
    { id: 'electrical', name: 'Electrical points & lights', unit: 'nos', price: 1800, qty: (b) => 10 + b * 8 },
    { id: 'clean', name: 'Deep cleaning', unit: 'sqft', price: 6, qty: (_b, a) => a, on: true },
  ] },
];
export type Selection = Record<string, { on: boolean; qty: number }>; // key = `${roomId}:${itemId}`
export function defaultSelection(bhk: number, area: number): Selection {
  const s: Selection = {};
  for (const r of ROOMS) if (r.count(bhk) > 0) for (const i of r.items) s[`${r.id}:${i.id}`] = { on: !!i.on, qty: i.qty(bhk, area) };
  return s;
}
export function interiorEstimate(bhk: number, sel: Selection, tier: Tier) {
  const k = TIERS[tier].k;
  const rooms = ROOMS.filter((r) => r.count(bhk) > 0).map((r) => {
    const n = r.count(bhk);
    const lines = r.items.filter((i) => sel[`${r.id}:${i.id}`]?.on).map((i) => {
      const qty = sel[`${r.id}:${i.id}`].qty * n;
      // Services (painting, cleaning, electrical) don't change with the package.
      const price = Math.round(qty * i.price * (r.id === 'services' ? 1 : k));
      return { name: i.name, qty, unit: i.unit, price };
    });
    return { id: r.id, name: n > 1 ? `${r.name} (×${n})` : r.name, lines, total: lines.reduce((s, l) => s + l.price, 0) };
  }).filter((r) => r.lines.length);
  const total = rooms.reduce((s, r) => s + r.total, 0);
  return { rooms, total, low: Math.round(total * 0.92 / 1000) * 1000, high: Math.round(total * 1.1 / 1000) * 1000 };
}

// ---------- Design ideas ----------
export const IDEA_CATEGORIES = [
  { slug: 'living-room', name: 'Living Room', blurb: 'TV walls, seating layouts and lighting for the heart of the home.' },
  { slug: 'modular-kitchen', name: 'Modular Kitchen', blurb: 'L, U, parallel and island kitchens with smart storage.' },
  { slug: 'master-bedroom', name: 'Master Bedroom', blurb: 'Calm bedrooms with headboard walls and built-in storage.' },
  { slug: 'wardrobe', name: 'Wardrobe', blurb: 'Sliding, hinged and walk-in wardrobes for every room size.' },
  { slug: 'kids-room', name: 'Kids Room', blurb: 'Playful, safe rooms that grow with your child.' },
  { slug: 'bathroom', name: 'Bathroom', blurb: 'Vanities, tiles and wet-dry layouts for compact baths.' },
  { slug: 'pooja-mandir', name: 'Pooja Mandir', blurb: 'Wall-mounted, floor and room mandirs in wood and marble.' },
  { slug: 'dining-room', name: 'Dining Room', blurb: 'Dining nooks, crockery units and statement lights.' },
  { slug: 'false-ceiling', name: 'False Ceiling', blurb: 'Cove, coffered and layered ceilings with lighting.' },
  { slug: 'tv-unit', name: 'TV Unit', blurb: 'Wall-mounted, floor and panelled TV units.' },
  { slug: 'wall-paint', name: 'Wall Paint', blurb: 'Colour schemes and accent walls for every room.' },
  { slug: 'wall-design', name: 'Wall Design', blurb: 'Panelling, textures, wallpaper and art walls.' },
  { slug: 'tiles', name: 'Tiles', blurb: 'Floor and wall tile ideas with patterns and finishes.' },
  { slug: 'kitchen-tiles', name: 'Kitchen Tiles', blurb: 'Backsplash tiles that are easy to clean.' },
  { slug: 'balcony', name: 'Balcony', blurb: 'Seating, planters and decking for small balconies.' },
  { slug: 'study-room', name: 'Study Room', blurb: 'Work-from-home corners and study rooms.' },
  { slug: 'crockery-unit', name: 'Crockery Unit', blurb: 'Glass-front, open and hutch-style crockery units.' },
  { slug: 'staircase', name: 'Staircase', blurb: 'Railings, treads and under-stair storage.' },
  { slug: 'door', name: 'Door', blurb: 'Main doors, room doors and sliding partitions.' },
  { slug: 'window', name: 'Window', blurb: 'Window seats, frames and treatments.' },
] as const;
export const IDEA_FILTERS = {
  style: ['Modern', 'Contemporary', 'Minimalist', 'Traditional', 'Scandinavian', 'Industrial', 'Bohemian', 'Luxurious'],
  colour: ['White', 'Beige', 'Grey', 'Wooden brown', 'Blue', 'Green', 'Pink', 'Mustard'],
  size: ['Compact', 'Medium', 'Large'],
} as const;
export const COLOUR_HEX: Record<string, [string, string]> = {
  White: ['#f8f7f4', '#d9d4ca'], Beige: ['#efe3cf', '#c8ab7f'], Grey: ['#e4e6ea', '#8a919c'], 'Wooden brown': ['#ead8c3', '#8b5a2b'],
  Blue: ['#dfe9f5', '#2f5d8c'], Green: ['#e3efe4', '#4f7d55'], Pink: ['#f7e3e6', '#c46b7f'], Mustard: ['#f6ecd0', '#c99a2e'],
};
const FEATURES: Record<string, string[]> = {
  'living-room': ['marble TV wall', 'fluted panelling', 'L-shaped sofa', 'cove lighting', 'floating TV unit', 'reading corner'],
  'modular-kitchen': ['L-shaped layout', 'parallel layout', 'island counter', 'tall pantry', 'open shelves', 'breakfast counter'],
  'master-bedroom': ['upholstered headboard', 'walk-in wardrobe', 'study nook', 'accent wall', 'bay window seat', 'hidden lighting'],
};
export interface Idea { id: number; slug: string; category: string; title: string; style: string; colour: string; size: string; feature: string; cost: number }
const COST_BASE: Record<string, number> = { 'modular-kitchen': 220000, 'master-bedroom': 180000, 'living-room': 240000, wardrobe: 90000, bathroom: 85000, 'kids-room': 150000 };
/** Deterministic set of our own design ideas per category (24 each). */
export function ideasFor(category: string): Idea[] {
  const cat = IDEA_CATEGORIES.find((c) => c.slug === category);
  if (!cat) return [];
  const feats = FEATURES[category] ?? ['clean lines', 'warm lighting', 'hidden storage', 'textured finish', 'statement piece', 'natural materials'];
  const seed = [...category].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return Array.from({ length: 24 }, (_, i) => {
    const style = IDEA_FILTERS.style[(seed + i * 3) % IDEA_FILTERS.style.length];
    const colour = IDEA_FILTERS.colour[(seed + i * 5 + Math.floor(i / 8) * 3) % IDEA_FILTERS.colour.length];
    const size = IDEA_FILTERS.size[(seed + i) % 3];
    const feature = feats[(i * 7 + seed) % feats.length];
    const title = `${size} ${style} ${colour.toLowerCase()} ${cat.name.toLowerCase()} with ${feature}`;
    const cost = Math.round(((COST_BASE[category] ?? 70000) * (size === 'Compact' ? 0.75 : size === 'Large' ? 1.4 : 1) * (style === 'Luxurious' ? 1.6 : 1)) / 5000) * 5000;
    return { id: seed * 100 + i, slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${seed * 100 + i}`, category, title: title[0].toUpperCase() + title.slice(1), style, colour, size, feature, cost };
  });
}
