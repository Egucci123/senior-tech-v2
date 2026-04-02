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

import { getBaseModel } from "./model-utils";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL_HAIKU = "claude-haiku-4-5";

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
        model: MODEL_HAIKU,
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
                text: 'Return ONLY a JSON object — no markdown, no explanation. Keys: brand, model, serial. Example: {"brand":"York","model":"ZE060","serial":"N1F8123456"}. Extract from the HVAC data plate. Empty string for any field not visible.',
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
}

/* ── Manufacturer documentation domains ── */
const BRAND_DOC_DOMAINS: Record<string, string> = {
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

function getBrandDocDomain(brand: string): string | null {
  const lower = brand.toLowerCase().trim();
  for (const [key, domain] of Object.entries(BRAND_DOC_DOMAINS)) {
    if (lower.includes(key) || key.includes(lower)) return domain;
  }
  return null;
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

/** ManualsLib search URL using BASE model — always a live link */
function manualsLibSearch(brand: string, baseModel: string, type: string): string {
  const suffixMap: Record<string, string> = {
    INSTALL: "installation manual",
    SERVICE: "service manual",
    WIRING: "wiring diagram",
    PARTS: "parts catalog",
  };
  const q = encodeURIComponent(`${brand} ${baseModel} ${suffixMap[type] ?? "manual"}`);
  return `https://www.manualslib.com/search/?q=${q}`;
}

export async function fetchBraveSpecs(
  brand: string,
  model: string
): Promise<BraveLookupResult | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key || !brand || !model) return null;

  const mfrDomain = getBrandDocDomain(brand);
  // Use base model for all searches — full config strings like ZE060H12A2A1ABA1A2
  // return zero results on ManualsLib and manufacturer portals
  const baseModel = getBaseModel(model);

  try {
    // Three parallel searches using base model:
    // A — ManualsLib: most reliable, indexed by base model
    // B — Manufacturer domain PDFs: direct OEM files
    // C — Spec data: feeds AI context only
    const [manualsLibResults, mfrResults, specResults] = await Promise.all([
      braveSearch(`site:manualslib.com ${brand} ${baseModel}`, key, 6),
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

    // ── Build single INSTALL manual URL ──────────────────────────
    const manualUrls: BraveLookupResult["manualUrls"] = [];

    // SOURCE 1 — Direct OEM PDF if Brave found one classified as INSTALL
    const directPdfs = mfrResults.filter((r) => isDirectPdf(r.url));
    const installPdf = directPdfs.find((r) => classifyManualUrl(r.title, r.url) === "INSTALL")
      ?? directPdfs[0];

    if (installPdf) {
      manualUrls.push({ type: "INSTALL", url: installPdf.url, title: installPdf.title, source: 2 });
    } else {
      // SOURCE 2 — ManualsLib product page
      const manualsLibPage =
        manualsLibResults.find((r) => r.url.includes("/products/")) ||
        manualsLibResults.find((r) => r.url.includes("/manual/")) ||
        manualsLibResults[0];

      if (manualsLibPage) {
        manualUrls.push({ type: "INSTALL", url: manualsLibPage.url, title: manualsLibPage.title, source: 1 });
      } else {
        // SOURCE 3 — ManualsLib search URL (guaranteed live link)
        manualUrls.push({
          type: "INSTALL",
          url: manualsLibSearch(brand, baseModel, "INSTALL"),
          title: `Search ManualsLib: ${brand} ${baseModel}`,
          source: 3,
        });
      }
    }

    return { specsContext, manualUrls };
  } catch {
    return null;
  }
}
