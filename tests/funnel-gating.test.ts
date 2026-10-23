import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const dist = join(root, 'dist');
const astroCli = join(root, 'node_modules/astro/astro.js');
const funnelRoutes = ['aydinlatma-metni', 'butce-plani', 'tesekkurler'];
const interactiveCalloutSlugs = ['maas-gelmeden-biten-para', 'gelir-gider-tablosu-sablonu'];
const publicRoutes = ['gizlilik-politikasi', 'iletisim'];
const articleSlugs = [
  '50-30-20-kurali',
  'acil-durum-fonu',
  'basit-butce-sistemi',
  'cocuklara-para-egitimi',
  'finansal-hedef-belirleme',
  'finansal-okuryazarlik-nedir',
  'gelir-gider-tablosu-sablonu',
  'gizli-abonelikler',
  'kredi-karti-ekstresi-okuma',
  'maas-gelmeden-biten-para',
  'market-alisverisi-tasarruf',
  'zarf-yontemi-butceleme',
];

interface BuildState {
  routeHtml: Record<string, string>;
  publicHtml: Record<string, string>;
  articleHtml: Record<string, string>;
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

async function build(enabled: boolean): Promise<BuildState> {
  await promisify(execFile)(process.execPath, [astroCli, 'build'], {
    cwd: root,
    env: {
      ...process.env,
      PUBLIC_LEAD_FUNNEL_ENABLED: String(enabled),
      PUBLIC_TABOOLA_ID: '2084914',
      PUBLIC_GA4_ID: 'G-NKNZXPZ73N',
    },
    maxBuffer: 10 * 1024 * 1024,
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
    publicHtml: Object.fromEntries(publicRoutes.map((route) => [route, readFileSync(join(dist, route, 'index.html'), 'utf8')])),
    articleHtml: Object.fromEntries(articleSlugs.map((slug) => [slug, readFileSync(join(dist, 'blog', slug, 'index.html'), 'utf8')])),
    sitemap,
    rss: readFileSync(join(dist, 'rss.xml'), 'utf8'),
    anchorPages,
  };
}

let disabled: BuildState;
let enabled: BuildState;

beforeAll(async () => {
  disabled = await build(false);
  enabled = await build(true);
}, 120_000);

describe('lead funnel route gating', () => {
  it('keeps disabled routes reachable but fully de-indexed', () => {
    for (const route of funnelRoutes) {
      expect(disabled.routeHtml[route]).toContain('<meta name="robots" content="noindex, nofollow">');
      expect(disabled.sitemap).not.toContain(`/${route}/`);
      expect(disabled.rss).not.toContain(`/${route}/`);
      expect(disabled.anchorPages[route]).toEqual([]);
    }
    for (const route of publicRoutes) {
      expect(disabled.publicHtml[route]).not.toContain('<meta name="robots"');
      expect(disabled.sitemap).toContain(`/${route}/`);
    }
    expect(disabled.articleHtml['basit-butce-sistemi']).toContain('data-event="page_view"');
    expect(disabled.articleHtml['basit-butce-sistemi']).toContain('cdn.taboola.com/libtrc/unip/');
    for (const html of Object.values(disabled.articleHtml)) {
      expect(html).not.toContain('href="/butce-plani/"');
      expect(html).not.toContain('class="article-funnel-callout"');
      expect(html).toContain('<details class="article-toc"><summary class="article-toc__title">İçindekiler</summary>');
      expect(html).not.toContain('<details class="article-toc" open');
    }
    for (const route of funnelRoutes) {
      expect(disabled.routeHtml[route]).not.toContain('2084914');
      expect(disabled.routeHtml[route]).not.toContain('G-NKNZXPZ73N');
    }
    expect(disabled.routeHtml['butce-plani']).not.toContain('cookie-banner');
    expect(disabled.articleHtml['basit-butce-sistemi']).toContain('id="cookie-banner"');
    expect(disabled.routeHtml['butce-plani']).not.toContain("campaignParams.get('utm_content')");
  });

  it('indexes enabled routes and exposes the configured funnel entries', () => {
    for (const route of funnelRoutes) {
      expect(enabled.routeHtml[route]).toContain('<meta name="robots" content="index, follow">');
      expect(enabled.sitemap).toContain(`/${route}/`);
      expect(enabled.rss).not.toContain(`/${route}/`);
    }
    for (const route of publicRoutes) {
      expect(enabled.publicHtml[route]).not.toContain('<meta name="robots"');
      expect(enabled.sitemap).toContain(`/${route}/`);
    }
    expect(enabled.articleHtml['basit-butce-sistemi']).toContain('data-event="page_view"');
    expect(enabled.routeHtml['butce-plani']).not.toContain('cookie-banner');
    expect(enabled.routeHtml['butce-plani']).not.toContain('2084914');
    expect(enabled.routeHtml['butce-plani']).not.toContain('G-NKNZXPZ73N');
    expect(enabled.routeHtml.tesekkurler).toContain('data-event="lead"');
    expect(enabled.routeHtml.tesekkurler).toContain('2084914');
    expect(enabled.routeHtml.tesekkurler).toContain('G-NKNZXPZ73N');
    expect(enabled.routeHtml.tesekkurler).toContain('id="cookie-banner"');
    expect(enabled.articleHtml['basit-butce-sistemi']).toContain('id="cookie-banner"');
    expect(enabled.routeHtml['aydinlatma-metni']).not.toContain('2084914');
    expect(enabled.routeHtml['aydinlatma-metni']).not.toContain('G-NKNZXPZ73N');
    expect(enabled.routeHtml['butce-plani']).toContain('name="eposta" type="email" inputmode="email" autocomplete="email" required');
    expect(enabled.routeHtml['butce-plani']).toContain('name="telefon" type="tel" inputmode="tel" autocomplete="tel" required');
    expect(enabled.routeHtml['butce-plani']).toContain('name="ad" type="text" autocomplete="given-name" required');
    expect(enabled.routeHtml['butce-plani']).toContain('name="soyad" type="text" autocomplete="family-name" required');
    expect(enabled.routeHtml['butce-plani']).toContain('name="hane_buyuklugu"');
    expect(enabled.routeHtml['butce-plani']).toContain('name="hedef"');
    expect(enabled.routeHtml['butce-plani']).not.toContain('gelir_araligi');
    expect(enabled.routeHtml['butce-plani']).toContain('data-lead-step="1"');
    expect(enabled.routeHtml['butce-plani']).toContain('data-lead-step="2"');
    const submitTag = enabled.routeHtml['butce-plani'].match(/<button id="lead-submit"[^>]*>/)?.[0] || '';
    expect(submitTag).toContain('type="submit"');
    expect(submitTag).not.toMatch(/\sdisabled(?:\s|=|>)/);
    expect(enabled.routeHtml['butce-plani']).toContain('id="lead-next"');
    expect(enabled.routeHtml['butce-plani']).not.toContain('sormuyoruz');
    expect(enabled.routeHtml['butce-plani']).toContain('name="creo" value=""');
    expect(enabled.routeHtml['butce-plani']).not.toContain('name="iletisim_turu"');
    expect(enabled.routeHtml['butce-plani'].match(/<input\b[^>]*type="checkbox"[^>]*>/g)).toHaveLength(1);
    expect(enabled.routeHtml['butce-plani']).not.toContain('name="transfer_consent"');
    expect(enabled.routeHtml['butce-plani']).toContain("campaignParams.get('utm_content')");
    expect(enabled.routeHtml['butce-plani']).toContain("window.safeStorage.set('sessionStorage', 'creo', creativeId)");
    expect(enabled.routeHtml['butce-plani']).toContain('window.safeStorage =');
    expect(enabled.routeHtml['butce-plani']).not.toMatch(/(?<!safeStorage\.)sessionStorage\.(?:getItem|setItem)/);
    expect(enabled.routeHtml['butce-plani']).not.toMatch(/(?<!safeStorage\.)localStorage\.(?:getItem|setItem)/);
    expect(enabled.routeHtml['butce-plani']).toContain('<form id="lead-form" name="butce-plani"');
    expect(enabled.routeHtml['butce-plani']).toContain('value="+90 "');
    expect(enabled.anchorPages['butce-plani']).toHaveLength((articleSlugs.length * 5) - interactiveCalloutSlugs.length);
    expect(new Set(enabled.anchorPages['butce-plani'])).toEqual(
      new Set(articleSlugs.map((slug) => `blog/${slug}/index.html`)),
    );
    const firstAnchorTexts: string[] = [];
    for (const [slug, html] of Object.entries(enabled.articleHtml)) {
      const linkIndexes = [...html.matchAll(/<a\b[^>]*href="\/butce-plani\/"/g)].map((match) => match.index);
      const faqIndex = html.indexOf('>Sık Sorulan Sorular</h2>');
      const prose = html.match(/<div class="prose[^>]*>([\s\S]*?)<\/div>\s*<\/article>/)?.[1] || '';
      const proseLinkIndexes = [...prose.matchAll(/<a\b[^>]*href="\/butce-plani\/"/g)].map((match) => match.index);
      const firstParagraphIndex = prose.search(/<p(?:\s|>)/);
      const firstParagraph = prose.match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/)?.[1] || '';
      const firstAnchor = firstParagraph.match(/<a[^>]*href="\/butce-plani\/"[^>]*>(.*?)<\/a>/)?.[1] || '';
      const calloutIndex = prose.indexOf('<aside class="article-funnel-callout">');
      const tocIndex = prose.indexOf('<details class="article-toc">');
      const firstHeadingIndex = prose.indexOf('<h2');
      expect(linkIndexes).toHaveLength(interactiveCalloutSlugs.includes(slug) ? 4 : 5);
      expect(faqIndex).toBeGreaterThan(-1);
      expect(html.match(/class="article-funnel-callout"/g)).toHaveLength(1);
      expect(html).toContain('class="article-funnel-callout__label">ŞABLON</p>');
      expect(html).not.toContain('>ARAÇ</p>');
      expect(prose).toContain('<summary class="article-toc__title">İçindekiler</summary>');
      expect(prose).not.toContain('<details class="article-toc" open');
      expect(firstParagraphIndex).toBeGreaterThanOrEqual(0);
      expect(firstAnchor).not.toBe('');
      expect(firstAnchor.split(/\s+/).length).toBeGreaterThanOrEqual(4);
      expect(firstAnchor.split(/\s+/).length).toBeLessThanOrEqual(9);
      firstAnchorTexts.push(firstAnchor.toLocaleLowerCase('tr'));
      expect(proseLinkIndexes[0]).toBeGreaterThan(firstParagraphIndex);
      expect(proseLinkIndexes[0]).toBeLessThan(calloutIndex);
      expect(calloutIndex).toBeGreaterThan(firstParagraphIndex);
      expect(tocIndex).toBeGreaterThan(calloutIndex);
      expect(firstHeadingIndex).toBeGreaterThan(tocIndex);
      expect(prose.slice(0, calloutIndex).match(/<p(?:\s|>)/g)).toHaveLength(1);
      expect(linkIndexes.slice(0, -1).every((index) => index < faqIndex)).toBe(true);
      expect(linkIndexes.at(-1)).toBeGreaterThan(faqIndex);
      if (interactiveCalloutSlugs.includes(slug)) {
        expect(html).toContain('<form class="article-funnel-callout__form" method="get" action="/butce-plani/" data-article-funnel-form="">');
        expect(html).toContain('name="hane_buyuklugu"');
        expect(html).toContain('name="hedef"');
      } else {
        expect(html).not.toContain('data-article-funnel-form');
      }
    }
    expect(new Set(firstAnchorTexts).size).toBe(articleSlugs.length);
    expect(enabled.anchorPages['aydinlatma-metni']).toEqual(['butce-plani/index.html']);
    expect(enabled.anchorPages.tesekkurler).toEqual([]);
  });
});
