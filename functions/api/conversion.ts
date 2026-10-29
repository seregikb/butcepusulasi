import { incrementFunnelEvent, type FunnelEvent, type FunnelKv } from '../lib/funnel';
import { HONEYPOT_FIELD, shouldRejectHoneypot } from '../../src/data/form-guard';

const PARTNER_TIMEOUT_MS = 10_000;

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
      get?(key: string): Promise<string | null>;
      put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
    };
  };
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function isNavigationSubmission(request: Request): boolean {
  const accept = request.headers.get('Accept')?.toLowerCase() || '';
  const contentType = request.headers.get('Content-Type')?.toLowerCase() || '';
  return accept.includes('text/html') || contentType.startsWith('application/x-www-form-urlencoded');
}

function result(request: Request, data: Record<string, unknown>, status = 200): Response {
  if (!isNavigationSubmission(request)) return json(data, status);
  const destination = status < 400 ? '/tesekkurler/' : '/butce-plani/';
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(destination, request.url).toString(),
      'Cache-Control': 'no-store',
    },
  });
}

function languageFromHeader(value: string | null): string {
  const firstTag = value?.split(',')[0]?.split(';')[0]?.trim() || '';
  return firstTag.match(/^[A-Za-z]{2}/)?.[0].toUpperCase() || '';
}

async function readResponseBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

// Only partner code/message may cross this boundary; never log a raw body or error.
function safePartnerDiagnostic(value: string, form: FormData): string {
  const personalKey = /email|phone|name|soyad|eposta|telefon|^ad$|hane_buyuklugu|hedef|processing_consent|bp_guard/i;
  const submittedValues = ['ad', 'soyad', 'eposta', 'telefon', 'hane_buyuklugu', 'hedef', 'processing_consent', HONEYPOT_FIELD]
    .flatMap((field) => form.getAll(field).flatMap((item) => {
      const text = String(item).trim();
      return field === 'ad' || field === 'soyad' ? [text, ...text.split(/\s+/)] : [text];
    }))
    .filter(Boolean);
  function redact(text: string): string {
    for (const submitted of submittedValues) {
      const escaped = submitted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = escaped.replace(/[iIıİ]/g, '[iIıİ]');
      text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, 'giu'), '[REDACTED]');
    }
    return text
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED]')
      .replace(/\+?\d[\d ()-]{6,}\d/g, '[REDACTED]');
  }
  function strip(item: unknown): unknown {
    if (typeof item === 'string') {
      try {
        const parsed: unknown = JSON.parse(item);
        if (parsed && typeof parsed === 'object') return JSON.stringify(strip(parsed));
      } catch { /* Plain-text partner messages are supported too. */ }
      return redact(item);
    }
    if (Array.isArray(item)) return item.map(strip);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item)
        .filter(([key]) => !personalKey.test(key))
        .map(([key, child]) => [redact(key), strip(child)]));
    }
    return item;
  }
  return strip(value) as string;
}

function parsePartnerResponse(body: string): { result?: boolean; code: string; message: string } | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') return null;
    const { result, code, message } = parsed as Record<string, unknown>;
    return {
      result: typeof result === 'boolean' ? result : undefined,
      code: typeof code === 'string' ? code : '',
      message: typeof message === 'string' ? message : JSON.stringify(message) || '',
    };
  } catch {
    return null;
  }
}

async function storeFailedLead(
  store: PagesContext['env']['LEAD_FAILURES'],
  partnerPayload: Record<string, string>,
  form: FormData,
  tblci: string,
  diagnostics: { downstreamStatus?: number; downstreamCode?: string; downstreamMessage?: string },
): Promise<void> {
  const timestamp = new Date().toISOString();
  const diagnostic = {
    ...diagnostics,
    click_id: tblci,
    creo: partnerPayload.creo,
    timestamp,
  };
  if (!store) {
    console.error(JSON.stringify(diagnostic));
    return;
  }

  const record = {
    timestamp,
    partnerPayload,
    click_id: tblci,
    qualificationAnswers: {
      hane_buyuklugu: String(form.get('hane_buyuklugu') || ''),
      hedef: String(form.get('hedef') || ''),
    },
    processing_consent: Boolean(form.get('processing_consent')),
  };
  const key = `failed-leads/${timestamp}/${crypto.randomUUID()}`;
  try {
    await store.put(key, JSON.stringify(record), { expirationTtl: 2592000 });
  } catch {
    console.error(JSON.stringify(diagnostic));
    return;
  }
  console.error(JSON.stringify({ ...diagnostic, recoveryKey: key }));
}

async function sendTaboolaConversion(endpoint: string, eventName: string, tblci: string): Promise<void> {
  const url = `${endpoint}?click-id=${encodeURIComponent(tblci)}&name=${encodeURIComponent(eventName)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(JSON.stringify({ click_id: tblci, timestamp: new Date().toISOString() }));
      return;
    }
    console.info(JSON.stringify({ event: 'taboola_s2s', status: response.status, accepted: true, clickIdLength: tblci.length }));
  } catch {
    console.error(JSON.stringify({ click_id: tblci, timestamp: new Date().toISOString() }));
  }
}

function queueBackground(context: PagesContext, promise: Promise<unknown>): void {
  try {
    context.waitUntil(promise.catch(() => undefined));
  } catch { /* A background task must never invalidate the lead response. */ }
}

function recordServerEvent(context: PagesContext, event: FunnelEvent): void {
  if (!context.env.LEAD_FAILURES || typeof context.env.LEAD_FAILURES.get !== 'function') return;
  queueBackground(context, incrementFunnelEvent(context.env.LEAD_FAILURES as FunnelKv, event));
}

async function deliveryFailure(
  context: PagesContext,
  partnerPayload: Record<string, string>,
  form: FormData,
  tblci: string,
  diagnostics: { downstreamStatus?: number; downstreamCode?: string; downstreamMessage?: string },
): Promise<Response> {
  recordServerEvent(context, 'delivery_failed');
  await storeFailedLead(context.env.LEAD_FAILURES, partnerPayload, form, tblci, diagnostics);
  return result(context.request, { ok: false, message: 'Aktarım başarısız.' }, 502);
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (env.PUBLIC_LEAD_FUNNEL_ENABLED !== 'true') return result(request, { ok: false, message: 'Bulunamadı.' }, 404);
  const form = await request.formData();
  if (shouldRejectHoneypot(form)) {
    recordServerEvent(context, 'honeypot_rejected');
    return result(request, { ok: true });
  }

  const required = ['ad', 'soyad', 'hane_buyuklugu', 'hedef', 'processing_consent'];
  if (required.some((field) => !form.get(field))) return result(request, { ok: false, message: 'Eksik alan.' }, 400);
  const email = String(form.get('eposta') || '').trim();
  const phone = String(form.get('telefon') || '').trim();
  if (!email || !phone) return result(request, { ok: false, message: 'İletişim bilgileri gerekli.' }, 400);
  const endpoint = env.LEAD_ENDPOINT?.trim();
  if (!endpoint) return result(request, { ok: false, message: 'Endpoint henüz yapılandırılmadı.' }, 503);

  const tblci = String(form.get('tblci') || '').trim();
  const partnerPayload = {
    email,
    phone,
    firstName: String(form.get('ad') || '').trim(),
    lastName: String(form.get('soyad') || '').trim(),
    country: (request.headers.get('CF-IPCountry') || '').trim().toUpperCase(),
    lang: languageFromHeader(request.headers.get('Accept-Language')),
    creo: String(form.get('creo') || '').trim(),
    marker: env.PARTNER_MARKER || '',
    offer: env.PARTNER_OFFER || '',
    ip: request.headers.get('CF-Connecting-IP') || '',
    description: '',
    domain: new URL(request.url).hostname,
    sourcetype: 'taboola',
  };

  let response: Response;
  let partnerResponse: ReturnType<typeof parsePartnerResponse>;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partnerPayload),
      signal: AbortSignal.timeout(PARTNER_TIMEOUT_MS),
    });
    const downstreamBody = await readResponseBody(response);
    partnerResponse = parsePartnerResponse(downstreamBody);
  } catch {
    return deliveryFailure(context, partnerPayload, form, tblci, {});
  }

  const downstreamCode = partnerResponse?.code || '';
  const downstreamMessage = partnerResponse?.message || '';
  const accepted = response.ok && partnerResponse?.result === true;
  const duplicate = response.ok && partnerResponse?.result === false && downstreamMessage === 'DUPLICATE';

  if (duplicate) {
    recordServerEvent(context, 'delivery_duplicate');
    console.info(JSON.stringify({
      downstreamStatus: response.status,
      downstreamCode: safePartnerDiagnostic(downstreamCode, form),
      downstreamMessage: safePartnerDiagnostic(downstreamMessage, form),
      click_id: tblci,
      creo: partnerPayload.creo,
    }));
    return result(request, { ok: true });
  }

  if (!accepted) {
    return deliveryFailure(
      context,
      partnerPayload,
      form,
      tblci,
      {
        downstreamStatus: response.status,
        downstreamCode: safePartnerDiagnostic(downstreamCode, form),
        downstreamMessage: safePartnerDiagnostic(downstreamMessage, form),
      },
    );
  }

  const taboolaEndpoint = env.TABOOLA_S2S_ENDPOINT?.trim();
  const taboolaEventName = env.TABOOLA_EVENT_NAME?.trim();
  if (tblci && taboolaEndpoint && taboolaEventName) {
    queueBackground(context, sendTaboolaConversion(taboolaEndpoint, taboolaEventName, tblci));
  }

  recordServerEvent(context, 'delivery_success');

  return result(request, { ok: true });
}
