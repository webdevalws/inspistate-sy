import { useEffect, useMemo, useRef, useState } from 'react';
import { DIRECTIONS, ROOMS, ROOM_TYPES, vastuReport, type RoomPoint, type RoomType } from '../../data/vastu';
import LeadDialog from './LeadDialog';

// Floor-plan Vastu analyzer: Upload → Set orientation → Confirm centre → Verify rooms → Report.
// Flow and maths documented in docs/functions/vastu/desc.md.
const MAX_BYTES = 5 * 1024 * 1024;
const STEPS = ['Upload floor plan', 'Set orientation', 'Confirm centre point', 'Verify room labels', 'Get report'];
const RATING_STYLE = { Best: 'bg-emerald-100 text-emerald-800', Good: 'bg-sky-100 text-sky-800', Poor: 'bg-amber-100 text-amber-800', Danger: 'bg-rose-100 text-rose-800' } as const;
const uid = () => Math.random().toString(36).slice(2, 9);

/** Downscale to ≤1600 px and return base64 JPEG for the detection API. */
async function toDetectionImage(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1];
}

export default function VastuAnalyzer() {
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<{ src: string; w: number; h: number } | null>(null);
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [points, setPoints] = useState<RoomPoint[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addType, setAddType] = useState<RoomType | ''>('');
  const [detect, setDetect] = useState<{ state: 'idle' | 'running' | 'done' | 'failed'; message?: string; northFound?: boolean }>({ state: 'idle' });
  const dragging = useRef<{ kind: 'center' | 'point'; id?: string } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const aspect = image ? image.w / image.h : 1;

  async function onFile(file: File | undefined) {
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) return setError('Choose a JPG or PNG image.');
    if (file.size > MAX_BYTES) return setError('File is too large. Maximum size is 5 MB.');
    const src = URL.createObjectURL(file);
    const probe = new Image();
    probe.src = src;
    await probe.decode().catch(() => null);
    if (!probe.naturalWidth) return setError('Could not read this image.');
    setImage({ src, w: probe.naturalWidth, h: probe.naturalHeight });
    setPoints([]); setCenter({ x: 0.5, y: 0.5 }); setRotation(0);
    setStep(1);
    // Detect rooms in the background while the user sets orientation and centre.
    setDetect({ state: 'running' });
    try {
      const res = await fetch('/api/tools/vastu-detect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: await toDetectionImage(src), mediaType: 'image/jpeg' }) });
      const b = (await res.json()) as { rooms?: { type: RoomType; x: number; y: number }[]; northRotation?: number | null; error?: string };
      if (!res.ok || !b.rooms) throw new Error(b.error ?? 'Detection failed. Mark rooms manually.');
      setPoints(b.rooms.map((r) => ({ id: uid(), type: r.type, x: r.x, y: r.y })));
      if (typeof b.northRotation === 'number') setRotation(b.northRotation);
      setDetect({ state: 'done', message: `${b.rooms.length} rooms detected — please verify.`, northFound: typeof b.northRotation === 'number' });
    } catch (e) {
      setDetect({ state: 'failed', message: (e as Error).message });
    }
  }

  function toNorm(e: React.PointerEvent) {
    const r = imgRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragging.current;
    if (!d) return;
    const p = toNorm(e);
    if (d.kind === 'center') setCenter(p);
    else setPoints((ps) => ps.map((q) => (q.id === d.id ? { ...q, ...p } : q)));
  }
  function onCanvasClick(e: React.PointerEvent) {
    if (step === 2) setCenter(toNorm(e));
    if (step === 3 && addType) {
      const id = uid();
      setPoints((ps) => [...ps, { id, type: addType, ...toNorm(e) }]);
      setSelected(id);
      setAddType('');
    }
  }

  const report = useMemo(() => vastuReport(points, center, rotation, aspect), [points, center, rotation, aspect]);
  const sel = points.find((p) => p.id === selected);

  // Sector guide lines from the centre, in image pixel space.
  const sectorLines = image ? Array.from({ length: 8 }, (_, k) => {
    const a = ((rotation + 22.5 + k * 45) * Math.PI) / 180;
    const L = Math.hypot(image.w, image.h);
    return { x1: center.x * image.w, y1: center.y * image.h, x2: center.x * image.w + Math.sin(a) * L, y2: center.y * image.h - Math.cos(a) * L };
  }) : [];
  const labelPos = (k: number) => {
    const a = ((rotation + k * 45) * Math.PI) / 180, r = 0.42 * Math.min(image!.w, image!.h);
    return { x: center.x * image!.w + Math.sin(a) * r, y: center.y * image!.h - Math.cos(a) * r };
  };

  useEffect(() => () => { if (image) URL.revokeObjectURL(image.src); }, [image]);

  const canvas = image && (
    <div className="relative mx-auto inline-block max-w-full select-none" onPointerMove={onPointerMove} onPointerUp={() => (dragging.current = null)} onPointerLeave={() => (dragging.current = null)}>
      <img ref={imgRef} src={image.src} alt="Your floor plan" className="block max-h-[70vh] w-auto max-w-full rounded-lg border border-neutral-200" draggable={false} onPointerDown={onCanvasClick} style={{ cursor: step === 2 || (step === 3 && addType) ? 'crosshair' : 'default' }} />
      {step >= 2 && (
        <svg viewBox={`0 0 ${image.w} ${image.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {sectorLines.map((l, i) => <line key={i} {...l} stroke="#9a724a" strokeOpacity="0.45" strokeWidth={Math.max(image.w, image.h) / 400} strokeDasharray="8 6" />)}
          {DIRECTIONS.map((d, k) => { const p = labelPos(k); return <text key={d} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(image.w, image.h) / 40} fontWeight="700" fill="#9a724a" stroke="#fff" strokeWidth={Math.max(image.w, image.h) / 300} paintOrder="stroke">{d.replace(/orth|outh|ast|est/g, '').toUpperCase()}</text>; })}
        </svg>
      )}
      {step === 1 && (
        <div className="pointer-events-none absolute right-3 top-3 grid h-28 w-28 place-items-center rounded-full bg-white/90 shadow-lg ring-1 ring-neutral-200">
          <svg viewBox="-50 -50 100 100" className="h-24 w-24 transition-transform" style={{ transform: `rotate(${rotation}deg)` }} aria-label={`North rotated ${rotation} degrees`}>
            <circle r="46" fill="none" stroke="#d4cabd" strokeWidth="2" />
            <path d="M0 -42 L9 0 L0 -6 L-9 0Z" fill="#e11d48" /><path d="M0 42 L9 0 L0 6 L-9 0Z" fill="#94a3b8" />
            <text y="-30" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1c1a17" transform="translate(0 -4)">N</text>
          </svg>
        </div>
      )}
      {step >= 2 && step <= 3 && (
        <button type="button" aria-label="Home centre point" onPointerDown={(e) => { e.stopPropagation(); if (step === 2) dragging.current = { kind: 'center' }; }}
          className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-violet-600 shadow-lg" style={{ left: `${center.x * 100}%`, top: `${center.y * 100}%`, cursor: step === 2 ? 'grab' : 'default' }} />
      )}
      {step >= 3 && points.map((p) => {
        const row = report.rows.find((r) => r.id === p.id);
        return (
          <button key={p.id} type="button" onPointerDown={(e) => { e.stopPropagation(); if (step === 3) { dragging.current = { kind: 'point', id: p.id }; setSelected(p.id); } }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold shadow ring-2 ${selected === p.id && step === 3 ? 'ring-brand-900' : 'ring-white'} ${row?.rating ? RATING_STYLE[row.rating] : 'bg-white text-neutral-700'}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, cursor: step === 3 ? 'grab' : 'default' }}>
            {ROOMS[p.type].label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <ol className="mb-6 grid grid-cols-5 gap-2 print:hidden">
        {STEPS.map((s, i) => (
          <li key={s}><div className={`h-1.5 rounded-full ${i <= step ? 'bg-violet-600' : 'bg-neutral-200'}`} /><p className={`mt-1.5 hidden text-xs font-semibold sm:block ${i === step ? 'text-brand-900' : 'text-neutral-400'}`}>{i + 1}. {s}</p></li>
        ))}
      </ol>

      {step === 0 && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-14 text-center hover:border-violet-500"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
          <span className="text-4xl" aria-hidden="true">🧭</span>
          <span className="mt-3 text-lg font-bold text-brand-900">Upload your floor plan</span>
          <span className="mt-1 text-sm text-neutral-600">Click or drop a file · JPG or PNG · max 5 MB</span>
          <span className="mt-4 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">Choose file</span>
          <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          {error && <span className="mt-3 text-sm font-medium text-rose-600">{error}</span>}
        </label>
      )}

      {step > 0 && step < 4 && image && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="text-center print:hidden">{canvas}</div>
          <aside className="space-y-4 print:hidden">
            {detect.state === 'running' && <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-800">⏳ Detecting rooms on your plan…</p>}
            {detect.state === 'done' && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">✓ {detect.message}</p>}
            {detect.state === 'failed' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{detect.message}</p>}

            {step === 1 && (
              <div className="space-y-3">
                <h3 className="font-bold">Are you set with orientation?</h3>
                <p className="text-sm text-neutral-600">Find the North arrow on your plan, then rotate the dial until its red North needle points the same way.{detect.northFound && ' We pre-set it from the arrow on your plan.'}</p>
                <div className="flex items-center gap-3">
                  <button type="button" className="btn-ghost" onClick={() => setRotation((r) => (r - 22.5 + 360) % 360)} aria-label="Rotate left">⟲ Left</button>
                  <span className="w-16 text-center font-mono text-sm">{rotation}°</span>
                  <button type="button" className="btn-ghost" onClick={() => setRotation((r) => (r + 22.5) % 360)} aria-label="Rotate right">Right ⟳</button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <h3 className="font-bold">Set your home's centre</h3>
                <p className="text-sm text-neutral-600">Drag the purple dot (or click the plan) to the middle of your home — the midpoint between outer walls. Avoid stair voids and cut-outs.</p>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <h3 className="font-bold">Check detected rooms</h3>
                <p className="text-sm text-neutral-600">Drag labels onto the right room, change a label's type, or add missing rooms.</p>
                <div className="flex gap-2">
                  <select className="input py-2" value={addType} onChange={(e) => setAddType(e.target.value as RoomType)} aria-label="Room type to add">
                    <option value="">+ Add a room…</option>
                    {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOMS[t].label}</option>)}
                  </select>
                </div>
                {addType && <p className="text-xs font-medium text-violet-700">Now click on the plan where the {ROOMS[addType].label.toLowerCase()} is.</p>}
                {sel && (
                  <div className="rounded-xl border border-neutral-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">Selected room</p>
                    <select className="input py-2" value={sel.type} onChange={(e) => setPoints((ps) => ps.map((p) => (p.id === sel.id ? { ...p, type: e.target.value as RoomType } : p)))}>{ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOMS[t].label}</option>)}</select>
                    <button type="button" className="mt-2 text-sm font-semibold text-rose-600 hover:underline" onClick={() => { setPoints((ps) => ps.filter((p) => p.id !== sel.id)); setSelected(null); }}>Delete room point</button>
                  </div>
                )}
                <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                  {report.rows.map((r) => <li key={r.id}><button type="button" onClick={() => setSelected(r.id)} className={`flex w-full justify-between rounded-md px-2 py-1 text-left hover:bg-neutral-100 ${selected === r.id ? 'bg-neutral-100' : ''}`}><span>{r.label}</span><span className="text-neutral-500">{r.direction}</span></button></li>)}
                  {points.length === 0 && <li className="text-neutral-500">No rooms yet — add them with the menu above.</li>}
                </ul>
              </div>
            )}
            {step < 4 && (
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>
                <button type="button" className="btn-primary flex-1" disabled={step === 3 && points.length === 0} onClick={() => setStep(step + 1)}>{step === 3 ? 'Generate report' : 'Next'}</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {step === 4 && image && (
        <div className="mt-6 space-y-6" id="vastu-report">
          <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-brand-900 p-6 text-white">
            <div className="grid h-28 w-28 place-items-center rounded-full border-8 border-accent-500"><span className="text-3xl font-bold">{report.score}%</span></div>
            <div className="flex-1"><p className="text-sm text-white/70">Your home's Vastu score</p><p className="text-2xl font-bold">{report.verdict}</p><p className="mt-1 text-sm text-white/80">{report.rows.length} rooms analysed · {report.issues.length} need attention</p></div>
            <div className="flex gap-2 print:hidden"><button className="btn-ghost" onClick={() => setStep(3)}>Edit rooms</button><button className="btn-primary" onClick={() => window.print()}>⤓ Download report</button></div>
          </div>
          <div className="text-center">{canvas}</div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500"><tr><th className="px-3 py-2">Room</th><th>Direction</th><th>Vastu status</th><th>Ideal directions</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {report.rows.map((r) => <tr key={r.id}><td className="px-3 py-2 font-medium">{r.label}</td><td>{r.direction}</td><td>{r.rating ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RATING_STYLE[r.rating]}`}>{r.rating}</span> : '—'}</td><td className="text-neutral-600">{r.best.join(', ')}</td></tr>)}
              </tbody>
            </table>
          </div>
          {report.issues.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-bold">Remedies</h3>
              <ul className="space-y-3">{report.issues.map((r) => <li key={r.id} className="rounded-xl border border-neutral-200 p-4"><p className="font-semibold text-brand-900">{r.label} in the {r.direction} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${RATING_STYLE[r.rating!]}`}>{r.rating}</span></p><p className="mt-1 text-sm text-neutral-600">{ROOMS[r.type].remedy} Ideal: {r.best.join(', ')}.</p></li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-violet-50 p-5 print:hidden">
            <p className="flex-1 text-sm text-violet-900">Want a personalised consultation with a Vastu expert for your home?</p>
            <LeadDialog kind="callback" label="Talk to a Vastu expert" subject={`Vastu consultation (score ${report.score}%)`} className="btn-dark" />
            <button className="btn-ghost" onClick={() => { setStep(0); setImage(null); setPoints([]); setDetect({ state: 'idle' }); }}>Analyse another plan</button>
          </div>
          <p className="text-xs text-neutral-500">Based on commonly followed Vastu Shastra guidance. Directions are computed from your plan's centre and the North you set.</p>
        </div>
      )}
    </div>
  );
}
