// One-off cleanup. Defaults to a dry run; pass --apply to delete expired records.
// Requires CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, LEAD_FAILURES_NAMESPACE_ID.
import { pathToFileURL } from 'node:url';

export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function shouldDelete(record, now) {
  const value = record?.timestamp;
  const timestamp = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
    ? Date.parse(value) : NaN;
  return !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 19) !== value.slice(0, 19)
    || timestamp > now || timestamp < now - RETENTION_MS;
}

export async function purge({ api, apply = false, now = Date.now(), log = console.log }) {
  async function listKeys() {
    const keys = [];
    let cursor = '';
    do {
      const page = await api(`/keys?limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      keys.push(...page.result);
      const next = page.result_info?.cursor || '';
      if (next && next === cursor) throw new Error('KV pagination did not advance');
      cursor = next;
    } while (cursor);
    return keys;
  }

  const keys = await listKeys();
  const toDelete = [];
  for (const key of keys) {
    // HTTP/read errors abort before any deletion. Never print a key or record.
    const raw = await api(`/values/${encodeURIComponent(key.name)}`, { raw: true });
    let record;
    try { record = JSON.parse(raw); } catch { record = null; }
    if (shouldDelete(record, now)) toDelete.push(key.name);
  }
  log(`Total keys: ${keys.length}`);
  log(`Will delete: ${toDelete.length}`);
  log(`Will keep: ${keys.length - toDelete.length}`);
  if (apply) {
    for (const key of toDelete) await api(`/values/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }
  log(`Deleted: ${apply ? toDelete.length : 0}${apply ? '' : ' (dry run)'}`);
  log(`Kept: ${keys.length - (apply ? toDelete.length : 0)}`);
  log(`Count afterwards: ${(await listKeys()).length}`);
}

async function main() {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, LEAD_FAILURES_NAMESPACE_ID: namespace } = process.env;
  if (!token || !account || !namespace) throw new Error('Missing Cloudflare credentials or namespace ID');
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/storage/kv/namespaces/${encodeURIComponent(namespace)}`;
  const api = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`KV API HTTP ${response.status}`);
    if (options.raw) return response.text();
    const data = await response.json();
    if (!data.success) throw new Error('KV API reported failure');
    return data;
  };
  await purge({ api, apply: process.argv.includes('--apply') });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Purge failed; check credentials and API access. No record contents were printed.'); process.exitCode = 1; });
}
