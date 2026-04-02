/**
 * Builds a ManualsLib search URL for a given brand + model.
 * Used as the fallback when Brave search hasn't run yet or returns nothing.
 * ManualsLib is indexed by base model number and works for every major brand.
 */

import { normalizeBrandForManualsLib } from "./brand-domains";
import { getBaseModel } from "./model-utils";

export function buildManualUrls(
  brand: string,
  model: string
): { type: string; url: string; source: 3 }[] {
  const mlBrand = normalizeBrandForManualsLib(brand);
  const baseModel = getBaseModel(model);
  const q = encodeURIComponent(`${mlBrand} ${baseModel} installation manual`.trim());
  return [
    {
      type: "INSTALL",
      url: `https://www.manualslib.com/search/?q=${q}`,
      source: 3,
    },
  ];
}
