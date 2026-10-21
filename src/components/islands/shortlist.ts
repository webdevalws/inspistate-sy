// Shortlist: cached in localStorage on every device, and synced to the account when logged in.
export type ShortlistItem = { kind: 'listing' | 'project'; id: number };
const KEY = 'inspistate:shortlist';
const EVENT = 'inspistate:shortlist-change';

const loggedIn = () => typeof document !== 'undefined' && document.body.dataset.user === '1';

export function readShortlist(): ShortlistItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShortlistItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: ShortlistItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable (private mode) — the in-page state still updates
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function toggleShortlist(item: ShortlistItem): boolean {
  const items = readShortlist();
  const exists = items.some((i) => i.kind === item.kind && i.id === item.id);
  write(exists ? items.filter((i) => !(i.kind === item.kind && i.id === item.id)) : [...items, item]);
  if (loggedIn()) {
    fetch('/api/account/shortlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...item, saved: !exists }) }).catch(() => {});
  }
  return !exists;
}

export function onShortlistChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

let synced = false;
/** When logged in, the server list is the source of truth; pull it once per page load. */
export function syncShortlistFromServer() {
  if (synced || !loggedIn()) return;
  synced = true;
  fetch('/api/account/shortlist')
    .then((r) => r.json() as Promise<{ items: ShortlistItem[] | null }>)
    .then(({ items }) => items && write(items))
    .catch(() => {});
}
