// Small helpers shared by the account page (/account) and the agent dashboard (/account/agent).
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
/** Section heading style on the account pages. */
export const h2 = 'font-display text-xl font-bold tracking-tight !text-[#1C1A17] sm:text-2xl';
