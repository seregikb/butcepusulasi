import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const tokenPattern = /\{\{[A-Z0-9_]+\}\}/g;
const placeholderSource = await readFile('src/lib/placeholders.ts', 'utf8');
const placeholderValues = Object.fromEntries(
  [...placeholderSource.matchAll(/^\s*([A-Z0-9_]+):\s*(['"])(.*?)\2,?$/gm)]
    .map((match) => [match[1], match[3]]),
);
const enabled = process.env.PUBLIC_LEAD_FUNNEL_ENABLED === 'true';
const funnelRoutes = new Set(['/aydinlatma-metni/', '/butce-plani/', '/tesekkurler/']);
const sharedFailures = [];
const routeMatches = [];

function unresolvedValue(key) {
  if (key === 'FORM_ENDPOINT' && process.env.PUBLIC_FORM_ENDPOINT) {
    return process.env.PUBLIC_FORM_ENDPOINT.match(tokenPattern)?.[0];
  }
  return placeholderValues[key]?.match(tokenPattern)?.[0];
}

function routeFromPage(path) {
  const page = relative('src/pages', path).split(sep).join('/').replace(/\.astro$/, '');
  if (page === 'index') return '/';
  return `/${page.replace(/\/index$/, '')}/`;
}

async function scan(path, onFile) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) await scan(fullPath, onFile);
    else if (extname(entry.name) === '.astro') await onFile(fullPath, await readFile(fullPath, 'utf8'));
  }
}

await scan('src/pages', (path, source) => {
  const route = routeFromPage(path);
  const tokens = new Set(source.match(tokenPattern) || []);
  for (const match of source.matchAll(/PLACEHOLDERS\.([A-Z0-9_]+)/g)) {
    const token = unresolvedValue(match[1]);
    if (token) tokens.add(token);
  }
  for (const token of tokens) routeMatches.push({ route, path, token });
});

for (const root of ['src/components', 'src/layouts']) {
  await scan(root, (path, source) => {
    const tokens = new Set(source.match(tokenPattern) || []);
    for (const match of source.matchAll(/PLACEHOLDERS\.([A-Z0-9_]+)/g)) {
      const token = unresolvedValue(match[1]);
      if (token) tokens.add(token);
    }
    for (const token of tokens) sharedFailures.push({ path, token });
  });
}

const noindexedRoutes = new Set(enabled ? [] : funnelRoutes);
if (routeMatches.some(({ route }) => route === '/gizlilik-politikasi/')) noindexedRoutes.add('/gizlilik-politikasi/');
if (routeMatches.some(({ route }) => route === '/iletisim/')) noindexedRoutes.add('/iletisim/');

const indexedFailures = routeMatches.filter(({ route }) => !noindexedRoutes.has(route));
const format = ({ route, path, token }) => `${route} (${path}) ${token}`;

if (indexedFailures.length || sharedFailures.length) {
  console.error('Unresolved placeholders would be rendered on indexed pages:');
  for (const match of indexedFailures) console.error(`- ${format(match)}`);
  for (const { path, token } of sharedFailures) console.error(`- shared markup (${path}) ${token}`);
  process.exit(1);
}

if (routeMatches.length) {
  console.warn('Unresolved placeholders are confined to noindexed routes:');
  for (const match of routeMatches) console.warn(`- ${format(match)}`);
}
