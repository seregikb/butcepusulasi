import { GOAL_OPTIONS, HOUSEHOLD_OPTIONS, PREANSWERED_DESCRIPTION } from '../../src/data/lead-form-options';

interface PagesContext {
  request: Request;
  next(): Promise<Response>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function validChoice<T extends readonly string[]>(options: T, value: string | null): value is T[number] {
  return value !== null && (options as readonly string[]).includes(value);
}

export async function onRequestGet({ request, next }: PagesContext): Promise<Response> {
  const response = await next();
  if (!response.ok || !response.headers.get('Content-Type')?.includes('text/html')) return response;

  const url = new URL(request.url);
  const household = url.searchParams.get('hane_buyuklugu');
  const goal = url.searchParams.get('hedef');
  if (!validChoice(HOUSEHOLD_OPTIONS, household) || !validChoice(GOAL_OPTIONS, goal)) return response;

  const safeHousehold = escapeHtml(household);
  const safeGoal = escapeHtml(goal);
  const summary = `Seçimleriniz: ${safeHousehold} · ${safeGoal}`;
  const html = (await response.text())
    .replace(/(<p id="lead-intro-description"[^>]*>)[\s\S]*?(<\/p>)/, `$1${PREANSWERED_DESCRIPTION}$2`)
    .replace('class="space-y-9" data-lead-step="1"', 'class="space-y-9" data-lead-step="1" hidden')
    .replaceAll('type="radio" name="hane_buyuklugu"', 'type="radio" name="hane_buyuklugu" disabled')
    .replaceAll('type="radio" name="hedef"', 'type="radio" name="hedef" disabled')
    .replace(/(<p id="lead-preanswered"[^>]*?) hidden><\/p>/, `$1>${summary}</p>`)
    .replace('id="preanswered-household" name="hane_buyuklugu" value="" disabled', `id="preanswered-household" name="hane_buyuklugu" value="${safeHousehold}"`)
    .replace('id="preanswered-goal" name="hedef" value="" disabled', `id="preanswered-goal" name="hedef" value="${safeGoal}"`);
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('Content-Encoding');
  headers.set('Cache-Control', 'private, no-store');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
