import { describe, expect, it, vi } from 'vitest';
import { purge, shouldDelete, RETENTION_MS } from '../scripts/purge-lead-failures.mjs';

const now = Date.parse('2026-10-16T12:00:00Z');

describe('failure record purge', () => {
  it('deletes old, malformed, missing, and future timestamps, retaining the 30-day boundary', () => {
    for (const record of [null, {}, { timestamp: 123 }, { timestamp: 'bad' }, { timestamp: '2026-02-31T00:00:00Z' }, { timestamp: new Date(now + 1000).toISOString() }, { timestamp: new Date(now - RETENTION_MS - 1).toISOString() }]) {
      expect(shouldDelete(record, now)).toBe(true);
    }
    expect(shouldDelete({ timestamp: new Date(now - RETENTION_MS).toISOString() }, now)).toBe(false);
    expect(shouldDelete({ timestamp: new Date(now).toISOString() }, now)).toBe(false);
  });

  it('scans all pages, counts before deleting, and never logs record contents', async () => {
    const log = vi.fn();
    const deleted: string[] = [];
    const api = vi.fn(async (path: string, options: { method?: string } = {}) => {
      if (path.startsWith('/keys')) {
        if (deleted.length) return { result: [{ name: 'recent' }] };
        if (path.includes('cursor=')) return { result: [{ name: 'recent' }, { name: 'invalid' }] };
        return { result: [{ name: 'old' }], result_info: { cursor: 'page2' } };
      }
      if (options.method === 'DELETE') {
        expect(log.mock.calls.slice(0, 3).map((call) => call[0])).toEqual(['Total keys: 3', 'Will delete: 2', 'Will keep: 1']);
        deleted.push(path);
        return { success: true };
      }
      return JSON.stringify(path.endsWith('recent') ? { timestamp: new Date(now).toISOString() } : { private: 'DO NOT LOG' });
    });
    await purge({ api, apply: true, now, log });
    expect(deleted).toEqual(['/values/old', '/values/invalid']);
    expect(log.mock.calls.map((call) => call[0])).toEqual(['Total keys: 3', 'Will delete: 2', 'Will keep: 1', 'Deleted: 2', 'Kept: 1', 'Count afterwards: 1']);
  });

  it('aborts without deletion when a read fails', async () => {
    const api = vi.fn(async (path: string, _options?: { method?: string }) => {
      if (path.startsWith('/keys')) return { result: [{ name: 'old' }, { name: 'unreadable' }] };
      if (path.endsWith('old')) return '{}';
      throw new Error('read failed');
    });
    await expect(purge({ api, apply: true, now, log: vi.fn() })).rejects.toThrow('read failed');
    expect(api.mock.calls.every((call) => call.length === 1 || call[1]?.method !== 'DELETE')).toBe(true);
  });

  it('defaults to dry run', async () => {
    const api = vi.fn(async (path: string) => path.startsWith('/keys') ? { result: [{ name: 'old' }] } : '{}');
    const log = vi.fn();
    await purge({ api, now, log });
    expect(log).toHaveBeenCalledWith('Deleted: 0 (dry run)');
    expect(log).toHaveBeenCalledWith('Count afterwards: 1');
  });
});
