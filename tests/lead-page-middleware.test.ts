import { describe, expect, it } from 'vitest';
import { onRequestGet } from '../functions/butce-plani/_middleware';

const source = `<!doctype html><html><body>
<p id="lead-intro-description" class="intro">Default description</p>
<form><div class="space-y-9" data-lead-step="1">
<input type="radio" name="hane_buyuklugu" value="1 kişi" required>
<input type="radio" name="hedef" value="Harcamaları düzenlemek" required>
</div><div data-lead-step="2"><p id="lead-preanswered" class="summary" hidden></p></div>
<input type="hidden" id="preanswered-household" name="hane_buyuklugu" value="" disabled>
<input type="hidden" id="preanswered-goal" name="hedef" value="" disabled>
</form></body></html>`;

function context(query: string) {
  return {
    request: new Request(`https://butcepusulasi.com/butce-plani/${query}`),
    next: async () => new Response(source, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
  };
}

describe('lead page query middleware', () => {
  it('renders the contact step with whitelisted choices for no-JS navigation', async () => {
    const response = await onRequestGet(context('?hane_buyuklugu=1+ki%C5%9Fi&hedef=Harcamalar%C4%B1+d%C3%BCzenlemek'));
    const html = await response.text();
    expect(html).toContain('data-lead-step="1" hidden');
    expect(html).toContain('name="hane_buyuklugu" disabled');
    expect(html).toContain('id="preanswered-household" name="hane_buyuklugu" value="1 kişi"');
    expect(html).toContain('id="preanswered-goal" name="hedef" value="Harcamaları düzenlemek"');
    expect(html).toContain('Seçimleriniz: 1 kişi · Harcamaları düzenlemek');
    expect(html).toContain('Seçimlerinizi aldık. İletişim bilgilerinizi girin, tabloyu ve bütçe özetinizi gönderelim.');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it.each([
    '?hane_buyuklugu=&hedef=',
    '?hane_buyuklugu=99&hedef=xyz',
    '?hane_buyuklugu=%3Cscript%3Ealert(1)%3C%2Fscript%3E&hedef=1',
  ])('leaves invalid query values unrendered: %s', async (query) => {
    const html = await (await onRequestGet(context(query))).text();
    expect(html).toBe(source);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('data-lead-step="1" hidden');
  });
});
