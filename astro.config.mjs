// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// `astro dev` keeps Vite's pre-bundled dependencies in node_modules/.vite. Everything else (build, check, sync)
// uses its own cache folder, so running a build while the dev server is up can't overwrite or mix the dev
// server's dependencies (which broke islands with "_jsxDEV is not a function" or 404s on .vite/deps/*).
const isDev = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: 'https://inspistate.com',
  output: 'server',
  integrations: [react()],
  adapter: cloudflare(),

  vite: {
    plugins: [tailwindcss()],
    cacheDir: isDev ? 'node_modules/.vite' : 'node_modules/.vite-build',
    optimizeDeps: {
      // Loaded with a dynamic import() (HeatMap, SearchMap), which Vite's start-up scan can't see. Pre-bundling it
      // up front stops a mid-session re-optimisation that left the browser asking for a deleted leaflet.js.
      include: ['leaflet'],
    },
  },
});
