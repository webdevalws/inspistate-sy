const inr = new Intl.NumberFormat('en-IN');

/** ₹45 L, ₹1.25 Cr — Indian short form used across the UI. */
export function formatPrice(n: number): string {
  if (n >= 1e7) return `₹${trim(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)} L`;
  return `₹${inr.format(n)}`;
}

export function formatRent(n: number): string {
  return `₹${inr.format(n)}/month`;
}

export function formatNumber(n: number): string {
  return inr.format(Math.round(n));
}

export function formatRate(n: number): string {
  return `₹${inr.format(Math.round(n))}/sq.ft`;
}

function trim(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function plural(n: number, word: string): string {
  return `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
}

export function postedAgo(days: number): string {
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`;
}
