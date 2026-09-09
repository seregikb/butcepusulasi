import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const dist = join(root, 'dist');
const astroCli = join(root, 'node_modules/astro/astro.js');
const funnelRoutes = ['aydinlatma-metni', 'butce-plani', 'tesekkurler'];

interface BuildState {
  routeHtml: Record<string, string>;
  sitemap: string;
  rss: string;
  anchorPages: Record<string, string[]>;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function build(enabled: boolean): BuildState {
  execFileSync(process.execPath, [astroCli, 'build'], {
    cwd: root,
    env: { ...process.env, PUBLIC_LEAD_FUNNEL_ENABLED: String(enabled) },
    stdio: 'pipe',
  });

  const files = walk(dist);
  const htmlFiles = files.filter((path) => path.endsWith('.html'));
  const sitemap = files
    .filter((path) => /sitemap.*\.xml$/.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  const anchorPages = Object.fromEntries(funnelRoutes.map((route) => [route, htmlFiles.flatMap((path) => {
    const html = readFileSync(path, 'utf8');
    const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
      .filter((match) => match[1] === `/${route}/`);
    return links.map(() => relative(dist, path));
  })]));

  return {
    routeHtml: Object.fromEntries(funnelRoutes.map((route) => [route, readFileSync(join(dist, route, 'index.html'), 'utf8')])),
    sitemap,
    rss: readFileSync(join(dist, 'rss.xml'), 'utf8'),
    anchorPages,
  };
}

let disabled: BuildState;
let enabled: BuildState;

beforeAll(() => {
  disabled = build(false);
  enabled = build(true);
}, 120_000);

describe('lead funnel route gating', () => {
  it('keeps disabled routes reachable but fully de-indexed', () => {
    for (const route of funnelRoutes) {
      expect(disabled.routeHtml[route]).toContain('<meta name="robots" content="noindex, nofollow">');
      expect(disabled.sitemap).not.toContain(`/${route}/`);
      expect(disabled.rss).not.toContain(`/${route}/`);
      expect(disabled.anchorPages[route]).toEqual([]);
    }
  });

  it('indexes enabled routes and links from exactly five articles', () => {
    for (const route of funnelRoutes) {
      expect(enabled.routeHtml[route]).toContain('<meta name="robots" content="index, follow">');
      expect(enabled.sitemap).toContain(`/${route}/`);
      expect(enabled.rss).not.toContain(`/${route}/`);
    }
    expect(enabled.anchorPages['butce-plani']).toHaveLength(5);
    expect(new Set(enabled.anchorPages['butce-plani'])).toEqual(new Set([
      'blog/acil-durum-fonu/index.html',
      'blog/basit-butce-sistemi/index.html',
      'blog/gizli-abonelikler/index.html',
      'blog/maas-gelmeden-biten-para/index.html',
      'blog/market-alisverisi-tasarruf/index.html',
    ]));
    expect(enabled.anchorPages['aydinlatma-metni']).toEqual(['butce-plani/index.html']);
    expect(enabled.anchorPages.tesekkurler).toEqual([]);
  });
});
