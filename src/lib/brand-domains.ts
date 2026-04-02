/**
 * Single source of truth for brand → documentation domain mapping.
 * Used by both model-spec-lookup.ts (Brave API) and manual-links.ts (fallback URLs).
 */
export const BRAND_DOC_DOMAINS: Record<string, string> = {
  york: "cgproducts.johnsoncontrols.com",
  "johnson controls": "cgproducts.johnsoncontrols.com",
  jci: "cgproducts.johnsoncontrols.com",
  coleman: "cgproducts.johnsoncontrols.com",
  luxaire: "cgproducts.johnsoncontrols.com",
  fraser: "cgproducts.johnsoncontrols.com",
  carrier: "carrier.com",
  bryant: "bryant.com",
  payne: "payne-ac.com",
  heil: "heil-hvac.com",
  tempstar: "tempstar.com",
  comfortmaker: "comfortmaker.com",
  arcoaire: "arcoaire.com",
  keeprite: "keepriterefrigeration.com",
  icp: "icpusa.com",
  "international comfort": "icpusa.com",
  trane: "trane.com",
  "american standard": "americanstandardair.com",
  lennox: "lennoxpros.com",
  "dave lennox": "lennoxpros.com",
  ducane: "lennoxpros.com",
  goodman: "goodmanmfg.com",
  amana: "amana-hac.com",
  daikin: "daikinac.com",
  rheem: "rheem.com",
  ruud: "ruud.com",
  "weather king": "rheem.com",
  nordyne: "nordyne.com",
  frigidaire: "nordyne.com",
  gibson: "nordyne.com",
  westinghouse: "nordyne.com",
  maytag: "nordyne.com",
  intertherm: "nordyne.com",
  miller: "nordyne.com",
  bosch: "bosch-climate.com",
  mitsubishi: "mehvac.com",
  fujitsu: "fujitsugeneral.com",
  lg: "lghvac.com",
  "weil-mclain": "weil-mclain.com",
  navien: "navieninc.com",
  rinnai: "rinnai.us",
  lochinvar: "lochinvar.com",
  "bradford white": "bradfordwhite.com",
  "ao smith": "hotwater.com",
  "a.o. smith": "hotwater.com",
};

export function getBrandDocDomain(brand: string): string | null {
  const lower = brand.toLowerCase().trim();
  for (const [key, domain] of Object.entries(BRAND_DOC_DOMAINS)) {
    if (lower.includes(key) || key.includes(lower)) return domain;
  }
  return null;
}
