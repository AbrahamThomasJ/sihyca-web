import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import {
  CSP_HEADER_ONLY,
  cspBaseDirectives,
  cspScriptResources,
  htaccess,
  netlifyHeaders,
  nginxConf,
  vercelJson,
  type SecuritySiteConfig,
} from './headers';

function walkHtml(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Une los hashes que Astro calculó por página (en el <meta> CSP del HTML final). */
function collectHashes(files: string[], directive: 'script-src' | 'style-src'): string[] {
  const hashes = new Set<string>();
  const metaRe = /<meta[^>]+http-equiv="content-security-policy"[^>]+content="([^"]*)"/gi;
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, content] of html.matchAll(metaRe)) {
      const part = content
        .split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith(`${directive} `));
      for (const h of part?.match(/'sha(?:256|384|512)-[^']+'/g) ?? []) hashes.add(h);
    }
  }
  return [...hashes].sort();
}

export function securityHeaders(site: SecuritySiteConfig): AstroIntegration {
  let root = process.cwd();
  return {
    name: 'sihyca-security-headers',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:build:done': ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const files = walkHtml(outDir);
        const scriptHashes = collectHashes(files, 'script-src');
        const styleHashes = collectHashes(files, 'style-src');

        const csp = [
          ...cspBaseDirectives(site),
          `script-src ${["'self'", ...cspScriptResources(site), ...scriptHashes].join(' ')}`,
          `style-src ${["'self'", ...styleHashes].join(' ')}`,
          ...CSP_HEADER_ONLY,
        ].join('; ');

        fs.writeFileSync(path.join(outDir, '_headers'), netlifyHeaders(csp));
        fs.writeFileSync(path.join(outDir, '.htaccess'), htaccess(csp));
        fs.writeFileSync(path.join(root, 'vercel.json'), vercelJson(csp));
        fs.mkdirSync(path.join(root, 'deploy'), { recursive: true });
        fs.writeFileSync(path.join(root, 'deploy', 'nginx.conf.example'), nginxConf(csp));
        if (site.email) {
          const wk = path.join(outDir, '.well-known');
          fs.mkdirSync(wk, { recursive: true });
          const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
          const lines = [`Contact: mailto:${site.email}`, `Expires: ${expires}`, 'Preferred-Languages: es'];
          if (site.url) lines.push(`Canonical: ${site.url}/.well-known/security.txt`);
          fs.writeFileSync(path.join(wk, 'security.txt'), lines.join(String.fromCharCode(10)) + String.fromCharCode(10));
        }
        console.log(
          `[security] CSP generada (${scriptHashes.length} hashes de script, ${styleHashes.length} de estilo) -> _headers, .htaccess, vercel.json, deploy/nginx.conf.example`,
        );
      },
    },
  };
}
