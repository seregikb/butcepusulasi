interface PagesContext {
  request: Request;
  env: {
    PUBLIC_LEAD_FUNNEL_ENABLED?: string;
    CONVERSION_API_ENDPOINT?: string;
  };
}

const endpointPlaceholder = '{{CONVERSION_API_ENDPOINT}}';

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (env.PUBLIC_LEAD_FUNNEL_ENABLED !== 'true') return json({ ok: false, message: 'Bulunamadı.' }, 404);
  const form = await request.formData();
  if (String(form.get('website') || '')) return json({ ok: true });

  const required = ['ad', 'gelir_araligi', 'hane_buyuklugu', 'hedef', 'processing_consent', 'transfer_consent'];
  if (required.some((field) => !form.get(field))) return json({ ok: false, message: 'Eksik alan.' }, 400);
  if (!form.get('eposta') && !form.get('telefon')) return json({ ok: false, message: 'İletişim bilgisi gerekli.' }, 400);
  const endpoint = env.CONVERSION_API_ENDPOINT || endpointPlaceholder;
  if (endpoint.includes('{{')) return json({ ok: false, message: 'Endpoint henüz yapılandırılmadı.' }, 503);

  const response = await fetch(endpoint, { method: 'POST', body: form });
  if (!response.ok) return json({ ok: false, message: 'Aktarım başarısız.' }, 502);
  return json({ ok: true });
}
