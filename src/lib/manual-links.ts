/**
 * Builds a ManualsLib search URL for a given brand + model.
 * Used as the fallback when Brave search hasn't run yet or returns nothing.
 * ManualsLib is indexed by base model number and works for every major brand.
 */

export function buildManualUrls(
  brand: string,
  model: string
): { type: string; url: string; source: 3 }[] {
  const q = encodeURIComponent(`${brand} ${model} installation manual`.trim());
  return [
    {
      type: "INSTALL",
      url: `https://www.manualslib.com/search/?q=${q}`,
      source: 3,
    },
  ];
}
