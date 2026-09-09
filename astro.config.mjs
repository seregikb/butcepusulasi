import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

const funnelEnabled = process.env.PUBLIC_LEAD_FUNNEL_ENABLED === 'true';
const funnelRoutes = new Set(['/aydinlatma-metni/', '/butce-plani/', '/tesekkurler/']);
const placeholderSource = readFileSync(new URL('./src/lib/placeholders.ts', import.meta.url), 'utf8');
const hasPlaceholder = (value) => /\{\{[A-Z0-9_]+\}\}/.test(value || '');
const unresolvedKey = (key) => new RegExp(`${key}:\\s*['\"]\\{\\{[A-Z0-9_]+\\}\\}['\"]`).test(placeholderSource);
const guardedRoutes = new Set();

if (['DATA_CONTROLLER_LEGAL_NAME', 'RECIPIENT_ADDRESS', 'RECIPIENT_KVKK_CONTACT_EMAIL'].some(unresolvedKey)) {
  guardedRoutes.add('/gizlilik-politikasi/');
}
if (hasPlaceholder(process.env.PUBLIC_FORM_ENDPOINT) || (!process.env.PUBLIC_FORM_ENDPOINT && unresolvedKey('FORM_ENDPOINT'))) {
  guardedRoutes.add('/iletisim/');
}

export default defineConfig({
  site: 'https://butcepusulasi.com',
  output: 'static',
  integrations: [sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname;
      return !guardedRoutes.has(pathname) && (funnelEnabled || !funnelRoutes.has(pathname));
    },
  })],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'always',
  },
});
