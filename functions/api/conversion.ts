interface PagesContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
  env: {
    PUBLIC_LEAD_FUNNEL_ENABLED?: string;
    LEAD_ENDPOINT?: string;
    TABOOLA_S2S_ENDPOINT?: string;
    TABOOLA_EVENT_NAME?: string;
    LEAD_FAILURES?: {
      put(key: string, value: string): Promise<void>;
    };
  };
}

const endpointPlaceholder = '{{LEAD_ENDPOINT}}';

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

async function storeFailedLead(
  store: PagesContext['env']['LEAD_FAILURES'],
  form: FormData,
  downstreamStatus: number | 'network_error',
): Promise<void> {
  const timestamp = new Date().toISOString();
  const record = { event: 'lead_delivery_failed', timestamp, downstreamStatus, fields: serializeForm(form) };
  if (!store) {
    console.error(JSON.stringify(record));
    return;
  }

  const key = `failed-leads/${timestamp}/${crypto.randomUUID()}`;
  try {
    await store.put(key, JSON.stringify(record));
    console.error(`Lead delivery failed; submission stored at ${key}.`);
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

  const required = ['ad', 'gelir_araligi', 'hane_buyuklugu', 'hedef', 'processing_consent', 'transfer_consent'];
  if (required.some((field) => !form.get(field))) return json({ ok: false, message: 'Eksik alan.' }, 400);
  if (!form.get('eposta') && !form.get('telefon')) return json({ ok: false, message: 'İletişim bilgisi gerekli.' }, 400);
  const endpoint = env.LEAD_ENDPOINT || endpointPlaceholder;
  if (endpoint.includes('{{')) return json({ ok: false, message: 'Endpoint henüz yapılandırılmadı.' }, 503);

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', body: form });
  } catch (error) {
    await storeFailedLead(env.LEAD_FAILURES, form, 'network_error');
    console.error('Lead delivery request failed.', error);
    return json({ ok: false, message: 'Aktarım başarısız.' }, 502);
  }
  if (!response.ok) {
    await storeFailedLead(env.LEAD_FAILURES, form, response.status);
    return json({ ok: false, message: 'Aktarım başarısız.' }, 502);
  }

  const tblci = String(form.get('tblci') || '').trim();
  const taboolaEndpoint = env.TABOOLA_S2S_ENDPOINT?.trim();
  const taboolaEventName = env.TABOOLA_EVENT_NAME?.trim();
  if (tblci && taboolaEndpoint && taboolaEventName) {
    context.waitUntil(sendTaboolaConversion(taboolaEndpoint, taboolaEventName, tblci));
  }

  return json({ ok: true });
}
