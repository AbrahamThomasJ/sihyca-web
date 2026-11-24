import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Imagen local (/images/...) o URL https:. Evita javascript:, data:, http: y rutas arbitrarias.
const imagePath = z.string().regex(/^(\/images\/[\w\-/]+\.(webp|png|jpe?g|svg)|https:\/\/[^\s"'<>]+)$/, {
  message: 'Debe ser una ruta /images/... (webp, png, jpg, svg) o una URL https://',
});

// Iconos que existen en public/icons.svg para productos.
const productIcons = [
  'bearing', 'roller', 'cone', 'thrust', 'pillow', 'seal', 'oring', 'oil', 'belt', 'coupling',
  'gear', 'bolt', 'fan', 'building', 'shield',
] as const;

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(140),
    description: z.string().max(300),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().max(60).default('Industria'),
    cover: imagePath,
    coverAlt: z.string().max(200),
    author: z.string().max(60).default('Equipo SIHYCA'),
    draft: z.boolean().default(false),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string().max(140),
    short: z.string().max(300),
    description: z.string().max(300),
    icon: z.enum(productIcons).default('bearing'),
    order: z.number().default(99),
    features: z.array(z.string().max(200)).default([]),
    applications: z.array(z.string().max(200)).default([]),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog, products };
