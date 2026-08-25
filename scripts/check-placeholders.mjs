import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const roots = ['src', 'public', 'functions'];
const textExtensions = new Set(['.astro', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.txt', '.xml', '.yml', '.yaml']);
const matches = [];

async function scan(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      await scan(fullPath);
    } else if (textExtensions.has(extname(entry.name))) {
      const lines = (await readFile(fullPath, 'utf8')).split('\n');
      lines.forEach((line, index) => {
        for (const token of line.matchAll(/\{\{[A-Z0-9_]+\}\}/g)) {
          matches.push(`${relative('.', fullPath)}:${index + 1} ${token[0]}`);
        }
      });
    }
  }
}

for (const root of roots) await scan(root);

if (matches.length === 0) process.exit(0);
const enabled = process.env.PUBLIC_LEAD_FUNNEL_ENABLED === 'true';
const message = `Unresolved placeholders:\n${matches.map((match) => `- ${match}`).join('\n')}`;
if (enabled) {
  console.error(message);
  process.exit(1);
}
console.warn(`${message}\nLead funnel is disabled; continuing build.`);
