// Generates public/hero-skyline.svg — an original night-skyline illustration for the home hero.
// Run: node db/build-hero.ts
import { writeFileSync } from 'node:fs';

let seed = 7;
const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const W = 1920, H = 760, HORIZON = 560;

const buildings: string[] = [];
const windows: string[] = [];
const reflections: string[] = [];

function tower(x: number, w: number, h: number, shade: string, lit: number) {
  const top = HORIZON - h;
  buildings.push(`<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${shade}"/>`);
  if (r() < 0.35) buildings.push(`<rect x="${x + w * 0.4}" y="${top - 18 - r() * 30}" width="${Math.max(2, w * 0.08)}" height="40" fill="${shade}"/>`);
  const cols = Math.max(2, Math.floor(w / 9)), rows = Math.floor(h / 12);
  for (let c = 0; c < cols; c++) for (let row = 1; row < rows; row++) {
    if (r() > lit) continue;
    const wx = x + 3 + c * ((w - 6) / cols), wy = top + row * 12;
    const warm = r() < 0.75;
    windows.push(`<rect x="${wx.toFixed(1)}" y="${wy}" width="3.2" height="5" fill="${warm ? '#ffcf70' : '#cfe6ff'}" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`);
    if (r() < 0.25) reflections.push(`<rect x="${wx.toFixed(1)}" y="${HORIZON + (HORIZON - wy) * 0.35 + 6}" width="3" height="${(3 + r() * 10).toFixed(1)}" fill="#ffcf70" opacity="${(0.1 + r() * 0.2).toFixed(2)}"/>`);
  }
}

// Far layer, mid layer, then a few tall landmark towers.
for (let x = -20; x < W; x += 22 + r() * 30) tower(x, 20 + r() * 35, 60 + r() * 120, '#1b2238', 0.18);
for (let x = -10; x < W; x += 40 + r() * 50) tower(x, 30 + r() * 45, 110 + r() * 190, '#131a2c', 0.28);
for (const [x, w, h] of [[1060, 70, 420], [1180, 58, 470], [1290, 80, 360], [880, 60, 300], [1480, 66, 330], [300, 64, 280]]) tower(x, w, h, '#0e1424', 0.42);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b1020"/><stop offset="0.55" stop-color="#27304f"/><stop offset="0.8" stop-color="#6a4a5c"/><stop offset="1" stop-color="#d98a4e"/>
  </linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2236"/><stop offset="1" stop-color="#05070d"/></linearGradient>
  <radialGradient id="glow" cx="0.62" cy="0.74" r="0.5"><stop offset="0" stop-color="#ffb35c" stop-opacity="0.45"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>
  <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.82"/><stop offset="0.55" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.1"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${Array.from({ length: 70 }, () => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 260).toFixed(0)}" r="${(0.6 + r()).toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.5).toFixed(2)}"/>`).join('')}
${buildings.join('')}
${windows.join('')}
<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#water)"/>
${reflections.join('')}
<rect width="${W}" height="${H}" fill="url(#shade)"/>
</svg>`;

writeFileSync(new URL('../public/hero-skyline.svg', import.meta.url), svg);
console.log(`hero-skyline.svg: ${(svg.length / 1024).toFixed(0)} KB`);
