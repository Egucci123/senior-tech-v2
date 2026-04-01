/**
 * Builds smart manual search URLs per brand.
 * Uses manufacturer documentation domains via Google site: search
 * for direct PDF hits rather than generic search engines.
 */

const BRAND_DOMAINS: Record<string, string> = {
  york: "johnsoncontrols.com OR cgproducts.johnsoncontrols.com",
  "johnson controls": "johnsoncontrols.com OR cgproducts.johnsoncontrols.com",
  coleman: "johnstoncontrols.com OR colemanac.com",
  luxaire: "johnsoncontrols.com",
  fraser: "johnsoncontrols.com",
  carrier: "carrier.com",
  bryant: "bryant.com OR carrier.com",
  payne: "payne-ac.com OR carrier.com",
  day: "carrier.com",
  trane: "trane.com",
  "american standard": "americanstandardair.com OR trane.com",
  lennox: "lennox.com OR lennoxpros.com",
  "dave lennox": "lennox.com",
  elite: "lennox.com",
  goodman: "goodmanmfg.com",
  amana: "amana-hac.com OR goodmanmfg.com",
  daikin: "daikinac.com OR daikincomfort.com",
  rheem: "rheem.com",
  ruud: "ruud.com OR rheem.com",
  heil: "heil-hvac.com OR carrier.com",
  tempstar: "tempstar.com OR carrier.com",
  comfortmaker: "comfortmaker.com OR carrier.com",
  arcoaire: "arcoaire.com OR carrier.com",
  keeprite: "keepriterefrigeration.com",
  icp: "icpusa.com",
  "international comfort": "icpusa.com",
  nordyne: "nordyne.com",
  frigidaire: "frigidaire.com OR nordyne.com",
  gibson: "nordyne.com",
  westinghouse: "nordyne.com",
  "comfort maker": "comfortmaker.com",
  bosch: "bosch-climate.com",
  mitsubishi: "mehvac.com OR mitsubishicomfort.com",
  fujitsu: "fujitsugeneral.com",
  lg: "lghvac.com",
  samsung: "samsung.com",
};

function getBrandDomain(brand: string): string | null {
  const lower = brand.toLowerCase().trim();
  for (const [key, domain] of Object.entries(BRAND_DOMAINS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return domain;
    }
  }
  return null;
}

export function buildManualUrls(
  brand: string,
  model: string
): { type: string; url: string }[] {
  const domain = getBrandDomain(brand);
  const base = brand ? `${brand} ${model}` : model;

  function makeUrl(suffix: string): string {
    if (domain) {
      // Build site: query — encode the whole thing properly
      const primaryDomain = domain.split(" OR ")[0].trim();
      const q = encodeURIComponent(`site:${primaryDomain} ${model} ${suffix}`);
      return `https://www.google.com/search?q=${q}`;
    }
    const q = encodeURIComponent(`${base} ${suffix}`);
    return `https://www.google.com/search?q=${q}`;
  }

  return [
    { type: "INSTALL", url: makeUrl("installation manual filetype:pdf") },
    { type: "SERVICE", url: makeUrl("service manual filetype:pdf") },
    { type: "WIRING", url: makeUrl("wiring diagram filetype:pdf") },
    { type: "PARTS",  url: makeUrl("parts catalog filetype:pdf") },
  ];
}
