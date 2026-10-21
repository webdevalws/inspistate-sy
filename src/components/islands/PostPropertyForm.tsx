import { useEffect, useState } from 'react';

interface Props { cities: { slug: string; name: string; localities: { slug: string; name: string }[] }[] }

const STEPS = ['Basics', 'Location', 'Details', 'Photos', 'Contact'];
const MAX_PHOTOS = 8;
const MAX_BYTES = 5 * 1024 * 1024;

export default function PostPropertyForm({ cities }: Props) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'editing' | 'sending' | 'done'>('editing');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ id: number; previewUrl: string } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [data, setData] = useState({ purpose: 'Sell', segment: 'Residential', type: 'Apartment', city: cities[0].slug, locality: '', bhk: '2', area: '', price: '', furnishing: 'Semi-Furnished', description: '', name: '', phone: '' });
  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setData({ ...data, [k]: e.target.value });
  const localities = cities.find((c) => c.slug === data.city)?.localities ?? [];

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const incoming = [...list];
    const tooBig = incoming.find((f) => f.size > MAX_BYTES);
    if (tooBig) return setError(`${tooBig.name} is larger than 5 MB.`);
    if (incoming.some((f) => !/^image\/(jpeg|png|webp)$/.test(f.type))) return setError('Only JPEG, PNG or WebP images are allowed.');
    setError('');
    setPhotos((prev) => [...prev, ...incoming].slice(0, MAX_PHOTOS));
  }

  async function submit() {
    setStatus('sending');
    setError('');
    const fd = new FormData();
    fd.set('purpose', data.purpose === 'Sell' ? 'buy' : 'rent');
    fd.set('segment', data.segment.toLowerCase());
    for (const k of ['type', 'city', 'locality', 'bhk', 'area', 'price', 'furnishing', 'description', 'name', 'phone'] as const) fd.set(k, data[k]);
    photos.forEach((p) => fd.append('photos', p));
    try {
      const res = await fetch('/api/listings', { method: 'POST', body: fd });
      const body = (await res.json()) as { id: number; previewUrl: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Something went wrong');
      setResult(body);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('editing');
    }
  }

  if (status === 'done' && result)
    return (
      <div className="card p-10 text-center">
        <p className="text-4xl">🎉</p>
        <p className="mt-2 text-lg font-bold">Listing #{result.id} submitted for review</p>
        <p className="mt-1 text-sm text-slate-500">Our team verifies new listings within 24 hours. Save this link to see your listing while it's under review:</p>
        <a href={result.previewUrl} className="btn-primary mt-4">View my listing</a>
      </div>
    );

  const Choice = ({ field, options }: { field: keyof typeof data; options: string[] }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => setData({ ...data, [field]: o, ...(field === 'segment' ? { type: o === 'Residential' ? 'Apartment' : 'Office' } : {}) })} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${data[field] === o ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-700'}`}>{o}</button>
      ))}
    </div>
  );

  return (
    <form
      className="card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (step < STEPS.length - 1) setStep(step + 1);
        else submit();
      }}
    >
      <ol className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
            <p className={`mt-1.5 text-xs font-semibold ${i === step ? 'text-brand-700' : 'text-slate-400'}`}>{s}</p>
          </li>
        ))}
      </ol>

      <div className="space-y-5">
        {step === 0 && (
          <>
            <div><p className="mb-2 text-sm font-medium">I want to</p><Choice field="purpose" options={['Sell', 'Rent out']} /></div>
            <div><p className="mb-2 text-sm font-medium">Property category</p><Choice field="segment" options={['Residential', 'Commercial']} /></div>
            <div><p className="mb-2 text-sm font-medium">Property type</p><Choice field="type" options={data.segment === 'Residential' ? ['Apartment', 'Builder Floor', 'Villa', 'Plot'] : ['Office', 'Shop']} /></div>
          </>
        )}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">City<select className="input mt-1" value={data.city} onChange={(e) => setData({ ...data, city: e.target.value, locality: '' })}>{cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
            <label className="text-sm font-medium">Locality<select required className="input mt-1" value={data.locality} onChange={set('locality')}><option value="">Select</option>{localities.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select></label>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.segment === 'Residential' && data.type !== 'Plot' && (
              <label className="text-sm font-medium">BHK<select className="input mt-1" value={data.bhk} onChange={set('bhk')}>{['1', '2', '3', '4', '5'].map((b) => <option key={b}>{b}</option>)}</select></label>
            )}
            <label className="text-sm font-medium">Area (sq.ft)<input required type="number" min={50} className="input mt-1" value={data.area} onChange={set('area')} /></label>
            <label className="text-sm font-medium">{data.purpose === 'Sell' ? 'Expected price (₹)' : 'Monthly rent (₹)'}<input required type="number" min={data.purpose === 'Sell' ? 100000 : 1000} className="input mt-1" value={data.price} onChange={set('price')} /></label>
            {data.type !== 'Plot' && (
              <label className="text-sm font-medium">Furnishing<select className="input mt-1" value={data.furnishing} onChange={set('furnishing')}>{['Furnished', 'Semi-Furnished', 'Unfurnished'].map((f) => <option key={f}>{f}</option>)}</select></label>
            )}
            <label className="text-sm font-medium sm:col-span-2">Description (optional)<textarea maxLength={2000} rows={4} className="input mt-1" value={data.description} onChange={set('description')} placeholder="What makes your property special? Nearby schools, view, parking…" /></label>
          </div>
        )}
        {step === 3 && (
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50/40">
              <span className="text-2xl">📷</span>
              <span className="mt-1 font-semibold text-slate-700">Add photos</span>
              <span>JPEG, PNG or WebP · up to {MAX_PHOTOS} photos · 5 MB each</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
            </label>
            {previews.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {previews.map((src, i) => (
                  <li key={src} className="relative overflow-hidden rounded-xl border border-slate-200">
                    <img src={src} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">COVER</span>}
                    <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-xs font-bold text-slate-700 shadow">✕</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">Listings with photos get far more enquiries. You can skip this step.</p>
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Your name<input required maxLength={100} className="input mt-1" value={data.name} onChange={set('name')} /></label>
            <label className="text-sm font-medium">Mobile number<input required pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" className="input mt-1" value={data.phone} onChange={set('phone')} inputMode="tel" /></label>
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className="btn-ghost disabled:invisible">Back</button>
        <button className="btn-primary" disabled={status === 'sending'}>
          {step === STEPS.length - 1 ? (status === 'sending' ? 'Submitting…' : 'Submit listing') : 'Continue'}
        </button>
      </div>
    </form>
  );
}
