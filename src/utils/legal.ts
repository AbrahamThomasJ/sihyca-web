import { site } from '../data/site';

const values: Record<string, string> = {
  RAZON_SOCIAL: site.legalName,
  'NIF/RIF': site.taxId,
  DOMICILIO: site.address,
  EMAIL_PRIVACIDAD: site.privacyEmail || site.email,
};

/** Sustituye {{MARCADORES}} por los datos de site.ts; si faltan, deja un aviso visible. */
export function fillLegal(text: string): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) =>
    values[key.trim()] || `[COMPLETAR ${key.trim()} en src/data/site.ts]`,
  );
}
