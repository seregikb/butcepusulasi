import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../functions/api/conversion';

function leadForm(overrides: Record<string, string> = {}): FormData {
  const values = {
    ad: 'Ayşe',
    gelir_araligi: '₺30.001–₺50.000',
    hane_buyuklugu: '2 kişi',
    hedef: 'Harcamaları düzenlemek',
    iletisim_turu: 'eposta',
    eposta: 'ayse@example.com',
    telefon: '',
    tblci: '',
    website: '',
    processing_consent: 'on',
    transfer_consent: 'on',
    ...overrides,
  };
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function request(form: FormData): Request {
  return new Request('https://butcepusulasi.com/api/conversion', { method: 'POST', body: form });
}

function env(overrides: Record<string, unknown> = {}) {
  return {
    PUBLIC_LEAD_FUNNEL_ENABLED: 'true',
    LEAD_ENDPOINT: 'https://partner.example/leads',
    LEAD_FAILURES: { put: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('lead conversion endpoint', () => {
  it('checks the server-side funnel flag before parsing or forwarding', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm()),
      env: env({ PUBLIC_LEAD_FUNNEL_ENABLED: 'false' }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns fake success for the honeypot without forwarding or logging', async () => {
    const fetchMock = vi.fn();
    const failureStore = { put: vi.fn() };
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ website: 'spam.example' })),
      env: env({ LEAD_FAILURES: failureStore }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(failureStore.put).not.toHaveBeenCalled();
  });

  it('posts the lead first and then sends an encoded Taboola conversion', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const waitUntil = vi.fn();
    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'click id&1' })),
      env: env({
        TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback',
        TABOOLA_EVENT_NAME: 'lead event/1',
      }),
      waitUntil,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://partner.example/leads');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://taboola.example/postback?click-id=click%20id%261&name=lead%20event%2F1',
    );
    expect(waitUntil).toHaveBeenCalledOnce();
    await waitUntil.mock.calls[0]?.[0];
  });

  it('skips Taboola when tblci is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm()),
      env: env({
        TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback',
        TABOOLA_EVENT_NAME: 'lead',
      }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stores every field in KV before returning a lead-delivery error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    const failureStore = { put: vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'recover-me' })),
      env: env({ LEAD_FAILURES: failureStore }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(502);
    expect(failureStore.put).toHaveBeenCalledOnce();
    const [key, serialized] = failureStore.put.mock.calls[0] as [string, string];
    expect(key).toMatch(/^failed-leads\/\d{4}-\d{2}-\d{2}T/);
    const stored = JSON.parse(serialized);
    expect(stored.downstreamStatus).toBe(500);
    expect(stored.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(stored.fields).toEqual(Object.fromEntries(leadForm({ tblci: 'recover-me' })));
  });

  it('stores the submission when the lead request has a network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('partner unavailable'));
    const failureStore = { put: vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await onRequestPost({
      request: request(leadForm()),
      env: env({ LEAD_FAILURES: failureStore }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(502);
    expect(failureStore.put).toHaveBeenCalledOnce();
    const stored = JSON.parse(failureStore.put.mock.calls[0]?.[1] as string);
    expect(stored.downstreamStatus).toBe('network_error');
  });

  it('does not fail the lead request when Taboola fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockRejectedValueOnce(new Error('taboola unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const waitUntil = vi.fn();
    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'click-1' })),
      env: env({
        TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback',
        TABOOLA_EVENT_NAME: 'lead',
      }),
      waitUntil,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    await waitUntil.mock.calls[0]?.[0];
  });

  it('does not block a healthy lead delivery when KV is unbound', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm()),
      env: env({ LEAD_FAILURES: undefined }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('logs structured recovery JSON when delivery and unbound KV both fail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'log-me' })),
      env: env({ LEAD_FAILURES: undefined }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(502);
    const record = JSON.parse(errorSpy.mock.calls[0]?.[0] as string);
    expect(record.event).toBe('lead_delivery_failed');
    expect(record.downstreamStatus).toBe(500);
    expect(record.fields.tblci).toBe('log-me');
  });
});
