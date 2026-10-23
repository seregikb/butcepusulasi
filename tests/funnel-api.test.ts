import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../functions/api/funnel';
import { onRequestGet } from '../functions/api/funnel-report';
import { FUNNEL_EVENTS, funnelKey, utcDate } from '../functions/lib/funnel';

function kv(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  };
}

function eventRequest(event: string): Request {
  return new Request('https://butcepusulasi.com/api/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('cookieless funnel counter endpoint', () => {
  it('is gated and validates the exact event allowlist', async () => {
    const store = kv();
    const disabled = await onRequestPost({
      request: eventRequest('form_view'),
      env: { PUBLIC_LEAD_FUNNEL_ENABLED: 'false', LEAD_FAILURES: store },
      waitUntil: vi.fn(),
    });
    const invalid = await onRequestPost({
      request: eventRequest('unknown_event'),
      env: { PUBLIC_LEAD_FUNNEL_ENABLED: 'true', LEAD_FAILURES: store },
      waitUntil: vi.fn(),
    });
    expect(disabled.status).toBe(404);
    expect(invalid.status).toBe(400);
    expect(store.put).not.toHaveBeenCalled();
  });

  it('increments an integer date/event key with 90-day retention', async () => {
    const store = kv();
    for (let index = 0; index < 2; index += 1) {
      let background: Promise<unknown> | undefined;
      const response = await onRequestPost({
        request: eventRequest('form_view'),
        env: { PUBLIC_LEAD_FUNNEL_ENABLED: 'true', LEAD_FAILURES: store },
        waitUntil: (promise) => { background = promise; },
      });
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      await background;
    }
    const key = funnelKey(utcDate(), 'form_view');
    expect(store.values.get(key)).toBe('2');
    expect(Number.isInteger(Number(store.values.get(key)))).toBe(true);
    expect(store.put).toHaveBeenLastCalledWith(key, '2', { expirationTtl: 7_776_000 });
  });
});

describe('protected funnel report', () => {
  const token = 'diagnostic-token';

  function reportRequest(query = ''): Request {
    return new Request(`https://butcepusulasi.com/api/funnel-report${query}`);
  }

  function seededStore() {
    const dates = [0, 1, 2].map((offset) => {
      const date = new Date(`${utcDate()}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() - offset);
      return utcDate(date);
    });
    const seed: Record<string, string> = {};
    dates.forEach((date, dateIndex) => {
      FUNNEL_EVENTS.forEach((event, eventIndex) => {
        seed[funnelKey(date, event)] = String(Math.max(0, 60 - (eventIndex * 8) - dateIndex));
      });
    });
    return kv(seed);
  }

  it.each(['', '?k=', '?k=wrong'])('returns an empty 404 for an invalid token: %s', async (query) => {
    const response = await onRequestGet({
      request: reportRequest(query),
      env: { FUNNEL_REPORT_TOKEN: token, LEAD_FAILURES: seededStore() },
    });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });

  it('renders the chart and daily table without scripts or external assets', async () => {
    const response = await onRequestGet({
      request: reportRequest(`?k=${token}&days=7`),
      env: { FUNNEL_REPORT_TOKEN: token, LEAD_FAILURES: seededStore() },
    });
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(html).toContain('<section id="funnel-chart">');
    expect(html).toContain(`<svg role="img" aria-label="${FUNNEL_EVENTS.length} aşamalı funnel grafiği"`);
    expect(html).toContain('En büyük düşüş');
    expect(html).toContain('<tfoot><tr><th scope="row">Toplam</th>');
    expect(html.match(/<tbody><tr/g)).toHaveLength(1);
    expect(html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr>/g)).toHaveLength(7);
    expect(html).not.toMatch(/<script|https:\/\//i);
  });

  it.each([[7, 7], [90, 90], [500, 90]])('supports days=%i with %i rows', async (requested, expected) => {
    const response = await onRequestGet({
      request: reportRequest(`?k=${token}&days=${requested}`),
      env: { FUNNEL_REPORT_TOKEN: token, LEAD_FAILURES: seededStore() },
    });
    const html = await response.text();
    expect(html).toContain(`<title>Funnel raporu · ${expected} gün</title>`);
    expect(html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr>/g)).toHaveLength(expected);
  });
});
