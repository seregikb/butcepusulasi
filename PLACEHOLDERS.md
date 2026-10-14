# Pre-launch Placeholders

Do not enable the lead funnel until every token is replaced with reviewed legal and operational data.

| Token | Meaning | Appears in / affects | Owner |
|---|---|---|---|
| `LEAD_ENDPOINT` | Server-to-server lead destination environment variable | Cloudflare Pages Function runtime guard | Engineering / recipient |
| `CONTACT_ENDPOINT` | Server-to-server contact-message destination environment variable | Cloudflare Pages Function runtime guard | Engineering / recipient |

The canonical legal token values live in `src/lib/placeholders.ts`; the lead endpoint guard remains in `functions/api/conversion.ts`. With `PUBLIC_LEAD_FUNNEL_ENABLED=true`, `scripts/check-placeholders.mjs` exits with code 1 and reports every unresolved page token location.
