# Bütçe Pusulası

Production-ready Turkish personal-finance education site for `butcepusulasi.com`. The site is built with Astro 5, Tailwind CSS 4, strict TypeScript, and Astro Content Collections. Astro emits static files; the disabled lead funnel includes a separate Cloudflare Pages Function stub.

## Requirements

- Node.js 20 or newer
- pnpm 10.15.0 (declared in `package.json`)

Enable pnpm through Corepack if necessary:

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
```

## Local development

```bash
pnpm install
pnpm dev
```

Astro starts at `http://localhost:4321` by default.

## Build and test

```bash
pnpm test
pnpm build
pnpm preview
```

`pnpm build` runs the placeholder guard, generates the XLSX workbook and icon assets, checks Astro and TypeScript, generates OG images, and writes the static site to `dist/`.

## Environment variables

Copy `.env.example` to `.env` for local values. Do not commit secrets.

| Variable | Purpose |
|---|---|
| `PUBLIC_GA4_ID` | GA4 measurement ID; no GA script is created when empty |
| `PUBLIC_TABOOLA_ID` | Taboola pixel ID; no pixel is created when empty |
| `PUBLIC_META_PIXEL_ID` | Meta pixel ID; no pixel is created when empty |
| `PUBLIC_FORM_ENDPOINT` | Contact form JSON endpoint |
| `PUBLIC_LEAD_FUNNEL_ENABLED` | Enables funnel behavior and indexing only when exactly `true` |
| `CONVERSION_API_ENDPOINT` | Planned server-side lead recipient endpoint |

Analytics and advertising scripts are injected only after explicit cookie acceptance.

## Cloudflare Pages deployment

Connect this GitHub repository to Cloudflare Pages and use:

```text
Production branch: main
Build command: pnpm build
Build output directory: dist
Root directory: /
Node version: 20 or newer
```

The root `functions/` directory is deployed as Cloudflare Pages Functions. Add `butcepusulasi.com` and `www.butcepusulasi.com` under the Pages project's Custom domains section. The included `_redirects` rule sends `www` to the canonical apex domain.

Keep `PUBLIC_LEAD_FUNNEL_ENABLED=false` until every placeholder in `PLACEHOLDERS.md` has been supplied. The prebuild guard deliberately fails a funnel-enabled build when a token remains.

## Netlify fallback

`netlify.toml` contains the static build settings. The Astro output deploys unchanged to Netlify. The Cloudflare function in `functions/api/conversion.ts` must be adapted to a Netlify Function before enabling the lead funnel on Netlify.

## Add an article

1. Add an ASCII-only slug as `src/content/blog/<slug>.md`.
2. Include every field required by `src/content.config.ts`.
3. Use proper Turkish in visible copy and realistic `₺` examples.
4. Add exactly two valid IDs to `relatedPosts`.
5. Add the slug and category to `tests/cover-art.test.ts`.
6. Run `pnpm test && pnpm build`.

Hero art is generated from the slug and category by `CoverArt.astro`; do not add a raster hero image.

## Editorial notes

The site provides general educational information only. It does not offer financial products, comparisons, applications, or personalized advice. All Turkish copy must receive native-speaker review before launch; see `CONTENT-REVIEW.md`.
