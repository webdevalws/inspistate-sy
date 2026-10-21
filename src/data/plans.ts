// Account roles and agent subscription plans. Edit prices and perks here; every page reads from this file.
export type Role = 'user' | 'seller' | 'agent';
export type PlanKey = 'yearly' | 'half-yearly';

export const ROLES: { key: Role; label: string; sub: string; perks: string[] }[] = [
  // Shown as "Buyer"; the stored role value stays 'user'.
  { key: 'user', label: 'Buyer', sub: 'Buy or rent a home', perks: ['Shortlist & compare homes', 'Saved searches', 'Contact owners and agents'] },
  { key: 'seller', label: 'Seller', sub: '3 free listings', perks: ['List your own property', 'Leads from interested buyers', 'Listing performance dashboard'] },
  { key: 'agent', label: 'Agent', sub: 'Unlimited with a plan', perks: ['3 free listings to start', 'Unlimited listings with a plan', 'Buyer leads on every listing'] },
];

/** Listings a role may have live or under review at once without a plan (null = unlimited). */
export const FREE_LISTINGS: Record<Role, number> = { user: 0, seller: 3, agent: 3 };

export const PLANS: { key: PlanKey; name: string; price: number; mrp: number; months: number; icon: 'crown' | 'gem' }[] = [
  { key: 'yearly', name: 'Yearly Plan', price: 9999, mrp: 14000, months: 12, icon: 'crown' },
  { key: 'half-yearly', name: 'Half-Yearly Plan', price: 5999, mrp: 7000, months: 6, icon: 'gem' },
];

export const PLAN_FEATURES = ['Unlimited listings', 'Buyer phone numbers on every lead', 'Priority listing review', 'Dedicated relationship manager'];

export const roleLabel = (r: Role | null | undefined) => ROLES.find((x) => x.key === r)?.label ?? 'Member';
export const isRole = (v: unknown): v is Role => v === 'user' || v === 'seller' || v === 'agent';
export const planByKey = (k: unknown) => PLANS.find((p) => p.key === k);
