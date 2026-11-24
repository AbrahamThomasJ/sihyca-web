# Seguridad — guía para quien despliega esta plantilla

Sitio 100 % estático (Astro): no hay servidor, base de datos ni sesiones, así que la superficie de ataque es pequeña. Esta guía recoge lo que **sí** depende de ti.

## 1. Configurar `src/data/site.ts` de forma segura

El build **falla** con un mensaje claro si la configuración no cumple estas reglas (esquema en `src/data/site.schema.ts`):

- Todas las URL externas deben ser `https://` (se rechazan `javascript:`, `data:`, `http:`).
- `socials[].href`: solo dominios de la red indicada en `icon` (LinkedIn, Instagram, Facebook, …).
- `mapEmbed`: solo `https://www.google.com/maps/embed?...` (o `https://maps.google.com/maps?...&output=embed`).
- `mapUrl`: solo dominios de Google Maps.
- `formEndpoint`: solo proveedores de la lista `FORM_PROVIDER_HOSTS` (Formspree, Basin, Getform, Web3Forms). Para añadir otro, edítala en `src/data/site.schema.ts`.
- `whatsappNumber`: solo dígitos con prefijo de país, sin `+` (p. ej. `584121234567`).
- Define `PUBLIC_SITE_URL` en `.env` (ver `.env.example`) con el dominio real y compila con `npm run build:strict`: falla si sigue `example.com`.

## 2. Contenido (blog y productos)

El Markdown se sanea con `rehype-sanitize` (se eliminan `<script>`, `<iframe>`, manejadores `on*`, etc.) y los campos del frontmatter se validan (`src/content.config.ts`). Los datos estructurados JSON-LD se serializan con `safeJsonLd` (`src/utils/jsonld.ts`): **no uses `set:html` con otra función**.

## 3. Hosting y cabeceras

`npm run build` genera las cabeceras de seguridad (CSP basada en hashes, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP) desde una única fuente (`src/security/headers.ts`):

| Hosting | Archivo generado |
| --- | --- |
| Netlify / Cloudflare Pages | `dist/_headers` |
| Vercel | `vercel.json` (raíz del proyecto) |
| Apache / SiteGround | `dist/.htaccess` (requiere `mod_headers` y `mod_rewrite`) |
| nginx | `deploy/nginx.conf.example` |

Además, cada página incluye una `<meta http-equiv="Content-Security-Policy">` de respaldo por si el hosting no permite cabeceras (la meta no puede aplicar `frame-ancestors`).

`Strict-Transport-Security` se envía sin `preload`. Añade `; preload` y solicita la inclusión en hstspreload.org solo cuando **todos** los subdominios soporten HTTPS de forma permanente.

## 4. Dependencias

- Instala siempre con `npm ci` (respeta el `package-lock.json`).
- Dependabot (`.github/dependabot.yml`) abre PRs semanales; la CI ejecuta `npm audit --omit=dev --audit-level=high`.
- No expongas `astro dev` con `--host` en redes públicas.

## 5. Formulario de contacto

Sin backend, la protección contra spam es en capas: honeypot, tiempo mínimo de rellenado, enfriamiento de 60 s tras enviar, límites de longitud y casilla de privacidad. Para más protección activa Cloudflare Turnstile (`captcha` en `site.ts`) y habilita la verificación del token en el panel de tu proveedor de formularios.

## 6. Privacidad

El sitio no usa cookies ni analítica. Si añades analítica o publicidad, instala antes un banner de consentimiento y actualiza `/politica-de-privacidad/` y la CSP. Rellena los datos legales (`legalName`, `taxId`, `address`, `privacyEmail`) en `site.ts`.

## 7. Reportar una vulnerabilidad

Si defines `email` en `site.ts`, el build publica `/.well-known/security.txt` con ese contacto. Escribe ahí (o a tu proveedor de la plantilla) indicando pasos para reproducir el problema; evita publicarlo antes de que se corrija.
