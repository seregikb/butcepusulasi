import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../functions/api/conversion';

function leadForm(overrides: Record<string, string> = {}): FormData {
  const values = {
    ad: 'Ayşe',
    soyad: 'Yılmaz',
    hane_buyuklugu: '2 kişi',
    hedef: 'Harcamaları düzenlemek',
    eposta: 'ayse@example.com',
    telefon: '+905301112233',
    tblci: '',
    creo: '',
    website: '',
    processing_consent: 'on',
    ...overrides,
  };
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function request(form: FormData, headers: HeadersInit = {}): Request {
  return new Request('https://butcepusulasi.com/api/conversion', { method: 'POST', body: form, headers });
}

function navigationRequest(form: FormData): Request {
  const body = new URLSearchParams();
  form.forEach((value, key) => body.append(key, String(value)));
  return new Request('https://butcepusulasi.com/api/conversion', {
    method: 'POST',
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
}

function env(overrides: Record<string, unknown> = {}) {
  return {
    PUBLIC_LEAD_FUNNEL_ENABLED: 'true',
    LEAD_ENDPOINT: 'https://partner.example/leads',
    PARTNER_MARKER: 'marker-42',
    PARTNER_OFFER: 'offer-7',
    LEAD_FAILURES: { put: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

function partnerSuccessResponse(): Response {
  return new Response(JSON.stringify({ result: true, code: 'SUCCESS', message: 'CREATED' }), { status: 200 });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('lead conversion endpoint', () => {
  it('redirects successful navigation submissions without changing fetch JSON', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(partnerSuccessResponse()));
    vi.stubGlobal('fetch', fetchMock);

    const navigation = await onRequestPost({
      request: navigationRequest(leadForm()),
      env: env(),
      waitUntil: vi.fn(),
    });
    const fetchResponse = await onRequestPost({
      request: request(leadForm()),
      env: env(),
      waitUntil: vi.fn(),
    });

    expect(navigation.status).toBe(303);
    expect(navigation.headers.get('Location')).toBe('https://butcepusulasi.com/tesekkurler/');
    expect(await navigation.text()).toBe('');
    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    await expect(fetchResponse.json()).resolves.toEqual({ ok: true });
  });

  it('redirects failed navigation submissions back to the form', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await onRequestPost({
      request: navigationRequest(leadForm({ soyad: '' })),
      env: env(),
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('https://butcepusulasi.com/butce-plani/');
    expect(await response.text()).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

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

  it('posts mapped JSON first and then sends an encoded Taboola conversion', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(partnerSuccessResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const waitUntil = vi.fn();
    const response = await onRequestPost({
      request: request(leadForm({ ad: 'Mehmet', soyad: 'Yılmaz', tblci: 'click id&1', creo: 'creative-9' }), {
        'CF-Connecting-IP': '203.0.113.7',
        'CF-IPCountry': 'tr',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      }),
      env: env({
        TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback',
        TABOOLA_EVENT_NAME: 'lead event/1',
      }),
      waitUntil,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://partner.example/leads');
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ayse@example.com',
        phone: '+905301112233',
        firstName: 'Mehmet',
        lastName: 'Yılmaz',
        country: 'TR',
        lang: 'TR',
        creo: 'creative-9',
        marker: 'marker-42',
        offer: 'offer-7',
        click_id: 'click id&1',
        ip: '203.0.113.7',
        description: '',
        domain: 'butcepusulasi.com',
        sourcetype: 'taboola',
      }),
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://taboola.example/postback?click-id=click%20id%261&name=lead%20event%2F1',
    );
    expect(waitUntil).toHaveBeenCalledOnce();
    await waitUntil.mock.calls[0]?.[0];
  });

  it('skips Taboola when tblci is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(partnerSuccessResponse());
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

  it('maps first and last names directly from separate fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(partnerSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ ad: 'Mehmet Ali', soyad: 'Yılmaz', tblci: 'click id&1', creo: 'creative-9' }), {
        'CF-Connecting-IP': '203.0.113.7',
        'CF-IPCountry': 'tr',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      }),
      env: env(),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      email: 'ayse@example.com',
      phone: '+905301112233',
      firstName: 'Mehmet Ali',
      lastName: 'Yılmaz',
      country: 'TR',
      lang: 'TR',
      creo: 'creative-9',
      marker: 'marker-42',
      offer: 'offer-7',
      click_id: 'click id&1',
      ip: '203.0.113.7',
      description: '',
      domain: 'butcepusulasi.com',
      sourcetype: 'taboola',
    });
  });

  it('uses empty country and language when the headers are absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(partnerSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    await onRequestPost({
      request: request(leadForm()),
      env: env(),
      waitUntil: vi.fn(),
    });

    const payload = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(payload.country).toBe('');
    expect(payload.lang).toBe('');
  });

  it('requires both email and phone before contacting the partner', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const missingEmail = await onRequestPost({
      request: request(leadForm({ eposta: '   ' })),
      env: env(),
      waitUntil: vi.fn(),
    });
    const missingPhone = await onRequestPost({
      request: request(leadForm({ telefon: '' })),
      env: env(),
      waitUntil: vi.fn(),
    });

    expect(missingEmail.status).toBe(400);
    expect(missingPhone.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a submission without processing consent', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ processing_consent: '' })),
      env: env(),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['hane_buyuklugu', 'hedef'])('requires the remaining qualification field %s', async (field) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ [field]: '' })),
      env: env(),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a submission without a surname', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ soyad: '' })),
      env: env(),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores only redelivery fields with 30-day retention before returning an error', async () => {
    const partnerBody = JSON.stringify({
      result: false,
      code: 'PARTNER_ERROR',
      message: 'INVALID_PHONE',
      details: 'x'.repeat(2100),
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(partnerBody, { status: 500 }));
    const failureStore = { put: vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal('fetch', fetchMock);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

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
    expect(failureStore.put.mock.calls[0]?.[2]).toEqual({ expirationTtl: 2592000 });
    expect(Object.keys(stored).sort()).toEqual(['partnerPayload', 'processing_consent', 'qualificationAnswers', 'timestamp']);
    expect(stored.partnerPayload).toEqual(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string));
    expect(stored.qualificationAnswers).toEqual({ hane_buyuklugu: '2 kişi', hedef: 'Harcamaları düzenlemek' });
    expect(stored.processing_consent).toBe(true);
    expect(stored.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.parse(errorSpy.mock.calls[0]?.[0] as string)).toMatchObject({ downstreamStatus: 500, downstreamCode: 'PARTNER_ERROR', downstreamMessage: 'INVALID_PHONE', click_id: 'recover-me', recoveryKey: key });
  });

  it('accepts a duplicate without firing Taboola', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: false,
      code: 'ERROR',
      message: 'DUPLICATE',
      redirect_url: null,
    }), { status: 200 }));
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const waitUntil = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'duplicate-click' })),
      env: env({
        TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback',
        TABOOLA_EVENT_NAME: 'lead',
      }),
      waitUntil,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(waitUntil).not.toHaveBeenCalled();
    expect(JSON.parse(infoSpy.mock.calls[0]?.[0] as string)).toMatchObject({
      downstreamCode: 'ERROR',
      downstreamMessage: 'DUPLICATE',
    });
  });

  it('rejects a parsed partner error without firing Taboola', async () => {
    const failureStore = { put: vi.fn().mockResolvedValue(undefined) };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: false,
      code: 'ERROR',
      message: { lastname: ['Lastname cannot be blank.'] },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const waitUntil = vi.fn();

    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'rejected-click' })),
      env: env({
        LEAD_FAILURES: failureStore,
        TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback',
        TABOOLA_EVENT_NAME: 'lead',
      }),
      waitUntil,
    });

    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(waitUntil).not.toHaveBeenCalled();
    const stored = JSON.parse(failureStore.put.mock.calls[0]?.[1] as string);
    expect(stored.partnerPayload.click_id).toBe('rejected-click');
    expect(JSON.parse(errorSpy.mock.calls[0]?.[0] as string).downstreamMessage).toBe('{}');
  });

  it('rejects a non-JSON partner response without firing Taboola', async () => {
    const failureStore = { put: vi.fn().mockResolvedValue(undefined) };
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const waitUntil = vi.fn();

    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'malformed-click' })),
      env: env({ LEAD_FAILURES: failureStore }),
      waitUntil,
    });

    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(waitUntil).not.toHaveBeenCalled();
    const stored = JSON.parse(failureStore.put.mock.calls[0]?.[1] as string);
    expect(stored.partnerPayload.click_id).toBe('malformed-click');
    expect(JSON.parse(errorSpy.mock.calls[0]?.[0] as string)).toMatchObject({ downstreamStatus: 200, downstreamCode: '', downstreamMessage: '' });
  });

  it('stores the submission when the lead request has a network failure', async () => {
    const networkError = Object.assign(new Error('partner unavailable'), {
      response: new Response('upstream connection closed'),
    });
    const fetchMock = vi.fn().mockRejectedValue(networkError);
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
    expect(stored.partnerPayload.email).toBe('ayse@example.com');
    expect(failureStore.put.mock.calls[0]?.[2]).toEqual({ expirationTtl: 2592000 });
  });

  it('does not fail the lead request when Taboola fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(partnerSuccessResponse())
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
    const fetchMock = vi.fn().mockResolvedValue(partnerSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm()),
      env: env({ LEAD_FAILURES: undefined }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('logs only allowed diagnostics when delivery and unbound KV both fail', async () => {
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
    expect(record.downstreamStatus).toBe(500);
    expect(record.downstreamCode).toBe('');
    expect(record.downstreamMessage).toBe('');
    expect(record.click_id).toBe('log-me');
    expect(Object.keys(record).sort()).toEqual(['click_id', 'creo', 'downstreamCode', 'downstreamMessage', 'downstreamStatus', 'timestamp']);
  });

  it.each([false, true])('strips nested personal keys and echoed values (KV rejects: %s)', async (kvRejects) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failureStore = { put: kvRejects ? vi.fn().mockRejectedValue(new Error('ayse@example.com')) : vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: false,
      code: 'ERROR',
      message: {
        EMAIL: 'hidden@example.com', phone: '+905301112233', name: 'Ayşe', firstName: 'Ayşe', lastName: 'Yılmaz',
        ad: 'Ayşe', soyad: 'Yılmaz', eposta: 'ayse@example.com', telefon: '+905301112233',
        hane_buyuklugu: 'private', hedef: 'private', processing_consent: 'on', website: 'private',
        nested: [{ Email: 'hidden@example.com', detail: 'AYŞE YILMAZ ayse@example.com +90 530 111 22 33' }],
        serialized: JSON.stringify({ firstname: 'Ayşe', reason: 'INVALID' }),
        reason: 'INVALID',
      },
    }), { status: 422 })));
    const response = await onRequestPost({ request: request(leadForm()), env: env({ LEAD_FAILURES: failureStore }), waitUntil: vi.fn() });
    expect(response.status).toBe(502);
    expect(errorSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(errorSpy.mock.calls[0]?.[0] as string);
    expect(Object.keys(logged).sort()).toEqual(['click_id', 'creo', 'downstreamCode', 'downstreamMessage', 'downstreamStatus', ...(kvRejects ? [] : ['recoveryKey']), 'timestamp'].sort());
    expect(JSON.parse(logged.downstreamMessage)).toEqual({ nested: [{ detail: '[REDACTED] [REDACTED] [REDACTED] [REDACTED]' }], serialized: '{"reason":"INVALID"}', reason: 'INVALID' });
  });
});
