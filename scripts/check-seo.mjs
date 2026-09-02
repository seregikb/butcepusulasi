import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const contentDir = join('src', 'content', 'blog');
const files = (await readdir(contentDir)).filter((file) => file.endsWith('.md') || file.endsWith('.mdx'));
const failures = [];

function frontmatterValue(source, key) {
  const frontmatter = source.split(/^---\s*$/m)[1] ?? '';
  return frontmatter.match(new RegExp(`^${key}:\\s*["'](.+)["']$`, 'm'))?.[1];
}

for (const file of files) {
  const source = await readFile(join(contentDir, file), 'utf8');
  const slug = basename(file, `.${file.split('.').pop()}`);
  const title = frontmatterValue(source, 'title');
  const shortTitle = frontmatterValue(source, 'shortTitle');

  if (!title) {
    failures.push({ slug, title: '(missing title)', count: 0, missingShortTitle: false });
    continue;
  }

  const effectiveTitle = shortTitle ?? title;
  const count = Array.from(effectiveTitle).length;
  if (count > 60) failures.push({ slug, title: effectiveTitle, count, missingShortTitle: !shortTitle });
}

if (failures.length > 0) {
  console.error('SEO title validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure.slug}: "${failure.title}" (${failure.count} characters)`);
    if (failure.missingShortTitle) console.error('  Add a shortTitle of 60 characters or fewer.');
  }
  process.exit(1);
}

console.log(`SEO title validation passed for ${files.length} articles.`);
