import { incrementFunnelEvent, isFunnelEvent, type FunnelKv } from '../lib/funnel';

interface PagesContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
  env: {
    PUBLIC_LEAD_FUNNEL_ENABLED?: string;
    LEAD_FAILURES?: FunnelKv;
  };
}

function empty(status: number): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
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

  waitUntil(incrementFunnelEvent(env.LEAD_FAILURES, event));
  return empty(204);
}
