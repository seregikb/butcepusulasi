export const FUNNEL_EVENTS = [
  'form_view',
  'step1_answer',
  'step1_complete',
  'step2_focus',
  'consent_tick',
  'submit_attempt',
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
