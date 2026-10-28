import { FUNNEL_EVENTS, funnelKey, utcDate, type FunnelEvent, type FunnelKv } from '../lib/funnel';

interface PagesContext {
  request: Request;
  env: {
    FUNNEL_REPORT_TOKEN?: string;
    LEAD_FAILURES?: FunnelKv;
  };
}

interface DailyRow {
  date: string;
  counts: Record<FunnelEvent, number>;
}

function notFound(): Response {
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

async function tokenMatches(supplied: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const encoder = new TextEncoder();
  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const suppliedBytes = new Uint8Array(suppliedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= suppliedBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

function parseDays(value: string | null): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 14;
  return Math.min(parsed, 90);
}

function dateRange(days: number): string[] {
  const today = new Date(`${utcDate()}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - index);
    return utcDate(date);
  });
}

function percentage(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? '0.0%' : '—';
  return `${((current / previous) * 100).toFixed(1)}%`;
}

function renderChart(totals: Record<FunnelEvent, number>): string {
  const baseline = totals.form_view;
  const drops = FUNNEL_EVENTS.slice(1).map((event, index) => ({
    event,
    drop: totals[FUNNEL_EVENTS[index]] - totals[event],
  }));
  const largestDrop = drops.reduce((largest, candidate) => candidate.drop > largest.drop ? candidate : largest, drops[0]);
  const rows = FUNNEL_EVENTS.map((event, index) => {
    const count = totals[event];
    const ratio = baseline > 0 ? Math.min(count / baseline, 1) : 0;
    const width = Math.round(ratio * 330);
    const y = 30 + (index * 58);
    const previous = index === 0 ? count : totals[FUNNEL_EVENTS[index - 1]];
    const stagePercentage = index === 0 ? '100.0% başlangıç' : `${percentage(count, previous)} önceki aşama`;
    const marker = index > 0 && event === largestDrop.event && largestDrop.drop > 0 ? ' · En büyük düşüş' : '';
    return `<g><text x="8" y="${y + 17}" class="event">${event}</text><rect x="150" y="${y}" width="330" height="24" rx="2" class="track"/><rect x="150" y="${y}" width="${width}" height="24" rx="2" class="bar"/><text x="150" y="${y + 43}" class="value">${count} · ${stagePercentage}${marker}</text></g>`;
  }).join('');
  const chartHeight = 32 + (FUNNEL_EVENTS.length * 58);
  return `<section id="funnel-chart"><h1>Funnel özeti</h1><svg role="img" aria-label="${FUNNEL_EVENTS.length} aşamalı funnel grafiği" viewBox="0 0 500 ${chartHeight}">${rows}</svg></section>`;
}

function renderTable(rows: DailyRow[], totals: Record<FunnelEvent, number>): string {
  const hasPercentage = (event: FunnelEvent, index: number) => index > 0 && event !== 'callout_answer' && event !== 'callout_submit';
  const headers = FUNNEL_EVENTS.flatMap((event, index) => hasPercentage(event, index)
    ? [`<th scope="col">${event}</th>`, `<th scope="col" aria-label="${event} önceki aşama yüzdesi">%</th>`]
    : [`<th scope="col">${event}</th>`]).join('');
  const columns = FUNNEL_EVENTS.flatMap((event, index) => hasPercentage(event, index)
    ? ['<col class="count-column">', '<col class="percentage-column">']
    : ['<col class="count-column">']).join('');
  const cells = (counts: Record<FunnelEvent, number>) => FUNNEL_EVENTS.flatMap((event, index) => {
    if (!hasPercentage(event, index)) return [`<td>${counts[event]}</td>`];
    return [`<td>${counts[event]}</td>`, `<td>${percentage(counts[event], counts[FUNNEL_EVENTS[index - 1]])}</td>`];
  }).join('');
  const body = rows.map((row) => `<tr><th scope="row">${row.date}</th>${cells(row.counts)}</tr>`).join('');
  return `<section><h2>Günlük sonuçlar</h2><div class="table-wrap"><table><colgroup><col class="date-column">${columns}</colgroup><thead><tr><th scope="col">Tarih</th>${headers}</tr></thead><tbody>${body}</tbody><tfoot><tr><th scope="row">Toplam</th>${cells(totals)}</tr></tfoot></table></div></section>`;
}

function renderPage(days: number, rows: DailyRow[], totals: Record<FunnelEvent, number>): string {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Funnel raporu · ${days} gün</title><style>html{font-family:system-ui,sans-serif;color:#202124;background:#f7f7f5}body{margin:0;padding:.75rem}h1,h2{margin:0 0 1rem}section+section{margin-top:2rem}svg{display:block;width:100%;max-width:42rem;height:auto;background:#fff;border:1px solid #d5d7da}.track{fill:#e5e7eb}.bar{fill:#476b63}.event{font-size:13px;font-weight:700;fill:#202124}.value{font-size:12px;fill:#4b5563}.table-wrap{max-width:100%;max-height:70vh;overflow:auto;border:1px solid #d5d7da;background:#fff}table{width:100%;min-width:78rem;border-collapse:separate;border-spacing:0;table-layout:fixed;background:#fff;font-size:.7rem;font-variant-numeric:tabular-nums}.date-column{width:6rem}.count-column{width:3.4rem}.percentage-column{width:2.5rem}th,td{padding:.4rem .25rem;border-right:1px solid #d5d7da;border-bottom:1px solid #d5d7da;text-align:right;white-space:nowrap}thead th{position:sticky;top:0;z-index:3;padding:.45rem .2rem;background:#eef0ed;white-space:normal;overflow-wrap:anywhere;vertical-align:bottom}th:first-child,td:first-child{position:sticky;left:0;z-index:2;text-align:left}thead th:first-child{z-index:4;background:#eef0ed}tbody th,tbody td{background:#fff}tbody tr:nth-child(even) th,tbody tr:nth-child(even) td{background:#f7f7f5}tfoot th,tfoot td{font-weight:700;background:#eef0ed}</style></head><body>${renderChart(totals)}${renderTable(rows, totals)}</body></html>`;
}

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const url = new URL(request.url);
  const suppliedToken = url.searchParams.get('k') || '';
  const expectedToken = env.FUNNEL_REPORT_TOKEN?.trim() || '';
  if (!await tokenMatches(suppliedToken, expectedToken)) return notFound();
  if (!env.LEAD_FAILURES) return notFound();

  const days = parseDays(url.searchParams.get('days'));
  let rows: DailyRow[];
  try {
    rows = await Promise.all(dateRange(days).map(async (date) => {
      const values = await Promise.all(FUNNEL_EVENTS.map((event) => env.LEAD_FAILURES!.get(funnelKey(date, event))));
      const counts = Object.fromEntries(FUNNEL_EVENTS.map((event, index) => {
        const count = Number.parseInt(values[index] || '0', 10);
        return [event, Number.isSafeInteger(count) && count >= 0 ? count : 0];
      })) as Record<FunnelEvent, number>;
      return { date, counts };
    }));
  } catch {
    return notFound();
  }
  const totals = Object.fromEntries(FUNNEL_EVENTS.map((event) => [
    event,
    rows.reduce((sum, row) => sum + row.counts[event], 0),
  ])) as Record<FunnelEvent, number>;

  return new Response(renderPage(days, rows, totals), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
