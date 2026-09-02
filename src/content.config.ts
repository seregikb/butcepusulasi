import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(65),
    shortTitle: z.string().max(60).optional(),
    description: z.string().min(120).max(158),
    category: z.enum(['butceleme', 'tasarruf', 'finansal-egitim']),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Bütçe Pusulası Editör Ekibi'),
    readingTime: z.number(),
    heroImage: z.string(),
    heroImageAlt: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    relatedPosts: z.array(z.string()).length(2),
  }),
});

export const collections = { blog };
