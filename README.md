# SIHYCA — Sitio web estático

Reconstrucción del sitio de SIHYCA sin WordPress: HTML estático generado con
[Astro](https://astro.build), CSS propio y JavaScript mínimo. Pensado para
cargar rápido en conexiones lentas y para mantenerse sin plugins ni base de
datos.

## Requisitos

- Node.js 22.23.4 o superior (ver `.nvmrc`)
- npm

## Comandos

```bash
npm ci            # instalar dependencias exactas del lockfile (usa esto en builds)
npm install       # solo para añadir o actualizar dependencias
npm run dev       # desarrollo en http://localhost:4321
npm run build     # generar el sitio en dist/ (+ cabeceras de seguridad)
npm run build:strict  # igual, pero falla si sigue el dominio example.com
npm run preview   # previsualizar dist/
npm run check     # typecheck de Astro/TypeScript
npm run og        # regenerar public/og-default.png
npm run images    # convertir PNG/JPG de public/images a WebP
```

## Estructura

```
public/                 archivos estáticos (fuentes, iconos, imágenes, robots.txt)
src/
  components/           Header, Footer, tarjetas, formulario, iconos
  content/
    blog/               artículos en Markdown
    products/           fichas de productos en Markdown
  data/site.ts          datos globales: contacto, redes, servicios, marcas
  layouts/BaseLayout.astro
  pages/                rutas del sitio
  styles/               fuentes y sistema de diseño
  utils/                helpers de fecha
scripts/                generación de fuentes, imágenes y OG
```

## Contenido

- **Datos de contacto, navegación, servicios y marcas:** `src/data/site.ts`.
- **Artículos del blog:** un archivo `.md` por artículo en
  `src/content/blog/`. El nombre del archivo es la URL final
  (`mi-articulo.md` → `/mi-articulo/`).
- **Productos:** un archivo `.md` por producto en `src/content/products/`.
  La URL final es `/product/<nombre-del-archivo>/`.
- El esquema de ambos tipos de contenido está en `src/content.config.ts`.

## Seguridad

Lee [SECURITY.md](SECURITY.md). Resumen: la configuración de `site.ts` se valida al compilar, el
Markdown se sanea, la CSP se genera con hashes y las cabeceras se escriben para Netlify/Cloudflare
(`dist/_headers`), Vercel (`vercel.json`), Apache (`dist/.htaccess`) y nginx (`deploy/nginx.conf.example`).

> **No expongas `npm run dev` con `--host` en redes públicas** (además, el servidor de desarrollo
> de versiones antiguas de esbuild permitía leer archivos en Windows).

## Formulario de contacto

Los campos de correo, teléfono, WhatsApp, dirección, coordenadas, mapa y redes
sociales están vacíos en `src/data/site.ts` para configurarlos más adelante. Al
completarlos se activan automáticamente los enlaces de contacto, las redes y el
mapa.

El formulario exige aceptar la política de privacidad, limita la longitud de los campos, usa un
honeypot, un tiempo mínimo de rellenado y un enfriamiento de 60 s tras enviar. Si activas Turnstile
(`captcha` en `site.ts`), la verificación del token la hace el proveedor del formulario.

Por defecto el formulario no envía a un servidor: arma el mensaje y abre
WhatsApp si hay un número configurado; si no, abre el correo electrónico. Si no
hay ninguno de los dos, muestra un aviso. Para usar un servicio de formularios:

1. Crea el formulario en Formspree, Basin, Getform o Web3Forms.
2. Copia la URL del endpoint (https) en `formEndpoint` de `src/data/site.ts`. Solo se aceptan los
   proveedores de `FORM_PROVIDER_HOSTS` en `src/data/site.schema.ts`; añade ahí el tuyo si es otro.
3. El formulario enviará un `POST` con los campos y mostrará el estado de la
   respuesta.

## Imágenes y fuentes

Las imágenes actuales son SVG de marcador de posición para mantener el sitio
liviano mientras se consiguen las fotos originales. Para reemplazarlas:

1. Copia las fotos a `public/images/` (PNG o JPG).
2. Ejecuta `npm run images` para generar versiones WebP.
3. Actualiza las rutas en las páginas o en `src/data/site.ts`.

Las fuentes están self-hosted en `public/fonts/` (Michroma, Montserrat e
Inter) y se generan con `node scripts/fetch-fonts.mjs`.

## SEO

- `site` en `astro.config.mjs` define la URL canónica y el sitemap.
- Se genera `sitemap-index.xml` automáticamente.
- Cada página incluye metadatos OG/Twitter y JSON-LD (Organization,
  LocalBusiness, BreadcrumbList, Article y Product según corresponda).
- `robots.txt` apunta al sitemap.
- El dominio sale de una única fuente: la variable `PUBLIC_SITE_URL` (ver `.env.example`). Alimenta
  `astro.config.mjs`, `src/data/site.ts` y `robots.txt` (generado por `src/pages/robots.txt.ts`).

## Despliegue

El resultado es totalmente estático: publica el contenido de `dist/` en
cualquier hosting (SiteGround, Netlify, Vercel, Cloudflare Pages o un servidor
nginx). Configura `/404.html` como página de error y fuerza HTTPS en el
hosting.

### Checklist de producción

- [ ] `PUBLIC_SITE_URL` con el dominio real; compilado con `npm run build:strict` (sin `example.com`).
- [ ] Datos legales rellenados en `site.ts` (`legalName`, `taxId`, `address`, `privacyEmail`).
- [ ] HTTPS forzado y certificado válido.
- [ ] Archivo de cabeceras correcto para tu hosting subido/activo.
- [ ] Cabeceras verificadas en https://securityheaders.com y https://developer.mozilla.org/es/observatory.
- [ ] `npm audit --omit=dev` sin vulnerabilidades altas ni críticas.
- [ ] Probado el formulario real (endpoint, WhatsApp o correo).

### Privacidad

El sitio no usa cookies ni analítica. Si añades analítica, publicidad o cualquier cookie no esencial,
hazlo detrás de un banner de consentimiento y actualiza la política de privacidad y la CSP.

## Notas de la migración

Se conservaron las rutas principales del sitio original:

- `/contact-us/`
- `/our-services/`
- `/our-story/`
- `/rodamientos/`
- `/blog/` y artículos en la raíz
- `/product/<slug>/`

La página residual `/global-styles/` de WordPress no se recrea; devuelve 404.
