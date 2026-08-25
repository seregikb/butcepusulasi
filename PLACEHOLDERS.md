# Pre-launch Placeholders

Do not enable the lead funnel until every token is replaced with reviewed legal and operational data.

| Token | Meaning | Appears in / affects | Owner |
|---|---|---|---|
| `{{FORM_ENDPOINT}}` | Contact form submission endpoint | Contact page, `.env.example` | Site operator / engineering |
| `{{RECIPIENT_LEGAL_NAME}}` | Full legal name of the lead recipient | Funnel consent, thank-you page, disclosure | Legal / recipient |
| `{{RECIPIENT_ADDRESS}}` | Registered or valid notice address | Privacy and disclosure text | Legal / recipient |
| `{{RECIPIENT_KVKK_CONTACT_EMAIL}}` | Recipient address for KVKK requests | Privacy and disclosure text | Legal / recipient |
| `{{DATA_CONTROLLER_LEGAL_NAME}}` | Legal identity of the data controller | Privacy, consent, disclosure | Site operator / legal |
| `{{DATA_CONTROLLER_VERBIS_NO}}` | Data controller VERBİS number, if applicable | Disclosure text | Site operator / legal |
| `{{LEAD_PURPOSE_TR}}` | Reviewed Turkish processing-purpose wording | Consent and disclosure | Legal / marketing operations |
| `{{RETENTION_PERIOD_TR}}` | Reviewed Turkish retention period | Disclosure text | Legal / data controller |
| `{{CONVERSION_API_ENDPOINT}}` | Server-to-server lead destination | Cloudflare Pages Function stub | Engineering / recipient |

The canonical token values live in `src/lib/placeholders.ts`; the conversion endpoint token also remains in `functions/api/conversion.ts`. With `PUBLIC_LEAD_FUNNEL_ENABLED=true`, `scripts/check-placeholders.mjs` exits with code 1 and reports every unresolved token location.
