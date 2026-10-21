// Generates the site's illustrated imagery into public/images/*.svg.
// Run: node db/build-images.ts
// Every file name is stable — drop a real photo with the same name (e.g. hero.jpg + update the
// reference) to replace an illustration later.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/images/', import.meta.url);
mkdirSync(OUT, { recursive: true });

let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a: number, b: number) => a + rand() * (b - a);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const f = (n: number) => n.toFixed(1);

type Sky = 'day' | 'golden' | 'dusk' | 'night';
const SKIES: Record<Sky, [string, string, string]> = {
  day: ['#5ea6e6', '#9fd0f5', '#e8f4fc'],
  golden: ['#4f7fc4', '#f2b97a', '#ffe2b0'],
  dusk: ['#1d2f5c', '#b56a6a', '#f7a85c'],
  night: ['#0b1428', '#1d2d55', '#4b4f7a'],
};

function sky(w: number, h: number, kind: Sky, id: string) {
  const [a, b, c] = SKIES[kind];
  const sun = kind === 'golden' || kind === 'dusk'
    ? `<circle cx="${f(w * between(0.55, 0.8))}" cy="${f(h * 0.62)}" r="${f(h * 0.08)}" fill="#fff3c4" opacity="0.9"/><circle cx="${f(w * 0.68)}" cy="${f(h * 0.62)}" r="${f(h * 0.3)}" fill="#ffd27a" opacity="0.18"/>`
    : '';
  const clouds = kind === 'day' || kind === 'golden'
    ? Array.from({ length: 4 }, () => {
        const cx = between(0, w), cy = between(h * 0.08, h * 0.35), s = between(0.6, 1.4);
        return `<g fill="#fff" opacity="${kind === 'day' ? 0.85 : 0.45}"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(40 * s)}" ry="${f(12 * s)}"/><ellipse cx="${f(cx + 22 * s)}" cy="${f(cy - 8 * s)}" rx="${f(24 * s)}" ry="${f(12 * s)}"/></g>`;
      }).join('')
    : Array.from({ length: 40 }, () => `<circle cx="${f(between(0, w))}" cy="${f(between(0, h * 0.4))}" r="${f(between(0.5, 1.3))}" fill="#fff" opacity="${f(between(0.2, 0.7))}"/>`).join('');
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#${id})"/>${sun}${clouds}`;
}

const lit = (k: Sky) => (k === 'night' || k === 'dusk' ? 0.55 : k === 'golden' ? 0.25 : 0.06);
const winColor = (k: Sky) => (k === 'day' ? '#cfe3f3' : '#ffd88a');

/** A residential tower with balconies and windows. */
function tower(x: number, base: number, w: number, h: number, k: Sky, body = '#e9e4dc', trim = '#c9bfb2') {
  const parts = [`<rect x="${f(x)}" y="${f(base - h)}" width="${f(w)}" height="${f(h)}" fill="${body}"/>`,
    `<rect x="${f(x + w * 0.82)}" y="${f(base - h)}" width="${f(w * 0.18)}" height="${f(h)}" fill="${trim}" opacity="0.7"/>`,
    `<rect x="${f(x - 2)}" y="${f(base - h - 4)}" width="${f(w + 4)}" height="4" fill="${trim}"/>`];
  const rows = Math.floor(h / 11), cols = Math.max(2, Math.floor(w / 9));
  for (let r = 1; r < rows; r++) {
    const y = base - h + r * 11;
    parts.push(`<rect x="${f(x)}" y="${f(y + 6)}" width="${f(w)}" height="1.4" fill="${trim}"/>`);
    for (let c = 0; c < cols; c++) {
      const on = rand() < lit(k);
      parts.push(`<rect x="${f(x + 3 + c * ((w - 6) / cols))}" y="${f(y)}" width="${f((w - 6) / cols - 2.5)}" height="5" fill="${on ? winColor(k) : k === 'day' ? '#7fa5c4' : '#3b4a66'}" opacity="${on ? 0.95 : 0.8}"/>`);
    }
  }
  return parts.join('');
}

function trees(w: number, base: number, n: number, dark = false) {
  return Array.from({ length: n }, () => {
    const x = between(-10, w + 10), s = between(0.7, 1.5);
    const g = dark ? pick(['#1f3b2c', '#244534', '#1a3326']) : pick(['#3f8a4a', '#4f9a52', '#2f7a43', '#5ba35a']);
    return `<rect x="${f(x - 1.5 * s)}" y="${f(base - 14 * s)}" width="${f(3 * s)}" height="${f(14 * s)}" fill="#5b4632"/><circle cx="${f(x)}" cy="${f(base - 20 * s)}" r="${f(11 * s)}" fill="${g}"/><circle cx="${f(x + 7 * s)}" cy="${f(base - 15 * s)}" r="${f(8 * s)}" fill="${g}" opacity="0.9"/>`;
  }).join('');
}

function ground(w: number, h: number, y: number, k: Sky, kind: 'lawn' | 'water' | 'plaza') {
  if (kind === 'water') {
    const ripples = Array.from({ length: 14 }, () => `<rect x="${f(between(0, w))}" y="${f(between(y + 6, h))}" width="${f(between(20, 70))}" height="1.5" fill="#fff" opacity="0.35"/>`).join('');
    return `<rect y="${y}" width="${w}" height="${h - y}" fill="${k === 'night' || k === 'dusk' ? '#24365e' : '#4a90c9'}"/>${ripples}`;
  }
  if (kind === 'plaza') return `<rect y="${y}" width="${w}" height="${h - y}" fill="#d9cdb8"/><rect y="${y}" width="${w}" height="6" fill="#bfae92"/>`;
  return `<rect y="${y}" width="${w}" height="${h - y}" fill="${k === 'night' ? '#20402c' : '#6fae5c'}"/><path d="M0 ${y + 18} Q${w / 2} ${y + 4} ${w} ${y + 22} L${w} ${h} L0 ${h}Z" fill="${k === 'night' ? '#1a3624' : '#5c9f4e'}"/>`;
}

function svg(w: number, h: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}

const out: Record<string, string> = {};

// ---------- Project / apartment scenes ----------
const BODIES: [string, string][] = [['#ece6dc', '#c8bba8'], ['#e3e7ec', '#aeb8c4'], ['#f1ece4', '#d4c2a5'], ['#dfe3e8', '#9ba8b8'], ['#efe9e1', '#bfa98d']];
function projectScene(name: string, k: Sky, nTowers: number, ground_: 'lawn' | 'water' | 'plaza' = 'lawn') {
  const W = 480, H = 300, base = 232;
  const [body, trim] = pick(BODIES);
  const towers: string[] = [];
  for (let i = 0; i < nTowers; i++) {
    const w = between(48, 70), h = between(120, 200);
    const x = 30 + (i * (W - 80)) / nTowers + between(-10, 10);
    towers.push(tower(x, base, w, h, k, body, trim));
  }
  const bg = Array.from({ length: 10 }, () => `<rect x="${f(between(0, W))}" y="${f(base - between(40, 110))}" width="${f(between(18, 34))}" height="200" fill="${k === 'day' ? '#b9cde0' : '#3a4566'}" opacity="0.6"/>`).join('');
  out[name] = svg(W, H, sky(W, H, k, 's') + bg + towers.join('') + ground(W, H, base, k, ground_) + trees(W, base + 8, 9, k === 'night'));
}
seed = 11; projectScene('project-1', 'golden', 3);
seed = 12; projectScene('project-2', 'day', 2);
seed = 13; projectScene('project-3', 'golden', 4);
seed = 14; projectScene('project-4', 'day', 3);
seed = 15; projectScene('project-5', 'dusk', 3);
seed = 16; projectScene('project-6', 'day', 4, 'plaza');
seed = 17; projectScene('apt-2bhk', 'day', 2);
seed = 18; projectScene('apt-3bhk', 'golden', 3);
seed = 19; projectScene('apt-4bhk', 'day', 2, 'plaza');
seed = 20; projectScene('builder-floor', 'day', 4);
seed = 21; projectScene('office', 'day', 2, 'plaza');

// ---------- Villa ----------
function villa(name: string, k: Sky, W = 480, H = 300) {
  const base = H * 0.78, lights = k === 'dusk' || k === 'night';
  const glass = lights ? '#ffcf7a' : '#9ec3df';
  const house = `<rect x="${W * 0.22}" y="${base - 110}" width="${W * 0.56}" height="110" fill="${lights ? '#2c3550' : '#f4f1ec'}"/>
<rect x="${W * 0.18}" y="${base - 118}" width="${W * 0.64}" height="10" fill="${lights ? '#1b2238' : '#3d3a36'}"/>
<rect x="${W * 0.3}" y="${base - 190}" width="${W * 0.36}" height="72" fill="${lights ? '#323d5c' : '#ebe6de'}"/>
<rect x="${W * 0.27}" y="${base - 198}" width="${W * 0.42}" height="9" fill="${lights ? '#1b2238' : '#3d3a36'}"/>
<rect x="${W * 0.33}" y="${base - 178}" width="${W * 0.3}" height="48" fill="${glass}" opacity="0.9"/>
<rect x="${W * 0.26}" y="${base - 92}" width="${W * 0.22}" height="78" fill="${glass}" opacity="0.9"/>
<rect x="${W * 0.52}" y="${base - 92}" width="${W * 0.2}" height="78" fill="${glass}" opacity="0.9"/>
<rect x="${W * 0.26}" y="${base - 92}" width="1.5" height="78" fill="#555"/><rect x="${W * 0.62}" y="${base - 92}" width="1.5" height="78" fill="#555"/>
<rect x="${W * 0.1}" y="${base - 6}" width="${W * 0.8}" height="10" fill="#9a8c78"/>`;
  out[name] = svg(W, H, sky(W, H, k, 'v') + ground(W, H, base, k, 'lawn') + trees(W * 0.2, base, 3, lights) + `<g transform="translate(${W * 0.8} 0)">${trees(W * 0.2, base, 3, lights)}</g>` + house);
}
seed = 31; villa('villa', 'day');
seed = 32; villa('expert-villa', 'dusk', 720, 300);

// ---------- Plot ----------
seed = 41;
{
  const W = 480, H = 300, base = 150;
  const plots = Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, c) => {
    const x = 20 + c * 92 - r * 14, y = base + 20 + r * 34;
    return `<path d="M${x} ${y} l86 0 l-12 30 l-86 0z" fill="${pick(['#c9a46a', '#b89159', '#8fb36a'])}" stroke="#f4ead8" stroke-width="2"/>`;
  }).join('')).join('');
  out.plot = svg(W, H, sky(W, H, 'day', 'p') + `<rect y="${base - 30}" width="${W}" height="40" fill="#b9cde0" opacity="0.7"/>` + ground(W, H, base, 'day', 'lawn') + plots + trees(W, base + 10, 6));
}

// ---------- Locality / city panoramas ----------
function panorama(name: string, k: Sky, g: 'water' | 'lawn' | 'plaza') {
  const W = 480, H = 260, base = 170;
  const towers = Array.from({ length: 14 }, (_, i) => tower(i * 36 + between(-8, 8), base, between(20, 34), between(40, 130), k, pick(['#e7e2da', '#d7dde4', '#efe6d6']), '#b8b0a4')).join('');
  out[name] = svg(W, H, sky(W, H, k, 'l') + towers + ground(W, H, base, k, g) + (g === 'water' ? '' : trees(W, base + 10, 8, k === 'night')));
}
seed = 51; panorama('locality-1', 'day', 'water');
seed = 52; panorama('locality-2', 'golden', 'water');
seed = 53; panorama('locality-3', 'day', 'lawn');
seed = 54; panorama('locality-4', 'golden', 'plaza');
seed = 55; panorama('locality-5', 'dusk', 'water');
seed = 56; panorama('locality-6', 'day', 'plaza');

// ---------- City landmarks (original line drawings on warm skies) ----------
const LANDMARKS: [string, string][] = [
  ['mumbai', 'M30 140h140M45 140V80h110v60M55 80V62h90v18M80 62V44h40v18M88 140v-30a12 12 0 0 1 24 0v30M58 100h12M130 100h12'],
  ['bengaluru', 'M30 140h140M40 140V92h120v48M60 92a40 40 0 0 1 80 0M100 52v-14M70 110h12M118 110h12M95 140v-22h10v22'],
  ['delhi', 'M30 140h140M70 140V70h60v70M80 70l20-26 20 26M88 140v-28a12 12 0 0 1 24 0v28M50 140V100h20M130 100h20v40'],
  ['gurugram', 'M30 140h140M50 140V40h28v100M88 140V60h26v80M124 140V30h30v110M56 52h16M56 64h16M94 72h14M130 44h18'],
  ['noida', 'M30 140h140M40 140V70h34v70M84 140V50h32v90M126 140V80h34v60M100 50l0-14M46 82h22M90 64h20M132 92h22'],
  ['pune', 'M30 140h140M40 140V100l20-14 20 14v40M80 140V92l20-16 20 16v48M120 140V100l20-14 20 14v40M92 140v-22h16v22'],
  ['hyderabad', 'M30 140h140M58 140V60h14v80M128 140V60h14v80M72 96h56v44H72zM86 96a14 14 0 0 1 28 0M62 60v-12M134 60v-12'],
  ['chennai', 'M30 140h140M60 140V110h80v30M70 110V88h60v22M80 88V68h40v20M88 68V52h24v16M96 52V40h8v12'],
  ['thane', 'M30 140h140M40 140V96h40v44M90 140V64h24v76M124 140V84h36v56M96 76h12M96 92h12M46 108h28'],
  ['kolkata', 'M30 140h140M46 140V100h108v40M60 100V84h80v16M100 84a26 26 0 0 0-26-26a26 26 0 0 0 26 26M100 58V40M66 120h12M122 120h12'],
];
LANDMARKS.forEach(([slug, d], i) => {
  const W = 200, H = 160;
  out[`city-${slug}`] = svg(W, H, sky(W, H, i % 2 ? 'golden' : 'dusk', 'c') +
    `<path d="${d}" fill="#7a4a2c" fill-opacity="0.35" stroke="#5b331c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><rect y="140" width="${W}" height="20" fill="#6d4a33"/>`);
});

// ---------- Living room (banner) ----------
seed = 61;
out['living-room'] = svg(720, 300, `
<rect width="720" height="300" fill="#f6efe4"/>
<rect x="430" y="20" width="270" height="200" fill="#bcd9ef"/>
${Array.from({ length: 8 }, (_, i) => `<rect x="${450 + i * 30}" y="${120 + (i % 3) * 20}" width="18" height="${100 - (i % 3) * 20}" fill="#d8e6f1"/>`).join('')}
<rect x="430" y="20" width="270" height="200" fill="none" stroke="#2d2a26" stroke-width="6"/><rect x="562" y="20" width="5" height="200" fill="#2d2a26"/>
<rect x="250" y="20" width="160" height="220" fill="#fbf7ef"/><path d="M250 20h160v220H250z" fill="url(#cur)"/>
<defs><linearGradient id="cur" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#efe5d4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect y="240" width="720" height="60" fill="#d9c3a3"/>
<rect x="390" y="170" width="300" height="70" rx="14" fill="#8a8f8c"/><rect x="380" y="150" width="320" height="40" rx="14" fill="#9fa4a0"/>
<rect x="410" y="140" width="60" height="34" rx="8" fill="#e8e2d6"/><rect x="600" y="140" width="60" height="34" rx="8" fill="#5f7a72"/>
<rect x="470" y="235" width="120" height="16" rx="4" fill="#7b5a3c"/><rect x="480" y="251" width="8" height="24" fill="#5b4330"/><rect x="572" y="251" width="8" height="24" fill="#5b4330"/>
<path d="M300 250 q-6-60 10-90 q-30 20-34 0 q30-30 26-60 q16 30 6 60 q26-30 40-10 q-26 6-30 40 q20-20 30 0 q-26 10-30 60z" fill="#3f7a46"/>
<rect x="286" y="240" width="40" height="34" rx="6" fill="#c19a6b"/>`);

// ---------- 3D-ish house icon ----------
out['house-icon'] = svg(200, 200, `
<circle cx="100" cy="100" r="96" fill="#fbf3df"/><ellipse cx="100" cy="150" rx="70" ry="16" fill="#7cb260"/>
<path d="M55 150V100l45-36 45 36v50z" fill="#fffaf2"/><path d="M45 104l55-46 55 46-8 8-47-39-47 39z" fill="#a8582f"/>
<rect x="90" y="118" width="20" height="32" fill="#7a4b2b"/><rect x="64" y="110" width="18" height="16" fill="#9ec3df"/><rect x="118" y="110" width="18" height="16" fill="#9ec3df"/>
<circle cx="40" cy="128" r="16" fill="#4f9a52"/><circle cx="162" cy="126" r="18" fill="#3f8a4a"/>`);

// ---------- Hero: balcony at sunset over a skyline ----------
seed = 71;
{
  const W = 1920, H = 820, base = 560;
  const far = Array.from({ length: 60 }, () => tower(between(0, W * 0.8), base, between(16, 30), between(30, 120), 'dusk', '#33405f', '#2a3550')).join('');
  const mid = Array.from({ length: 14 }, (_, i) => tower(380 + i * 70 + between(-14, 14), base, between(34, 52), between(160, 340), 'dusk', '#3a4766', '#2b3654')).join('');
  out.hero = svg(W, H, sky(W, H, 'dusk', 'h') +
    `<radialGradient id="g" cx="0.62" cy="0.6" r="0.45"><stop offset="0" stop-color="#ffb35c" stop-opacity="0.55"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#g)"/>` +
    far + mid + `<rect y="${base}" width="${W}" height="${H - base}" fill="#1a2747"/>` +
    // balcony: floor, glass rail, chair, plants
    `<path d="M1150 820 L1500 470 L1920 470 L1920 820Z" fill="#3a2f2a"/><path d="M1500 470 L1920 470 L1920 440 L1500 440Z" fill="#2a211d"/>
<rect x="0" y="600" width="1500" height="10" fill="#c9a985" opacity="0.8"/><rect x="0" y="610" width="1500" height="110" fill="#a7c4dd" opacity="0.18"/>
${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 95}" y="600" width="4" height="120" fill="#c9a985" opacity="0.7"/>`).join('')}
<rect x="1700" y="0" width="220" height="460" fill="#2b221d"/><rect x="1730" y="40" width="160" height="380" fill="#ffd08a" opacity="0.35"/>
<path d="M1600 760 q-10-120 30-170 q-60 40-70 0 q60-60 50-120 q30 60 14 120 q50-60 80-20 q-50 10-60 80 q40-40 60 0 q-50 20-60 110z" fill="#2f5a33"/>
<rect x="1580" y="740" width="70" height="60" rx="10" fill="#8a6a4a"/>
<rect x="1690" y="640" width="190" height="24" rx="10" fill="#d8cdbf"/><rect x="1700" y="600" width="170" height="44" rx="14" fill="#e9e0d4"/><rect x="1700" y="660" width="10" height="90" fill="#5b4330"/><rect x="1860" y="660" width="10" height="90" fill="#5b4330"/>
<ellipse cx="1500" cy="790" rx="70" ry="14" fill="#5b4330"/><path d="M1480 780 q20-60 20-60 q10 40 30 60z" fill="#3f7a46"/>` +
    `<linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#0f2347" stop-opacity="0.85"/><stop offset="0.5" stop-color="#0f2347" stop-opacity="0.35"/><stop offset="1" stop-color="#0f2347" stop-opacity="0"/></linearGradient><rect width="${W}" height="${H}" fill="url(#shade)"/>`);
}

for (const [name, content] of Object.entries(out)) writeFileSync(new URL(`${name}.svg`, OUT), content);
console.log(`wrote ${Object.keys(out).length} images: ${Object.keys(out).join(', ')}`);
