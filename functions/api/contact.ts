interface PagesContext {
  request: Request;
  env: {
    CONTACT_ENDPOINT?: string;
  };
}

const endpointPlaceholder = '{{CONTACT_ENDPOINT}}';

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const form = await request.formData();
  if (String(form.get('website') || '')) return json({ ok: true });

  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim();
  const message = String(form.get('message') || '').trim();
  if (!name || !email || !message) return json({ ok: false, message: 'Eksik alan.' }, 400);
  if (name.length > 100 || email.length > 160 || message.length > 3000 || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ ok: false, message: 'Geçersiz alan.' }, 400);
  }

  const endpoint = env.CONTACT_ENDPOINT || endpointPlaceholder;
  if (endpoint.includes('{{')) return json({ ok: false, message: 'Endpoint henüz yapılandırılmadı.' }, 503);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });
    if (!response.ok) return json({ ok: false, message: 'Aktarım başarısız.' }, 502);
  } catch (error) {
    console.error('Contact delivery request failed.', error);
    return json({ ok: false, message: 'Aktarım başarısız.' }, 502);
  }

  return json({ ok: true });
}
