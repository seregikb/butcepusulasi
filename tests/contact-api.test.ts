import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../functions/api/contact';

function contactForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values = {
    name: 'Ayşe Yılmaz',
    email: 'ayse@example.com',
    message: 'Bir içerik düzeltmesi bildirmek istiyorum.',
    website: '',
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function request(form: FormData): Request {
  return new Request('https://butcepusulasi.com/api/contact', { method: 'POST', body: form });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('contact endpoint', () => {
  it('returns fake success for the honeypot without forwarding', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(contactForm({ website: 'spam.example' })),
      env: {},
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates required fields and email server-side', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const missing = await onRequestPost({ request: request(contactForm({ message: '' })), env: {} });
    const invalid = await onRequestPost({ request: request(contactForm({ email: 'invalid' })), env: {} });

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards validated contact messages as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: request(contactForm()),
      env: { CONTACT_ENDPOINT: 'https://contact.example/messages' },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('https://contact.example/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ayşe Yılmaz',
        email: 'ayse@example.com',
        message: 'Bir içerik düzeltmesi bildirmek istiyorum.',
      }),
    });
  });

  it('fails explicitly when the contact endpoint is unconfigured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: request(contactForm()), env: {} });

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
