import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const funnelEnabled = process.env.PUBLIC_LEAD_FUNNEL_ENABLED === 'true';
const gatedRoutes = new Set(['/butce-plani/', '/tesekkurler/', '/aydinlatma-metni/']);

export default defineConfig({
  site: 'https://butcepusulasi.com',
  output: 'static',
  integrations: [sitemap({
    filter: (page) => funnelEnabled || !gatedRoutes.has(new URL(page).pathname),
  })],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'always',
  },
});
