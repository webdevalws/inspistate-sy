import { useEffect, useRef, useState } from 'react';
import AuthFlow from './AuthFlow';
import type { Role } from '../../data/plans';
import { roleForNext, safeNext } from '../../lib/redirect';

// Site-wide login dialog. Any element with `data-auth-open` opens it (optionally `data-auth-next="/path"`);
// without JavaScript those elements are plain links to /login, so nothing breaks.
interface Props {
  cities: { slug: string; name: string }[];
  /** Logged in but registration never finished: open straight at the register step. */
  needsRegistration?: boolean;
  phone?: string;
}

export default function AuthDialog({ cities, needsRegistration = false, phone = '' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('user');
  const [key, setKey] = useState(0); // remount the flow so each opening starts fresh

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-auth-open]');
      if (!el) return;
      e.preventDefault();
      const n = safeNext(el.dataset.authNext);
      setNext(n);
      setRole(roleForNext(n));
      setKey((k) => k + 1);
      setOpen(true);
    };
    document.addEventListener('click', onClick);
    // Nudge accounts that verified their number but never picked a role — once per browser session.
    try {
      if (needsRegistration && !sessionStorage.getItem('is_reg_prompted')) {
        sessionStorage.setItem('is_reg_prompted', '1');
        setOpen(true);
      }
    } catch { /* storage blocked: skip the nudge */ }
    return () => document.removeEventListener('click', onClick);
  }, [needsRegistration]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === ref.current && setOpen(false)}
      aria-label="Login or register"
      className="m-auto w-[min(460px,calc(100vw-1.5rem))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-sand-50 p-0 text-[#1C1A17] shadow-[0_40px_80px_-20px_rgba(28,26,23,0.6)] backdrop:bg-[#1C1A17]/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b-[0.5px] border-[#1C1A17]/15 px-5 py-3.5 sm:px-6">
        <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.02em] [font-stretch:115%]">InspiState</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 cursor-pointer place-items-center border-[0.5px] border-[#1C1A17]/25 transition hover:bg-[#1C1A17] hover:text-sand-50">✕</button>
      </div>
      <div className="p-5 sm:p-6">
        {open && <AuthFlow key={key} cities={cities} next={next} defaultRole={role} startAt={needsRegistration ? 'register' : 'phone'} knownPhone={phone} />}
      </div>
    </dialog>
  );
}
