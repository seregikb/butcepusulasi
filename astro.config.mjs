import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { GATED_ROUTE_SET } from './src/data/gated-routes.ts';

const funnelEnabled = process.env.PUBLIC_LEAD_FUNNEL_ENABLED === 'true';

export default defineConfig({
  site: 'https://butcepusulasi.com',
  output: 'static',
  integrations: [sitemap({
    filter: (page) => funnelEnabled || !GATED_ROUTE_SET.has(new URL(page).pathname),
  })],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'always',
  },
});
