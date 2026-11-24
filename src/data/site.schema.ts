import { z } from 'astro/zod';

/**
 * Validación de la configuración del cliente (src/data/site.ts).
 * Si algo no cumple, el build FALLA con un mensaje claro.
 *
 * Para ampliar las listas de dominios permitidos, edita las constantes de
 * este archivo (SOCIAL_HOSTS, MAP_LINK_HOSTS, FORM_PROVIDER_HOSTS).
 */

const env = (key: string): string | undefined =>
  (typeof process !== 'undefined' ? process.env[key] : undefined) ??
  (import.meta as unknown as { env?: Record<string, string> }).env?.[key];

export const SOCIAL_HOSTS: Record<string, string[]> = {
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  facebook: ['facebook.com', 'www.facebook.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
};

export const MAP_LINK_HOSTS = [
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
];

/** Proveedores de formularios permitidos. Añade aquí el tuyo si es otro. */
export const FORM_PROVIDER_HOSTS = [
  'formspree.io',
  'usebasin.com',
  'getform.io',
  'api.web3forms.com',
];

const parseHttps = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
};

const httpsUrl = (label: string) =>
  z.string().refine((v) => v === '' || parseHttps(v) !== null, {
    message: `${label}: debe ser una URL https:// válida (se rechazan javascript:, data:, http:, etc.)`,
  });

const hostIn = (value: string, hosts: string[]) => {
  const url = parseHttps(value);
  return !!url && hosts.includes(url.hostname);
};

export const siteConfigSchema = z
  .object({
    url: httpsUrl('url'),
    email: z.union([z.literal(''), z.string().email('email: no es un correo válido')]),
    phone: z.string().max(40),
    phoneHref: z
      .string()
      .regex(/^(\+?\d{6,15})?$/, 'phoneHref: solo dígitos con "+" opcional (6–15 dígitos)'),
    whatsappNumber: z
      .string()
      .regex(/^(\d{8,15})?$/, 'whatsappNumber: formato internacional sin "+" (8–15 dígitos)'),
    mapUrl: httpsUrl('mapUrl'),
    mapEmbed: httpsUrl('mapEmbed'),
    formEndpoint: httpsUrl('formEndpoint'),
    captcha: z.object({
      provider: z.enum(['', 'turnstile']),
      siteKey: z.string().regex(/^[\w-]*$/, 'captcha.siteKey: caracteres no válidos'),
    }),
    socials: z.array(
      z.object({
        label: z.string(),
        icon: z.string(),
        href: httpsUrl('socials[].href'),
      }),
    ),
  })
  .passthrough()
  .superRefine((cfg, ctx) => {
    const add = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (cfg.mapUrl && !hostIn(cfg.mapUrl, MAP_LINK_HOSTS)) {
      add(['mapUrl'], `mapUrl: el dominio debe ser uno de ${MAP_LINK_HOSTS.join(', ')}`);
    }

    if (cfg.mapEmbed) {
      const u = parseHttps(cfg.mapEmbed);
      const ok =
        !!u &&
        ((u.hostname === 'www.google.com' && u.pathname.startsWith('/maps/embed')) ||
          (u.hostname === 'maps.google.com' &&
            u.pathname.startsWith('/maps') &&
            u.searchParams.get('output') === 'embed'));
      if (!ok) {
        add(
          ['mapEmbed'],
          'mapEmbed: solo https://www.google.com/maps/embed?... o https://maps.google.com/maps?...&output=embed',
        );
      }
    }

    if (cfg.formEndpoint && !hostIn(cfg.formEndpoint, FORM_PROVIDER_HOSTS)) {
      add(
        ['formEndpoint'],
        `formEndpoint: proveedor no permitido. Permitidos: ${FORM_PROVIDER_HOSTS.join(', ')} (amplía FORM_PROVIDER_HOSTS en src/data/site.schema.ts)`,
      );
    }

    if (cfg.captcha.provider && !cfg.captcha.siteKey) {
      add(['captcha', 'siteKey'], 'captcha: falta siteKey para el proveedor elegido');
    }

    cfg.socials.forEach((social, i) => {
      if (!social.href) return;
      const allowed = SOCIAL_HOSTS[social.icon];
      if (!allowed) {
        add(['socials', i, 'icon'], `socials[${i}].icon "${social.icon}" sin lista de dominios en SOCIAL_HOSTS`);
      } else if (!hostIn(social.href, allowed)) {
        add(['socials', i, 'href'], `socials[${i}].href: el dominio debe ser uno de ${allowed.join(', ')}`);
      }
    });

    if (parseHttps(cfg.url)?.hostname.endsWith('example.com')) {
      const message =
        'url: sigue usando el dominio de ejemplo example.com. Define PUBLIC_SITE_URL con el dominio real.';
      if (env('STRICT_CONFIG') === '1') add(['url'], message);
      else if (env('NODE_ENV') === 'production') console.warn(`\n⚠️  [seguridad] ${message}\n`);
    }
  });

export function validateSiteConfig(config: unknown): void {
  const result = siteConfigSchema.safeParse(config);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.message}`).join('\n');
    throw new Error(`\n[src/data/site.ts] Configuración inválida:\n${lines}\n`);
  }
}
