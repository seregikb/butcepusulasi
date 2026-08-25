import type { Category } from './site';

export function seedFrom(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function bars(seed: number): string {
  const count = 3 + (seed % 3);
  const heights = Array.from({ length: count }, (_, index) => 170 + ((seed >>> (index * 4)) % 250));
  const distinct = heights.map((height, index) => height + index * 11);
  const sorted = [...distinct].sort((a, b) => b - a);
  const colors = ['#0F4C4A', '#3E7F76', '#9DBAB3', '#D8CDB4', '#E0DACB'];
  const offset = ((seed >>> 20) % 3 - 1) * 45;
  const width = 90;
  const gap = 55;
  const start = 225 + offset;
  const baseline = 540;
  const rects = sorted.map((height, index) => {
    const x = start + index * (width + gap);
    return `<rect x="${x}" y="${baseline - height}" width="${width}" height="${height}" fill="${colors[index]}"/>`;
  }).join('');
  const circleX = start + count * (width + gap) + 90;
  return `${rects}<circle cx="${circleX}" cy="225" r="38" fill="none" stroke="#0F4C4A" stroke-width="8"/>`;
}

function arcs(seed: number): string {
  const anchors = [
    [0, 0], [1200, 0], [1200, 675], [0, 675],
  ] as const;
  const [cx, cy] = anchors[seed % anchors.length];
  const scale = 0.85 + ((seed >>> 8) % 31) / 100;
  const radii = [135, 240, 345, 450].map((radius) => Math.round(radius * scale));
  const colors = ['#0F4C4A', '#3E7F76', '#9DBAB3', '#D8CDB4'];
  return radii.map((radius, index) => (
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${colors[index]}" stroke-width="56"/>`
  )).join('');
}

function path(seed: number): string {
  const dipIndex = 1 + ((seed >>> 6) % 3);
  const hollowIndex = 1 + ((seed >>> 10) % 3);
  const x = [180, 390, 600, 810, 1020];
  const base = [500, 420, 340, 260, 170];
  const y = base.map((value, index) => value + ((seed >>> (index * 3)) % 45));
  y[dipIndex] = Math.min(520, y[dipIndex - 1] + 42);
  const grid = x.map((value) => `<line x1="${value}" y1="90" x2="${value}" y2="585" stroke="#EDE8DC" stroke-width="1" stroke-opacity="0.7"/>`).join('');
  const points = x.map((value, index) => `${value},${y[index]}`).join(' ');
  const dots = x.map((value, index) => index === hollowIndex
    ? `<circle cx="${value}" cy="${y[index]}" r="17" fill="#D8CDB4" stroke="#0F4C4A" stroke-width="8"/>`
    : `<circle cx="${value}" cy="${y[index]}" r="14" fill="#0F4C4A"/>`
  ).join('');
  return `${grid}<polyline points="${points}" fill="none" stroke="#3E7F76" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
}

export function coverSvg(slug: string, category: Category, labelledBy = ''): string {
  const seed = seedFrom(slug);
  const motif = category === 'butceleme' ? bars(seed) : category === 'tasarruf' ? arcs(seed) : path(seed);
  const aria = labelledBy ? ` role="img" aria-labelledby="${labelledBy}"` : ' aria-hidden="true"';
  return `<svg viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice"${aria} xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip-${seed}"><rect width="1200" height="675"/></clipPath></defs><rect width="1200" height="675" fill="#FCFCFA"/><g clip-path="url(#clip-${seed})">${motif}</g><rect x="0.5" y="0.5" width="1199" height="674" fill="none" stroke="#E0DACB"/></svg>`;
}
