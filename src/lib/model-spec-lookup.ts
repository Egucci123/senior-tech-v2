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
    const mlBrand = normalizeBrandForManualsLib(brand);
    const [manualsLibResults, mfrResults, specResults] = await Promise.all([
      braveSearch(`site:manualslib.com ${mlBrand} ${baseModel}`, key, 6),
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

    // ── Build single INSTALL manual URL — ManualsLib only ────────
    // OEM PDFs removed: manufacturer portals return parts lists, not install manuals
    const manualUrls: BraveLookupResult["manualUrls"] = [];

    // SOURCE 1 — ManualsLib product page (Brave found a direct page for this model)
    const manualsLibPage =
      manualsLibResults.find((r) => r.url.includes("/products/")) ||
      manualsLibResults.find((r) => r.url.includes("/manual/")) ||
      manualsLibResults[0];

    if (manualsLibPage) {
      manualUrls.push({ type: "INSTALL", url: manualsLibPage.url, title: manualsLibPage.title, source: 1 });
    } else {
      // SOURCE 3 — ManualsLib search URL (guaranteed live link, always works)
      manualUrls.push({
        type: "INSTALL",
        url: manualsLibSearch(brand, model),
        title: `Search ManualsLib: ${mlBrand} ${model}`,
        source: 3,
      });
    }

    return { specsContext, manualUrls };
  } catch {
    return null;
  }
}
