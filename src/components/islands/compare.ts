// Project comparison list (max 3), kept per device.
const KEY = 'inspistate:compare';
const EVENT = 'inspistate:compare-change';
export const COMPARE_MAX = 3;

export function readCompare(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as number[];
  } catch {
    return [];
  }
}

export function writeCompare(ids: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, COMPARE_MAX)));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onCompareChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
