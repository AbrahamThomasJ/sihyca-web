import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';
import { unified } from '@astrojs/markdown-remark';
import { loadEnv } from 'vite';

// Carga .env (PUBLIC_SITE_URL, STRICT_CONFIG) antes de leer la configuración del sitio.
Object.assign(process.env, {
  ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''),
  ...process.env,
});

const { site } = await import('./src/data/site.ts');
const { cspBaseDirectives, cspScriptResources } = await import('./src/security/headers.ts');
const { securityHeaders } = await import('./src/security/integration.ts');

// Esquema de saneado: el de por defecto + atributos de imagen y clases de código.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), 'loading', 'decoding', 'width', 'height'],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./]],
  },
};

export default defineConfig({
  site: site.url,
  integrations: [sitemap(), securityHeaders(site)],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  security: {
    // Astro calcula los hashes de scripts/estilos inline y los añade al <meta> CSP de cada página.
    csp: {
      directives: cspBaseDirectives(site),
      scriptDirective: { resources: ["'self'", ...cspScriptResources(site)] },
    },
  },
  markdown: {
    processor: unified({
      rehypePlugins: [
        [rehypeSanitize, sanitizeSchema],
        [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
      ],
    }),
  },
});
