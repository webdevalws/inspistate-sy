// Shared admin table and date helpers (AdminLayout pages). See docs/functions/admin/desc.md.
export const TABLE_WRAP = 'overflow-x-auto';
export const TABLE = 'w-full text-sm';
export const THEAD = 'bg-slate-100 text-left text-[13px] font-semibold text-slate-700';
export const TBODY = 'divide-y divide-slate-200';
export const TD = 'px-4 py-4 align-middle';
export const EMPTY = 'px-4 py-10 text-center text-slate-500';

export const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

/** A green "done" note (most admin actions redirect back with ?done=…). */
export const NOTE_OK = 'mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800';
export const NOTE_ERR = 'mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700';
