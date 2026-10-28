export const FUNNEL_EVENTS = [
  'form_view',
  'step1_answer',
  'step1_complete',
  'step2_focus',
  'consent_tick',
  'submit_attempt',
  'validation_blocked',
  'honeypot_rejected',
  'delivery_failed',
  'delivery_duplicate',
  'delivery_success',
  'callout_answer',
  'callout_submit',
] as const;

export type FunnelEvent = typeof FUNNEL_EVENTS[number];

export interface FunnelKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export function isFunnelEvent(value: unknown): value is FunnelEvent {
  return typeof value === 'string' && (FUNNEL_EVENTS as readonly string[]).includes(value);
}

export function funnelKey(date: string, event: FunnelEvent): string {
  return `funnel:${date}:${event}`;
}

export function utcDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const FUNNEL_RETENTION_SECONDS = 7_776_000;

export async function incrementFunnelEvent(store: FunnelKv, event: FunnelEvent, date = utcDate()): Promise<void> {
  const key = funnelKey(date, event);
  const current = Number.parseInt(await store.get(key) || '0', 10);
  const next = Number.isSafeInteger(current) && current >= 0 ? current + 1 : 1;
  await store.put(key, String(next), { expirationTtl: FUNNEL_RETENTION_SECONDS });
}
