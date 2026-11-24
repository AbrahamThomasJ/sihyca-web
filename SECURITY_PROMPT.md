# Prompt para Sonnet — Endurecimiento de seguridad del sitio SIHYCA (Astro estático)

Eres un ingeniero senior de seguridad web. Trabajas sobre un sitio **100 % estático** generado con **Astro 5** (`astro@5.18.2`, salida `dist/`), sin backend ni base de datos. El sitio es una **plantilla que se revenderá a distintas empresas de mantenimiento industrial**: cada cliente rellenará sus datos en `src/data/site.ts`, escribirá artículos/productos en Markdown (`src/content/`) y lo desplegará en hostings distintos (Netlify, Vercel, Cloudflare Pages, SiteGround/Apache, nginx). Por eso **toda la configuración y el contenido deben tratarse como entradas no confiables** y el sitio debe salir seguro "por defecto" sin que el cliente sepa de seguridad.

Implementa los cambios siguientes, en el orden de prioridad indicado. No cambies el diseño visual ni el comportamiento funcional salvo lo descrito. Al terminar, ejecuta `npm run check`, `npm run build` y `npm audit --omit=dev` y reporta el resultado.

---

## 1. [CRÍTICO] Actualizar dependencias vulnerables

`npm audit --omit=dev` reporta hoy 5 vulnerabilidades (1 crítica, 3 altas, 1 baja):

- `astro <=7.4.6` (crítica): varios XSS (atributos spread, `define:vars`, nombres de slot, view transitions, `<script>/<style>` en JSX/MDX), SSRF por cabecera Host en páginas de error prerenderizadas, RCE en la optimización de imágenes AVIF, etc.
- `esbuild 0.27.3–0.28.0`: lectura arbitraria de ficheros con el servidor de desarrollo **en Windows** (que es el entorno actual de desarrollo).
- `sharp <=0.35.5-rc.1` (alta): CVEs en libvips, libheif y librsvg. Lo usan `scripts/optimize-images.mjs` y `scripts/generate-og.mjs`.
- `zod <4.6.6` (alta) vía Astro.

Tareas:
1. Actualiza `astro` a la última versión parcheada (la sugerida es `7.4.13`, que es **major**: revisa la guía de migración de Astro 5→6→7 y adapta `astro.config.mjs`, `src/content.config.ts` (loaders `glob`, `z` de `astro:content` / `astro/zod`), `render()` de colecciones, etc.). Actualiza también `@astrojs/sitemap` y `@astrojs/check` a versiones compatibles.
2. Actualiza `sharp` a `>=0.35.5` y verifica que los dos scripts siguen funcionando.
3. Fija versiones exactas o con lockfile estricto: añade `"engines": { "node": ">=22" }` (o la mínima que exija la nueva Astro), un `.nvmrc`, y documenta en el README el uso de `npm ci` en lugar de `npm install` para builds.
4. Añade `.github/dependabot.yml` (ecosistema npm, semanal) y, si creas CI, un paso `npm audit --omit=dev --audit-level=high` que falle el build.

## 2. [ALTO] XSS por ruptura de `<script type="application/ld+json">`

En `src/layouts/BaseLayout.astro:126` y `src/components/PageHero.astro:59` se hace:

```astro
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

`JSON.stringify` **no escapa `<`**. Los datos vienen del frontmatter de Markdown (títulos, descripciones, autor, categoría de blog y productos) y de `site.ts`. Un título como `</script><script>alert(document.cookie)</script>` rompe el bloque y ejecuta JS. Como la plantilla se revende y la editarán terceros (o un futuro CMS), es un XSS almacenado real.

Tareas:
1. Crea `src/utils/jsonld.ts` con una función `safeJsonLd(value: unknown): string` que haga `JSON.stringify` y después reemplace `<` → `<`, `>` → `>`, `&` → `&`, ` ` → `\\u2028`, ` ` → `\\u2029`.
2. Úsala en **todos** los `set:html` de JSON-LD (busca `set:html` en todo `src/`).
3. Regla general: prohíbe nuevos `set:html` salvo con esta función; deja un comentario en el util explicando por qué.

## 3. [ALTO] Validar la configuración del cliente (`src/data/site.ts`) en tiempo de build

Hoy los valores de `site.ts` se inyectan sin validar en `href`, `src` de iframe y `action` de formulario:

- `site.socials[].href` → `<a href>` en `Footer.astro` (y posiblemente `Header.astro`). Un `javascript:...` sería XSS al hacer clic.
- `site.mapUrl` → `<a href>` en `Footer.astro` y `contact-us.astro`.
- `site.mapEmbed` → `data-map-src` → `iframe.src` en `contact-us.astro:157`. Un `javascript:` o `data:` en el `src` de un iframe **se ejecuta en el origen del sitio**.
- `site.formEndpoint` → `action` y `fetch()` en `ContactForm.astro`: los datos personales de los visitantes se enviarían a cualquier URL.
- `site.whatsappNumber`, `site.phoneHref`, `site.email` → se concatenan en `https://wa.me/...`, `tel:`, `mailto:`.
- `site.url` → canonical, OG y JSON-LD.

Tareas:
1. Crea un esquema **zod** para `site` (p. ej. `src/data/site.schema.ts`) y valida el objeto al importarlo (o en un integration hook `astro:config:setup` / `astro:build:start`) de forma que **el build falle** con un mensaje claro si algo no cumple:
   - Todas las URL externas: `https:` obligatorio (rechaza `javascript:`, `data:`, `vbscript:`, `http:`, rutas relativas raras). Vacío permitido.
   - `socials[].href`: además, allowlist de hostnames por red (`linkedin.com`, `www.linkedin.com`, `instagram.com`, `www.instagram.com`, `facebook.com`, `www.facebook.com`, y los que añadas).
   - `mapEmbed`: solo `https://www.google.com/maps/embed?...` (o `https://maps.google.com/maps?...&output=embed`). Cualquier otro origen → error.
   - `mapUrl`: hostnames de Google Maps (`google.com`, `www.google.com`, `maps.google.com`, `maps.app.goo.gl`, `goo.gl`).
   - `formEndpoint`: `https:` y allowlist configurable de proveedores (`formspree.io`, `usebasin.com`, `getform.io`, `api.web3forms.com`, …). Documenta cómo ampliarla.
   - `whatsappNumber`: `/^\d{8,15}$/` (formato internacional sin `+`).
   - `phoneHref`: `/^\+?[\d]{6,15}$/`.
   - `email`: `z.string().email()`.
   - `url`: `https:` y **no** `example.com` cuando `import.meta.env.PROD` (o cuando se defina una variable `STRICT_CONFIG=1`).
2. Centraliza el dominio: hoy `https://example.com` está repetido en `astro.config.mjs`, `src/data/site.ts` y `public/robots.txt`. Haz que salga de una sola fuente (p. ej. variable `PUBLIC_SITE_URL` en `.env`, con `.env.example`) y genera `robots.txt` desde un endpoint `src/pages/robots.txt.ts` en vez de un fichero estático.
3. Defensa en profundidad en el cliente (`contact-us.astro`, script del mapa): antes de asignar `iframe.src`, parsea con `new URL()` y comprueba `protocol === 'https:'` y `hostname` en la allowlist; si no, no cargues nada.

## 4. [ALTO] Cabeceras de seguridad HTTP y CSP

El sitio no envía ninguna cabecera de seguridad. Como se despliega en hostings distintos, entrega la configuración para todos y documéntala.

Política objetivo (ajústala al HTML real generado):

- `Content-Security-Policy`:
  - `default-src 'self'`
  - `script-src 'self'` + **hashes** de los scripts inline. El build actual genera `<script type="module">` **inline** (menú del header, formulario, mapa) y `<style>` inline (`inlineStylesheets: 'auto'`). Opciones, en orden de preferencia:
    a) Usar la CSP nativa de Astro (`csp` en `astro.config.mjs`, estable en versiones recientes; en Astro 5.9+ era `experimental.csp`), que calcula los hashes automáticamente.
    b) Si no, poner `build.inlineStylesheets: 'never'` y forzar scripts externos (`vite.build.assetsInlineLimit: 0`) para no necesitar hashes.
  - `style-src 'self'` (+ hashes si quedan estilos inline)
  - `img-src 'self' data:`
  - `font-src 'self'`
  - `connect-src 'self'` + origen de `formEndpoint` si está configurado
  - `form-action 'self'` + origen de `formEndpoint` + `https://wa.me` si aplica
  - `frame-src https://www.google.com https://maps.google.com` (solo si hay `mapEmbed`)
  - `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`, `upgrade-insecure-requests`
  - Los bloques `application/ld+json` no son ejecutables y no necesitan hash.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (sin `preload` por defecto; documenta cuándo añadirlo).
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`
- `X-Frame-Options: DENY` (compatibilidad con navegadores viejos)
- `Cross-Origin-Opener-Policy: same-origin`
- Caché: `Cache-Control: public, max-age=31536000, immutable` para `/_astro/*` y `/fonts/*`; `no-cache` para HTML.

Tareas:
1. Genera los headers **desde una sola fuente** (p. ej. `src/security/headers.ts`) y, con una integración de Astro en `astro:build:done`, escribe en `dist/`:
   - `_headers` (Netlify y Cloudflare Pages),
   - `vercel.json` en la raíz del proyecto (o documenta cómo generarlo),
   - `.htaccess` (Apache / SiteGround) con los headers (`mod_headers`), redirección forzada a HTTPS, `Options -Indexes`, `ErrorDocument 404 /404.html` y bloqueo de dotfiles,
   - `deploy/nginx.conf.example` con el bloque `server` equivalente (`add_header ... always`, `autoindex off`, `error_page 404 /404.html`, `location ~ /\. { deny all; }`).
   El hash de la CSP debe calcularse sobre el HTML final, no a mano.
2. Añade como respaldo una `<meta http-equiv="Content-Security-Policy">` en `BaseLayout.astro` **solo** con las directivas que funcionan en meta (no `frame-ancestors`), para hostings donde el cliente no pueda poner cabeceras.
3. Verifica en `npm run preview` que no hay violaciones de CSP en consola en ninguna página (home, contacto con y sin mapa, blog, producto, 404).

## 5. [MEDIO] Iframe de Google Maps

En `src/pages/contact-us.astro` (script del mapa):
- Cambia `iframe.referrerPolicy = 'no-referrer-when-downgrade'` por `'strict-origin-when-cross-origin'`.
- Añade `iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox')` y comprueba que el mapa sigue funcionando.
- Mantén el patrón "click para cargar" (bien hecho: evita enviar datos a Google sin acción del usuario).

## 6. [MEDIO] Formulario de contacto (`src/components/ContactForm.astro`)

Lo que está bien y hay que conservar: honeypot `website`, `encodeURIComponent` en `mailto:`/`wa.me`, uso de `textContent` (no `innerHTML`) para mensajes de estado, `noopener,noreferrer` en `window.open`.

Mejoras:
1. **Límites de longitud** en HTML y en JS: `maxlength` en `nombre` (100), `empresa` (120), `email` (254), `telefono` (25), `mensaje` (2000); `pattern` para teléfono (`[0-9+()\-\s]{6,25}`). Valida también en el script antes de enviar (el HTML se puede saltar).
2. **Anti-spam/anti-abuso** cuando hay `formEndpoint`:
   - Trampa de tiempo: guarda `Date.now()` al cargar y descarta envíos en menos de ~3 s.
   - Cooldown en cliente tras un envío correcto (p. ej. 60 s con el botón deshabilitado).
   - Integración **opcional** con Cloudflare Turnstile (o hCaptcha) activable desde `site.ts` (`captcha: { provider: 'turnstile', siteKey: '' }`), cargando el script solo en `/contact-us/` y añadiéndolo a la CSP solo si está activo. Documenta que la verificación del token la hace el proveedor del formulario (Formspree/Basin lo soportan) — el sitio no tiene backend.
   - Cuando salta el honeypot, muestra el mismo mensaje de éxito (hoy hace `return` silencioso; un bot no debe poder distinguirlo, y un humano con autocompletado agresivo verá que "no pasa nada").
3. Envía también un campo `_subject` y `_gotcha`/honeypot con el nombre que espera el proveedor elegido, para que el filtrado de spam del lado del proveedor funcione.
4. No incluyas el honeypot (`website`) en el `FormData` que se envía al endpoint (elimínalo con `data.delete('website')` tras comprobarlo), salvo que el proveedor lo use como su honeypot.
5. Usa `fetch(endpoint, { ..., mode: 'cors', credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' })`.

## 7. [MEDIO] Privacidad y cumplimiento legal (necesario para vender a empresas)

El formulario recoge datos personales (nombre, correo, teléfono) y los envía a terceros (WhatsApp/Meta, proveedor de formularios, Google Maps) y no existe política de privacidad ni aviso legal.

1. Crea las páginas `/politica-de-privacidad/` y `/aviso-legal/` como plantillas con marcadores (`{{RAZON_SOCIAL}}`, `{{NIF/RIF}}`, `{{DOMICILIO}}`, `{{EMAIL_PRIVACIDAD}}`) rellenados desde `site.ts` (añade esos campos). Enlázalas en el footer.
2. Añade al formulario una casilla **obligatoria** "He leído y acepto la política de privacidad" con enlace, y un texto informativo breve (responsable, finalidad, destinatarios: proveedor del formulario/WhatsApp).
3. Mantén el sitio sin cookies ni analítica. Si en el futuro se añade analítica, deberá ir tras un banner de consentimiento; deja una nota en el README.

## 8. [MEDIO] Contenido Markdown

Astro permite HTML crudo dentro de Markdown, que se renderiza tal cual con `<Content />`. Hoy el contenido lo escribe el desarrollador, pero al revender, lo editarán terceros.

1. Añade `rehype-sanitize` (con un esquema basado en `defaultSchema` que permita los elementos que realmente usan los artículos: encabezados, listas, tablas, `img`, `a`, `code`, `blockquote`) en `markdown.rehypePlugins` de `astro.config.mjs`.
2. Añade `rehype-external-links` para forzar `rel="noopener noreferrer"` (y `target="_blank"` si se desea) en enlaces externos dentro de los artículos.
3. En `src/content.config.ts`, endurece el esquema: `cover` debe ser una ruta local que empiece por `/images/` (regex `^/images/[\w\-/]+\.(webp|png|jpe?g|svg)$`) o una URL `https:`; limita longitudes de `title` (≤ 140), `description` (≤ 300), `author`, `category` (≤ 60). El campo `icon` de productos debe ser un `z.enum` con los iconos que existen en `Icon.astro`.

## 9. [BAJO] Scripts de build

- `scripts/fetch-fonts.mjs`: valida que cada URL de fuente descargada tenga `hostname === 'fonts.gstatic.com'` y sanea el nombre de archivo generado (`slug`) a `[a-z0-9-]` antes de usar `path.join`, para evitar path traversal si cambiara la respuesta remota.
- `scripts/optimize-images.mjs` y `generate-og.mjs`: confirma que solo procesan ficheros dentro de `public/images/` y que no siguen symlinks (`fs.lstat`).

## 10. [BAJO] Extras de higiene

1. Añade `public/.well-known/security.txt` (RFC 9116) generado desde `site.ts` (`Contact: mailto:...`, `Expires:` a un año, `Preferred-Languages: es`). Si no hay email configurado, no lo generes.
2. Añade un `SECURITY.md` breve para los compradores de la plantilla: cómo configurar `site.ts` de forma segura, qué hosting/headers usar, cómo actualizar dependencias y cómo reportar vulnerabilidades.
3. En el README, sección "Despliegue": añade una checklist de producción (dominio real configurado, HTTPS forzado, cabeceras verificadas con securityheaders.com / Mozilla Observatory, `npm audit` limpio, sin `example.com`).
4. Advierte en el README que `astro dev` no debe exponerse con `--host` en redes públicas (además de la vulnerabilidad de esbuild en Windows).

---

## Criterios de aceptación

- `npm audit --omit=dev` sin vulnerabilidades altas ni críticas.
- `npm run check` y `npm run build` sin errores.
- El build **falla** si `site.ts` contiene una URL `javascript:`/`http:`, un `mapEmbed` que no sea de Google Maps, un `formEndpoint` fuera de la allowlist, o `example.com` en producción.
- Un artículo con título `</script><script>alert(1)</script>` no ejecuta JS (prueba manual, luego borrar el artículo).
- `dist/` contiene `_headers` y `.htaccess` con CSP basada en hashes; ninguna página muestra violaciones de CSP en consola.
- El formulario respeta `maxlength`, trampa de tiempo, cooldown y casilla de privacidad; los tres modos (endpoint, WhatsApp, mailto) siguen funcionando.
- No se ha cambiado el aspecto visual del sitio.
