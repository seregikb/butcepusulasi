export const HONEYPOT_FIELD = 'bp_guard_7c1';
export const FORM_STARTED_AT_FIELD = 'bp_started_4d2';
export const HONEYPOT_FAST_THRESHOLD_MS = 2_000;

export function shouldRejectHoneypot(form: FormData, now = Date.now()): boolean {
  if (!String(form.get(HONEYPOT_FIELD) || '').trim()) return false;
  const startedAt = Number.parseInt(String(form.get(FORM_STARTED_AT_FIELD) || ''), 10);
  if (!Number.isFinite(startedAt)) return false;
  const elapsed = now - startedAt;
  return elapsed >= 0 && elapsed < HONEYPOT_FAST_THRESHOLD_MS;
}
