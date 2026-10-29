import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../functions/api/conversion';
import { FORM_STARTED_AT_FIELD, HONEYPOT_FIELD } from '../src/data/form-guard';

const LONG_TBLCI = 'test_tblAP4I6wAGYCiD_-onP-b_ZvcRycjp2AoPT8PKIfApYs2Azg49kO6ZjwhCyoH8g0tvKppg0KLKgf0AASwiyoH8SCkE0YjJUWFZYX3EY0tvKppg0TA';

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
    [HONEYPOT_FIELD]: '',
    [FORM_STARTED_AT_FIELD]: String(Date.now() - 5_000),
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

function trackedStore() {
  const values = new Map<string, string>();
  return {
    values,
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  };
}

function backgroundTasks() {
  const tasks: Promise<unknown>[] = [];
  return {
    waitUntil: (promise: Promise<unknown>) => { tasks.push(promise); },
    flush: () => Promise.all(tasks),
  };
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

  it('returns fake success only for a filled honeypot submitted implausibly fast', async () => {
    const fetchMock = vi.fn();
    const failureStore = { put: vi.fn() };
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({
        [HONEYPOT_FIELD]: 'spam.example',
        [FORM_STARTED_AT_FIELD]: String(Date.now()),
      })),
      env: env({ LEAD_FAILURES: failureStore }),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(failureStore.put).not.toHaveBeenCalled();
  });

  it('delivers a filled honeypot submitted at human speed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(partnerSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({
        [HONEYPOT_FIELD]: 'autofilled-value',
        [FORM_STARTED_AT_FIELD]: String(Date.now() - 5_000),
      })),
      env: env(),
      waitUntil: vi.fn(),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
    ['non-numeric', 'not-a-timestamp'],
  ])('delivers a filled honeypot when its timestamp is %s', async (_label, timestamp) => {
    const fetchMock = vi.fn().mockResolvedValue(partnerSuccessResponse());
    const store = trackedStore();
    const background = backgroundTasks();
    vi.stubGlobal('fetch', fetchMock);
    const form = leadForm({ [HONEYPOT_FIELD]: 'autofilled-value' });
    if (timestamp === undefined) form.delete(FORM_STARTED_AT_FIELD);
    else form.set(FORM_STARTED_AT_FIELD, timestamp);

    const response = await onRequestPost({
      request: request(form),
      env: env({ LEAD_FAILURES: store }),
      waitUntil: background.waitUntil,
    });
    await background.flush();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect([...store.values.keys()].some((key) => key.endsWith(':honeypot_rejected'))).toBe(false);
    expect([...store.values.keys()].some((key) => key.endsWith(':delivery_success'))).toBe(true);
  });

  it('counts a fast honeypot rejection server-side without contacting the partner', async () => {
    const fetchMock = vi.fn();
    const store = trackedStore();
    const background = backgroundTasks();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({
        [HONEYPOT_FIELD]: 'filled',
        [FORM_STARTED_AT_FIELD]: String(Date.now()),
      })),
      env: env({ LEAD_FAILURES: store }),
      waitUntil: background.waitUntil,
    });
    await background.flush();

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect([...store.values.entries()].filter(([key]) => key.endsWith(':honeypot_rejected'))).toHaveLength(1);
    expect([...store.values.values()]).toContain('1');
  });

  it('counts partner success and keeps the Taboola postback after acceptance', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(partnerSuccessResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const store = trackedStore();
    const background = backgroundTasks();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'counter-click', creo: 'counter-creo' })),
      env: env({
        LEAD_FAILURES: store,
        TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback',
        TABOOLA_EVENT_NAME: 'lead',
      }),
      waitUntil: background.waitUntil,
    });
    await background.flush();

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://taboola.example/postback?click-id=counter-click&name=lead');
    expect([...store.values.entries()].filter(([key]) => key.endsWith(':delivery_success'))).toHaveLength(1);
  });

  it('counts duplicate and failed partner outcomes without personal counter data', async () => {
    const duplicateStore = trackedStore();
    const duplicateBackground = backgroundTasks();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: false,
      code: 'ERROR',
      message: 'DUPLICATE',
    }), { status: 200 })));

    const duplicate = await onRequestPost({
      request: request(leadForm()),
      env: env({ LEAD_FAILURES: duplicateStore }),
      waitUntil: duplicateBackground.waitUntil,
    });
    await duplicateBackground.flush();
    expect(duplicate.status).toBe(200);
    expect([...duplicateStore.values.entries()].filter(([key]) => key.endsWith(':delivery_duplicate'))).toHaveLength(1);

    const failureStore = trackedStore();
    const failureBackground = backgroundTasks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: false,
      code: 'ERROR',
      message: 'INVALID',
    }), { status: 200 })));
    const failed = await onRequestPost({
      request: request(leadForm()),
      env: env({ LEAD_FAILURES: failureStore }),
      waitUntil: failureBackground.waitUntil,
    });
    await failureBackground.flush();
    expect(failed.status).toBe(502);
    expect([...failureStore.values.entries()].filter(([key]) => key.endsWith(':delivery_failed'))).toHaveLength(1);
    expect([...failureStore.values.keys()].some((key) => key.startsWith('failed-leads/'))).toBe(true);

    for (const store of [duplicateStore, failureStore]) {
      const counters = [...store.values.entries()].filter(([key]) => key.startsWith('funnel:'));
      expect(counters.every(([key, value]) => /^funnel:\d{4}-\d{2}-\d{2}:[a-z_]+$/.test(key) && /^\d+$/.test(value))).toBe(true);
    }
    expect(infoSpy).toHaveBeenCalled();
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
      signal: expect.any(AbortSignal),
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
    expect(Object.keys(stored).sort()).toEqual(['click_id', 'partnerPayload', 'processing_consent', 'qualificationAnswers', 'timestamp']);
    expect(stored.partnerPayload).toEqual(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string));
    expect(stored.partnerPayload).not.toHaveProperty('click_id');
    expect(stored.click_id).toBe('recover-me');
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
    expect(stored.partnerPayload).not.toHaveProperty('click_id');
    expect(stored.click_id).toBe('rejected-click');
    expect(JSON.parse(errorSpy.mock.calls[0]?.[0] as string).downstreamMessage).toBe('{}');
  });

  it.each([
    ['malformed JSON', '{"result":'],
    ['HTML', '<html>bad gateway</html>'],
    ['an empty body', ''],
  ])('returns controlled JSON and one failure event for %s', async (_label, partnerBody) => {
    const failureStore = trackedStore();
    const background = backgroundTasks();
    const fetchMock = vi.fn().mockResolvedValue(new Response(partnerBody, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await onRequestPost({
      request: request(leadForm({ tblci: 'malformed-click' })),
      env: env({ LEAD_FAILURES: failureStore }),
      waitUntil: background.waitUntil,
    });
    await background.flush();

    expect(response.status).toBe(502);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Aktarım başarısız.' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const counters = [...failureStore.values.entries()].filter(([key]) => key.startsWith('funnel:'));
    expect(counters).toHaveLength(1);
    expect(counters[0]?.[0]).toMatch(/:delivery_failed$/);
    expect(counters[0]?.[1]).toBe('1');
    const failureRecord = [...failureStore.values.entries()].find(([key]) => key.startsWith('failed-leads/'));
    expect(failureRecord).toBeDefined();
    const stored = JSON.parse(failureRecord?.[1] || '{}');
    expect(stored.partnerPayload).not.toHaveProperty('click_id');
    expect(stored.click_id).toBe('malformed-click');
    expect(JSON.parse(errorSpy.mock.calls[0]?.[0] as string)).toMatchObject({ downstreamStatus: 200, downstreamCode: '', downstreamMessage: '' });
  });

  it('sends the full long tblci only to Taboola, URL-encoded and untruncated', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(partnerSuccessResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const background = backgroundTasks();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(leadForm({ tblci: LONG_TBLCI })),
      env: env({ TABOOLA_S2S_ENDPOINT: 'https://taboola.example/postback', TABOOLA_EVENT_NAME: 'lead event/1' }),
      waitUntil: background.waitUntil,
    });
    await background.flush();

    expect(response.status).toBe(200);
    const partnerBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(partnerBody).not.toHaveProperty('click_id');
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `https://taboola.example/postback?click-id=${encodeURIComponent(LONG_TBLCI)}&name=lead%20event%2F1`,
    );
    expect(decodeURIComponent(new URL(fetchMock.mock.calls[1]?.[0] as string).searchParams.get('click-id') || '')).toBe(LONG_TBLCI);
    expect(infoSpy).toHaveBeenCalledWith(JSON.stringify({ event: 'taboola_s2s', status: 204, accepted: true, clickIdLength: 119 }));
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
        hane_buyuklugu: 'private', hedef: 'private', processing_consent: 'on', bp_guard: 'private',
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
