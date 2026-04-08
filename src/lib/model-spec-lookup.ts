/**
 * Web-based model spec lookup for Senior Tech.
 *
 * MANUAL SOURCE PRIORITY:
 *   1. ManualsLib product page  — most reliable, every major HVAC brand covered
 *   2. Manufacturer direct PDF  — OEM domain, opens PDF directly
 *   3. ManualsLib search URL    — guaranteed fallback, always a live link
 *
 * SPEC CONTEXT: Manufacturer domain + spec results fed to Sonnet as ground truth.
 */

import { getBaseModel, estimateYearFromSerial } from "./model-utils";
import { getBrandDocDomain, normalizeBrandForManualsLib } from "./brand-domains";
import { AI_MODELS, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from "./ai-config";

interface ExtractedModel {
  brand: string;
  model: string;
  serial: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export async function extractModelFromImage(
  base64: string,
  mediaType: string,
  apiKey: string
): Promise<ExtractedModel | null> {
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: AI_MODELS.HAIKU,
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `Return ONLY a JSON object — no markdown, no explanation. Keys: brand, model, serial.

Extract every character of the model number exactly as printed — do not truncate or paraphrase.

If brand is NOT printed on the plate, infer it from the model number prefix:
GSX/GSXC/GSXN/DSXC/AVXC/GMV/GMP/GPH/GPC → Goodman
SSX/ASX/AWX/AVPTC/ARUF → Amana
2AC/4AC/EL/XC/XP/ML → Ducane or Lennox (use Ducane if serial starts with letter+digits pattern)
ZE/ZF/ZJ/ZH/YHE/YCE → York
24ACC/24ANA/24SNB/FB4C/FV4C → Carrier
T4A/4TTB/4TTR/4TXB/TEM → Trane
RA/RASL/UAMB/RH1T → Rheem
CA4/CA5/N4A/N4H → Heil or Tempstar
WCA/WPH → Westinghouse or Nordyne
If model prefix not recognized, leave brand as empty string.

Example: {"brand":"Goodman","model":"GSX160361","serial":"1910123456"}`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text?.trim() ?? "";

    let parsed: ExtractedModel | null = null;
    try {
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { return null; }
      }
    }

    if (!parsed) return null;
    return {
      brand: parsed.brand || "",
      model: parsed.model || "",
      serial: parsed.serial || "",
      usage: data?.usage
        ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens }
        : undefined,
    };
  } catch {
    return null;
  }
}

export interface BraveResult {
  title: string;
  description: string;
  url: string;
}

export interface BraveLookupResult {
  specsContext: string;
  manualUrls: { type: string; url: string; title: string; source: 1 | 2 | 3 }[];
  noManualReason?: string;
}

function isDirectPdf(url: string): boolean {
  const u = url.toLowerCase();
  return u.endsWith(".pdf") || u.includes("/pdf/") || u.includes(".pdf?");
}

function classifyManualUrl(title: string, url: string): string | null {
  const t = (title + " " + url).toLowerCase();
  if (t.includes("wiring") || t.includes("schematic") || t.includes("diagram")) return "WIRING";
  if (t.includes("parts") || t.includes("catalog") || t.includes("exploded")) return "PARTS";
  if (
    t.includes("service") || t.includes("technical") || t.includes("repair") ||
    t.includes("troubleshoot") || t.includes("diagnostic") || t.includes("/sm/")
  ) return "SERVICE";
  if (
    t.includes("install") || t.includes("setup") || t.includes("iom") ||
    t.includes("owner") || t.includes("operation") || t.includes("/im/")
  ) return "INSTALL";
  if (t.includes(".pdf") || t.includes("/pdf/") || t.includes("manual") || t.includes("guide")) return "INSTALL";
  if (isDirectPdf(url)) return "INSTALL";
  return null;
}

async function braveSearch(query: string, key: string, count = 6): Promise<BraveResult[]> {
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": key,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.web?.results ?? [];
  } catch {
    return [];
  }
}

/** ManualsLib search URL — brand + exact model */
function manualsLibSearch(brand: string, model: string): string {
  const mlBrand = normalizeBrandForManualsLib(brand);
  const q = encodeURIComponent(`${mlBrand} ${model}`);
  return `https://www.manualslib.com/search/?q=${q}`;
}

export async function fetchBraveSpecs(
  brand: string,
  model: string,
  serial?: string
): Promise<BraveLookupResult | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key || !brand || !model) return null;

  // Pre-2005 equipment — manuals rarely digitized, skip lookup entirely
  if (serial) {
    const mfgYear = estimateYearFromSerial(brand, serial);
    if (mfgYear !== null && mfgYear < 2005) {
      return {
        specsContext: "",
        manualUrls: [],
        noManualReason: `This unit was manufactured in ${mfgYear}. Digital manuals for equipment from this era are rarely available online — documentation was not widely digitized before 2005. Check with your wholesaler or the manufacturer's technical support line for service literature.`,
      };
    }
  }

  const mfrDomain = getBrandDocDomain(brand);
  const baseModel = getBaseModel(model);

  // "Search model" — strip trailing revision/variant suffixes like -1A, -2B, _AA
  // so the Brave query uses e.g. GID91AU075D12B instead of the truncated GID91AU07
  const searchModel = model
    .replace(/[-_]\d{1,2}[A-Z]{1,2}$/i, "")  // strip trailing revision code (-1A, -2B, -AB)
    .replace(/[\s\-_]/g, "")                   // remove separators
    .toUpperCase();

  try {
    const mlBrand = normalizeBrandForManualsLib(brand);
    // Use full searchModel for ManualsLib query — baseModel is often too truncated
    // (e.g. GID91AU075D12B is indexed as-is; GID91AU07 returns wrong products)
    const [manualsLibResults, mfrResults, specResults] = await Promise.all([
      braveSearch(`site:manualslib.com ${mlBrand} ${searchModel}`, key, 6),
      mfrDomain
        ? braveSearch(`site:${mfrDomain} ${baseModel} filetype:pdf`, key, 8)
        : braveSearch(`${brand} ${baseModel} filetype:pdf service installation`, key, 6),
      braveSearch(`${brand} ${baseModel} specifications technical data voltage`, key, 5),
    ]);

    if (!manualsLibResults.length && !mfrResults.length && !specResults.length) return null;

    // ── Spec context for AI ────────────────────────────────────────
    const specSources = [...mfrResults.slice(0, 2), ...specResults.slice(0, 3)];
    const specLines = specSources
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description ?? ""}\n   ${r.url}`)
      .join("\n");
    const specsContext = specLines
      ? `WEB-VERIFIED SPECS — ${brand} ${model}:\n${specLines}\n\nCRITICAL: Use these web results as your PRIMARY source for this specific model. Your training data may have wrong specs for this exact unit. If inducer voltage, board type, capacitor setup, or any electrical spec is mentioned in these results — use that, not your default assumption. If a spec is NOT in these results and NOT visible in the photo — say "I need to verify that for this exact model" rather than guessing.`
      : "";

    // ── Build single INSTALL manual URL — ManualsLib direct match only ────────
    // If no exact match for this model, return noManualReason — never show a
    // wrong product's manual or a search URL that returns unrelated results.
    const manualUrls: BraveLookupResult["manualUrls"] = [];

    // Result is valid only if the model number appears in the title or URL
    const searchModelUpper = searchModel.toUpperCase();
    const baseModelUpper = baseModel.toUpperCase();
    function resultMatches(r: BraveResult): boolean {
      const text = (r.title + " " + r.url).toUpperCase();
      return text.includes(searchModelUpper) || text.includes(baseModelUpper);
    }

    const manualsLibPage =
      manualsLibResults.find((r) => r.url.includes("/products/") && resultMatches(r)) ||
      manualsLibResults.find((r) => r.url.includes("/manual/") && resultMatches(r)) ||
      manualsLibResults.find((r) => resultMatches(r));

    if (manualsLibPage) {
      manualUrls.push({ type: "INSTALL", url: manualsLibPage.url, title: manualsLibPage.title, source: 1 });
    } else {
      // No verified match — tell the tech rather than show a wrong manual
      return {
        specsContext,
        manualUrls: [],
        noManualReason: `No installation manual was found on ManualsLib for ${brand} ${model}. Try searching manualslib.com directly or contact the manufacturer's technical support for service literature.`,
      };
    }

    return { specsContext, manualUrls };
  } catch {
    return null;
  }
}
