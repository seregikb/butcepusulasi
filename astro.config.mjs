import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { ARTICLE_FUNNEL_LINKS } from './src/data/article-funnel-links.ts';
import { GATED_ROUTE_SET } from './src/data/gated-routes.ts';
import { GOAL_OPTIONS, HOUSEHOLD_OPTIONS } from './src/data/lead-form-options.ts';
import remarkArticleFunnelLinks from './scripts/remark-article-funnel-links.mjs';

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
  markdown: {
    remarkPlugins: [[remarkArticleFunnelLinks, {
      enabled: funnelEnabled,
      links: ARTICLE_FUNNEL_LINKS,
      householdOptions: HOUSEHOLD_OPTIONS,
      goalOptions: GOAL_OPTIONS,
    }]],
  },
  build: {
    inlineStylesheets: 'always',
  },
});
