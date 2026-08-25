import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import satori from 'satori';
import { coverSvg } from '@/lib/cover-art';

export const getStaticPaths = (async () => {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export async function GET({ props }: { props: { post: Awaited<ReturnType<typeof getCollection<'blog'>>>[number] } }) {
  const { post } = props;
  const [regular, bold] = await Promise.all([
    readFile(new URL('../../../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
    readFile(new URL('../../../assets/fonts/NotoSans-Bold.ttf', import.meta.url)),
  ]);
  const background = `data:image/svg+xml,${encodeURIComponent(coverSvg(post.id, post.data.category))}`;
  const svg = await satori({
    type: 'div',
    props: {
      style: { width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '64px 72px', color: '#1A1A1A', fontFamily: 'Noto Sans', position: 'relative', overflow: 'hidden' },
      children: [
        { type: 'img', props: { src: background, width: 1200, height: 675, style: { position: 'absolute', inset: 0, width: '1200px', height: '675px' } } },
        { type: 'div', props: { style: { position: 'absolute', inset: 0, backgroundColor: '#FCFCFA', opacity: 0.82 } } },
        { type: 'div', props: { style: { display: 'flex', color: '#0F4C4A', fontSize: '28px', fontWeight: 700, marginBottom: '24px' }, children: 'Bütçe Pusulası' } },
        { type: 'div', props: { style: { display: 'flex', maxWidth: '1020px', fontSize: '58px', fontWeight: 700, lineHeight: 1.12 }, children: post.data.title } },
      ],
    },
  }, { width: 1200, height: 630, fonts: [
    { name: 'Noto Sans', data: regular, weight: 400, style: 'normal' },
    { name: 'Noto Sans', data: bold, weight: 700, style: 'normal' },
  ] });
  const png = new Uint8Array(new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
