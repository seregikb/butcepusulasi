import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentDir = join(process.cwd(), 'src/content/blog');
const files = readdirSync(contentDir).filter((file) => file.endsWith('.md'));
const pillars = new Set(['50-30-20-kurali', 'finansal-okuryazarlik-nedir', 'zarf-yontemi-butceleme', 'finansal-hedef-belirleme']);
const traffic = new Set(['basit-butce-sistemi', 'maas-gelmeden-biten-para', 'gizli-abonelikler', 'market-alisverisi-tasarruf', 'acil-durum-fonu']);

function parse(file: string) {
  const source = readFileSync(join(contentDir, file), 'utf8');
  const [, frontmatter = '', body = ''] = source.split(/^---\s*$/m);
  const slug = basename(file, '.md');
  const value = (key: string) => frontmatter.match(new RegExp(`^${key}:\\s*["'](.+)["']$`, 'm'))?.[1] || '';
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return { slug, source, frontmatter, body, words, title: value('title'), description: value('description') };
}

describe('article content', () => {
  it('contains the specified 12 ASCII-only article files', () => {
    expect(files).toHaveLength(12);
    for (const file of files) expect(file).toMatch(/^[a-z0-9-]+\.md$/);
  });

  it('keeps titles, descriptions, and word counts within the editorial limits', () => {
    for (const file of files) {
      const article = parse(file);
      expect(article.title.length, `${article.slug} title`).toBeLessThanOrEqual(65);
      expect(article.description.length, `${article.slug} description minimum`).toBeGreaterThanOrEqual(120);
      expect(article.description.length, `${article.slug} description maximum`).toBeLessThanOrEqual(158);
      const range = pillars.has(article.slug) ? [1400, 1800] : traffic.has(article.slug) ? [900, 1200] : [1000, 1400];
      expect(article.words, `${article.slug} minimum words`).toBeGreaterThanOrEqual(range[0]);
      expect(article.words, `${article.slug} maximum words`).toBeLessThanOrEqual(range[1]);
      expect(article.body, `${article.slug} Turkish Lira example`).toContain('₺');
      expect(article.body, `${article.slug} disabled funnel link`).not.toContain('/butce-plani/');
    }
  });

  it('matches title counts and pillar-link rules for traffic articles', () => {
    const expectedHeadings: Record<string, RegExp> = {
      'basit-butce-sistemi': /^## Adım [123]:/gm,
      'maas-gelmeden-biten-para': /^## Harcama [1-7]:/gm,
      'market-alisverisi-tasarruf': /^## Yöntem [1-9]:/gm,
    };
    const expectedCounts: Record<string, number> = { 'basit-butce-sistemi': 3, 'maas-gelmeden-biten-para': 7, 'market-alisverisi-tasarruf': 9 };

    for (const file of files) {
      const article = parse(file);
      if (!traffic.has(article.slug)) continue;
      const pillarLinks = [...article.body.matchAll(/\/blog\/([a-z0-9-]+)\//g)].filter((match) => pillars.has(match[1]));
      expect(pillarLinks, `${article.slug} pillar links`).toHaveLength(2);
      if (expectedHeadings[article.slug]) {
        expect(article.body.match(expectedHeadings[article.slug]) || [], `${article.slug} numbered headings`).toHaveLength(expectedCounts[article.slug]);
      }
    }
  });
});
