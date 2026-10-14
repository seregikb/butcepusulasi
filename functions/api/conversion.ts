interface PagesContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
  env: {
    PUBLIC_LEAD_FUNNEL_ENABLED?: string;
    LEAD_ENDPOINT?: string;
    PARTNER_MARKER?: string;
    PARTNER_OFFER?: string;
    TABOOLA_S2S_ENDPOINT?: string;
    TABOOLA_EVENT_NAME?: string;
    LEAD_FAILURES?: {
      put(key: string, value: string): Promise<void>;
    };
  };
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function serializeForm(form: FormData): Record<string, string | string[]> {
  const fields: Record<string, string | string[]> = {};
  for (const [name, rawValue] of form.entries()) {
    const value = typeof rawValue === 'string' ? rawValue : rawValue.name;
    const existing = fields[name];
    if (existing === undefined) fields[name] = value;
    else fields[name] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return fields;
}

function splitName(value: string): { firstName: string; lastName: string } {
  const fullName = value.trim();
  const lastSpace = fullName.lastIndexOf(' ');
  if (lastSpace === -1) return { firstName: fullName, lastName: '' };
  return {
    firstName: fullName.slice(0, lastSpace).trim(),
    lastName: fullName.slice(lastSpace + 1).trim(),
  };
}

function languageFromHeader(value: string | null): string {
  const firstTag = value?.split(',')[0]?.split(';')[0]?.trim() || '';
  return firstTag.match(/^[A-Za-z]{2}/)?.[0].toUpperCase() || '';
}

function truncateDownstreamBody(body: string): string {
  return body.slice(0, 2000);
}

async function readResponseBody(response: Response): Promise<string> {
  try {
    return truncateDownstreamBody(await response.text());
  } catch {
    return '';
  }
}

async function readNetworkErrorBody(error: unknown): Promise<string> {
  if (error instanceof Response) return readResponseBody(error);
  if (!error || typeof error !== 'object') return '';

  const { body, response } = error as { body?: unknown; response?: unknown };
  if (typeof body === 'string') return truncateDownstreamBody(body);
  if (response instanceof Response) return readResponseBody(response);
  return '';
}

async function storeFailedLead(
  store: PagesContext['env']['LEAD_FAILURES'],
  form: FormData,
  downstreamStatus: number | 'network_error',
  downstreamBody: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const record = { event: 'lead_delivery_failed', timestamp, downstreamStatus, downstreamBody, fields: serializeForm(form) };
  if (!store) {
    console.error(JSON.stringify(record));
    return;
  }

  const key = `failed-leads/${timestamp}/${crypto.randomUUID()}`;
  try {
    await store.put(key, JSON.stringify(record));
    console.error(JSON.stringify({ ...record, recoveryKey: key }));
  } catch (error) {
    console.error(JSON.stringify({ ...record, recoveryStoreError: String(error) }));
  }
}

async function sendTaboolaConversion(endpoint: string, eventName: string, tblci: string): Promise<void> {
  const url = `${endpoint}?click-id=${encodeURIComponent(tblci)}&name=${encodeURIComponent(eventName)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) console.error(`Taboola S2S conversion failed with status ${response.status}.`);
  } catch (error) {
    console.error('Taboola S2S conversion request failed.', error);
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (env.PUBLIC_LEAD_FUNNEL_ENABLED !== 'true') return json({ ok: false, message: 'Bulunamadı.' }, 404);
  const form = await request.formData();
  if (String(form.get('website') || '')) return json({ ok: true });

  const required = ['ad', 'gelir_araligi', 'hane_buyuklugu', 'hedef', 'processing_consent'];
  if (required.some((field) => !form.get(field))) return json({ ok: false, message: 'Eksik alan.' }, 400);
  const email = String(form.get('eposta') || '').trim();
  const phone = String(form.get('telefon') || '').trim();
  if (!email || !phone) return json({ ok: false, message: 'İletişim bilgileri gerekli.' }, 400);
  const endpoint = env.LEAD_ENDPOINT?.trim();
  if (!endpoint) return json({ ok: false, message: 'Endpoint henüz yapılandırılmadı.' }, 503);

  const { firstName, lastName } = splitName(String(form.get('ad') || ''));
  const tblci = String(form.get('tblci') || '').trim();
  const partnerPayload = {
    email,
    phone,
    firstName,
    lastName,
    country: (request.headers.get('CF-IPCountry') || '').trim().toUpperCase(),
    lang: languageFromHeader(request.headers.get('Accept-Language')),
    creo: String(form.get('creo') || '').trim(),
    marker: env.PARTNER_MARKER || '',
    offer: env.PARTNER_OFFER || '',
    click_id: tblci,
    ip: request.headers.get('CF-Connecting-IP') || '',
    description: '',
    domain: new URL(request.url).hostname,
    sourcetype: 'taboola',
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partnerPayload),
    });
  } catch (error) {
    const downstreamBody = await readNetworkErrorBody(error);
    await storeFailedLead(env.LEAD_FAILURES, form, 'network_error', downstreamBody);
    console.error('Lead delivery request failed.', error);
    return json({ ok: false, message: 'Aktarım başarısız.' }, 502);
  }
  if (!response.ok) {
    const downstreamBody = await readResponseBody(response);
    await storeFailedLead(env.LEAD_FAILURES, form, response.status, downstreamBody);
    return json({ ok: false, message: 'Aktarım başarısız.' }, 502);
  }

  const taboolaEndpoint = env.TABOOLA_S2S_ENDPOINT?.trim();
  const taboolaEventName = env.TABOOLA_EVENT_NAME?.trim();
  if (tblci && taboolaEndpoint && taboolaEventName) {
    context.waitUntil(sendTaboolaConversion(taboolaEndpoint, taboolaEventName, tblci));
  }

  return json({ ok: true });
}
