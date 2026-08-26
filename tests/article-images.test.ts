import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentDir = join(process.cwd(), 'src/content/blog');
const imageDir = join(process.cwd(), 'public/images/articles');
const slugs = readdirSync(contentDir)
  .filter((file) => file.endsWith('.md'))
  .map((file) => basename(file, '.md'));

function expectWebp(path: string) {
  const data = readFileSync(path);
  expect(data.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(data.subarray(8, 12).toString('ascii')).toBe('WEBP');
  expect(statSync(path).size).toBeLessThan(150_000);
}

describe('article photography', () => {
  it('provides optimized responsive WebP images for every article', () => {
    for (const slug of slugs) {
      expectWebp(join(imageDir, `${slug}-720.webp`));
      expectWebp(join(imageDir, `${slug}.webp`));
    }
  });

  it('references the production image and has descriptive alt text', () => {
    for (const slug of slugs) {
      const source = readFileSync(join(contentDir, `${slug}.md`), 'utf8');
      expect(source).toContain(`heroImage: "/images/articles/${slug}.webp"`);
      expect(source).toMatch(/^heroImageAlt: ".{20,}"$/m);
      expect(source).not.toContain('geometrik');
    }
  });
});
