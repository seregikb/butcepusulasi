/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GA4_ID?: string;
  readonly PUBLIC_TABOOLA_ID?: string;
  readonly PUBLIC_META_PIXEL_ID?: string;
  readonly PUBLIC_FORM_ENDPOINT?: string;
  readonly PUBLIC_LEAD_FUNNEL_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
