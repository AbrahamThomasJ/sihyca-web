/**
 * Única fuente de verdad de las cabeceras de seguridad.
 * La integración (src/security/integration.ts) las vuelca a _headers (Netlify /
 * Cloudflare Pages), vercel.json, .htaccess (Apache) y deploy/nginx.conf.example.
 */

export interface SecuritySiteConfig {
  formEndpoint: string;
  mapEmbed: string;
  email?: string;
  url?: string;
  captcha: { provider: string; siteKey: string };
}

const origin = (url: string) => (url ? new URL(url).origin : '');

/**
 * Directivas CSP que funcionan tanto en <meta> como en cabecera HTTP.
 * Astro añade a script-src / style-src los hashes de los scripts y estilos inline.
 */
export function cspBaseDirectives(site: SecuritySiteConfig): string[] {
  const turnstile = site.captcha.provider === 'turnstile' ? 'https://challenges.cloudflare.com' : '';
  const formOrigin = origin(site.formEndpoint);

  const join = (...parts: string[]) => parts.filter(Boolean).join(' ');

  const directives = [
    "default-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${join("'self'", formOrigin)}`,
    `form-action ${join("'self'", formOrigin, 'https://wa.me')}`,
    "base-uri 'self'",
    "object-src 'none'",
  ];

  const frames = join(
    site.mapEmbed ? 'https://www.google.com https://maps.google.com' : '',
    turnstile,
  );
  if (frames) directives.push(`frame-src ${frames}`);

  return directives;
}

/** Directivas solo válidas como cabecera HTTP (no funcionan o no conviene usarlas en <meta>). */
export const CSP_HEADER_ONLY = ["frame-ancestors 'none'", 'upgrade-insecure-requests'];

export const staticHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const IMMUTABLE = 'public, max-age=31536000, immutable';

export function buildHeaderSet(csp: string) {
  return { ...staticHeaders, 'Content-Security-Policy': csp };
}

export function netlifyHeaders(csp: string): string {
  const lines = Object.entries(buildHeaderSet(csp)).map(([k, v]) => `  ${k}: ${v}`);
  // El HTML ya se sirve con revalidación por defecto en Netlify y Cloudflare Pages.
  return [
    '/*',
    ...lines,
    '',
    '/_astro/*',
    `  Cache-Control: ${IMMUTABLE}`,
    '',
    '/fonts/*',
    `  Cache-Control: ${IMMUTABLE}`,
    '',
  ].join('\n');
}

export function vercelJson(csp: string): string {
  const toList = (h: Record<string, string>) =>
    Object.entries(h).map(([key, value]) => ({ key, value }));
  return (
    JSON.stringify(
      {
        headers: [
          { source: '/(.*)', headers: toList(buildHeaderSet(csp)) },
          { source: '/_astro/(.*)', headers: toList({ 'Cache-Control': IMMUTABLE }) },
          { source: '/fonts/(.*)', headers: toList({ 'Cache-Control': IMMUTABLE }) },
        ],
      },
      null,
      2,
    ) + '\n'
  );
}

export function htaccess(csp: string): string {
  const set = Object.entries(buildHeaderSet(csp))
    .map(([k, v]) => `  Header always set ${k} "${v.replace(/"/g, '\\"')}"`)
    .join('\n');
  return `# Generado automáticamente por src/security (npm run build). No editar a mano.
Options -Indexes
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  # Forzar HTTPS
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !=https
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  # Bloquear ficheros ocultos (excepto /.well-known/)
  RewriteRule ^\\.well-known/ - [L]
  RewriteRule (^|/)\\. - [F,L]
</IfModule>

<IfModule mod_headers.c>
${set}

  # HTML: siempre revalidar
  <FilesMatch "\\.(html|xml|txt)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  # Recursos estáticos: caché larga
  <FilesMatch "\\.(css|js|mjs|woff2|webp|png|jpe?g|svg|ico)$">
    Header set Cache-Control "${IMMUTABLE}"
  </FilesMatch>
</IfModule>
`;
}

export function nginxConf(csp: string): string {
  const entries = Object.entries(buildHeaderSet(csp));
  const adds = (indent: string) =>
    entries
      .map(([k, v]) => `${indent}add_header ${k} "${v.replace(/"/g, '\\"')}" always;`)
      .join('\n');

  // nginx NO hereda add_header en un location que define los suyos: se repiten.
  return `# Generado automáticamente por src/security (npm run build). Ajusta server_name y rutas TLS.
server {
    listen 80;
    server_name www.tu-dominio.com tu-dominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name www.tu-dominio.com tu-dominio.com;
    # ssl_certificate     /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    root /var/www/sihyca/dist;
    index index.html;
    autoindex off;
    error_page 404 /404.html;

    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache" always;
${adds('        ')}
    }

    location /_astro/ {
        add_header Cache-Control "${IMMUTABLE}" always;
${adds('        ')}
    }

    location /fonts/ {
        add_header Cache-Control "${IMMUTABLE}" always;
${adds('        ')}
    }

    # Bloquear ficheros ocultos (excepto /.well-known/)
    location ~ /\\.(?!well-known) {
        deny all;
    }
}
`;
}

/** Orígenes externos permitidos en script-src (solo si el captcha está activo). */
export function cspScriptResources(site: SecuritySiteConfig): string[] {
  return site.captcha.provider === 'turnstile' ? ['https://challenges.cloudflare.com'] : [];
}
