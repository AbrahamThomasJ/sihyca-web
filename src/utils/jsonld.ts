/**
 * Serializa datos para un <script type="application/ld+json">.
 *
 * JSON.stringify NO escapa "<", así que un valor como
 * `</script><script>alert(1)</script>` rompería el bloque y ejecutaría JS (XSS).
 *
 * REGLA: no uses `set:html` en ningún sitio salvo con esta función.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replaceAll(String.fromCharCode(0x2028), '\\u2028')
    .replaceAll(String.fromCharCode(0x2029), '\\u2029');
}
