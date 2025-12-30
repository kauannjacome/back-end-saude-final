export function normalizeText(value?: string): string | null {
  if (!value) return null;

  return value
    .normalize('NFD')                 // separa acentos
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim();
}
