/**
 * Builds smart manual search URLs per brand.
 * Uses manufacturer documentation domains via Google site: search
 * for direct PDF hits rather than generic search engines.
 */

import { getBrandDocDomain } from "./brand-domains";

export function buildManualUrls(
  brand: string,
  model: string
): { type: string; url: string }[] {
  const domain = getBrandDocDomain(brand);
  const base = brand ? `${brand} ${model}` : model;

  function makeUrl(suffix: string): string {
    if (domain) {
      const q = encodeURIComponent(`site:${domain} ${model} ${suffix}`);
      return `https://www.google.com/search?q=${q}`;
    }
    const q = encodeURIComponent(`${base} ${suffix}`);
    return `https://www.google.com/search?q=${q}`;
  }

  return [
    { type: "INSTALL", url: makeUrl("installation manual filetype:pdf") },
  ];
}
