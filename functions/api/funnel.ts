import { funnelKey, isFunnelEvent, utcDate, type FunnelKv } from '../lib/funnel';

interface PagesContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
  env: {
    PUBLIC_LEAD_FUNNEL_ENABLED?: string;
    LEAD_FAILURES?: FunnelKv;
  };
}

const RETENTION_SECONDS = 7_776_000;

function empty(status: number): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function increment(store: FunnelKv, key: string): Promise<void> {
  const current = Number.parseInt(await store.get(key) || '0', 10);
  const next = Number.isSafeInteger(current) && current >= 0 ? current + 1 : 1;
  await store.put(key, String(next), { expirationTtl: RETENTION_SECONDS });
}

export async function onRequestPost({ request, env, waitUntil }: PagesContext): Promise<Response> {
  if (env.PUBLIC_LEAD_FUNNEL_ENABLED !== 'true') return empty(404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return empty(400);
  }
  const event = body && typeof body === 'object' ? (body as Record<string, unknown>).event : undefined;
  if (!isFunnelEvent(event)) return empty(400);
  if (!env.LEAD_FAILURES) return empty(404);

  waitUntil(increment(env.LEAD_FAILURES, funnelKey(utcDate(), event)));
  return empty(204);
}
