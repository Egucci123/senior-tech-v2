/**
 * Web-based model spec + manual lookup for Senior Tech.
 *
 * MANUAL LOOKUP STRATEGY (multi-layer, sequential fallback):
 *   1. Brave quoted search:  site:manualslib.com Brand "FullModel"
 *   2. Brave unquoted search: site:manualslib.com Brand FullModel (more results)
 *   3. Brave base-model search: site:manualslib.com Brand BaseModel
 *   4. Fallback: ManualsLib search URL — always valid, user finds it manually
 *
 * MODEL MATCHING:
 *   Normalize both sides (strip non-alphanumeric, lowercase) before comparing.
 *   Handles ManualsLib URL patterns like /Goodman-Gid91au075d12b-123456.html
 *   and titles like "Goodman GID91AU075D12B Installation Manual".
 *
 * SPEC CONTEXT:
 *   Parallel spec search feeds AI model-specific electrical/physical data.
 */

import { getBaseModel, estimateYearFromSerial } from "./model-utils";
import { getBrandDocDomain, normalizeBrandForManualsLib } from "./brand-domains";
import { AI_MODELS, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from "./ai-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedModel {
  brand: string;
  model: string;
  serial: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export interface BraveResult {
  title: string;
  description: string;
  url: string;
}

export interface ManualEntry {
  type: string;   // "INSTALL" | "SERVICE" | "WIRING" | "PARTS"
  url: string;
  title: string;
  source: 1 | 2 | 3;  // 1=ManualsLib direct, 2=OEM direct, 3=search fallback
}

export interface BraveLookupResult {
  specsContext: string;
  manualUrls: ManualEntry[];
  noManualReason?: string;
}

// ─── Image Model Extraction ───────────────────────────────────────────────────

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

Extract every character of the model number exactly as printed — do not truncate, abbreviate, or paraphrase.
Preserve all dashes, letters, and numbers as shown on the data plate.

If brand is NOT printed on the plate, infer from the model prefix:
GSX/GSXC/GSXN/DSXC/AVXC/GMV/GMP/GPH/GPC/GID/GMVC/GMSS → Goodman
SSX/ASX/AWX/AVPTC/ARUF/AMVC/AMSS → Amana
2AC/4AC/EL/XC/XP/ML/SL/ELO → Lennox (unless serial starts with letter+digit → Ducane)
ZE/ZF/ZJ/ZH/YHE/YCE → York
24ACC/24ANA/24SNB/FB4C/FV4C/58STA/58MVA → Carrier
T4A/4TTB/4TTR/4TXB/TEM/XR/XL/TVA/TUE → Trane
RA/RASL/UAMB/RH1T/RPNE → Rheem
CA4/CA5/N4A/N4H/TCP → Heil or Tempstar
WCA/WPH/MV/MG → Nordyne/Westinghouse
If unrecognized, leave brand as empty string.

Example: {"brand":"Goodman","model":"GID91AU075D12B-1A","serial":"1910123456"}`,
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

// ─── Brave Search ─────────────────────────────────────────────────────────────

async function braveSearch(query: string, key: string, count = 8): Promise<BraveResult[]> {
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

// ─── Model Variant Computation ────────────────────────────────────────────────

/**
 * Compute all model variants to try, in priority order:
 *   1. Full model with revision stripped (GID91AU075D12B from GID91AU075D12B-1A)
 *   2. Full model as-given (GID91AU075D12B-1A)
 *   3. Base model (GID91AU075, GSX160601, etc.)
 * Deduped so we never run the same string twice.
 */
function getModelVariants(model: string): string[] {
  const stripped = model
    .replace(/[-_]\d{1,2}[A-Z]{1,2}$/i, "")   // strip -1A, -2B, -AB
    .replace(/[-_][A-Z]{1,2}\d{1,2}$/i, "")    // strip -A1, -B2
    .replace(/[\s\-_]/g, "")
    .toUpperCase();

  const full = model.replace(/[\s\-_]/g, "").toUpperCase();
  const base = getBaseModel(model).replace(/[^A-Z0-9]/g, "").toUpperCase();

  return [...new Set([stripped, full, base].filter((v) => v.length >= 5))];
}

// ─── Result Matching ──────────────────────────────────────────────────────────

/**
 * Strip everything except alphanumeric, lowercase.
 * Lets us match "GID91AU075D12B" against URL segment "Gid91au075d12b"
 * and against titles with spaces like "GID91 AU075D 12B".
 */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Returns true if the result's title+URL contains any of the model variants.
 * Uses normalized comparison so separators/case differences don't break matching.
 * Requires variant to be >= 6 chars to avoid false positives on short strings.
 */
function resultMatchesAnyVariant(r: BraveResult, variants: string[]): boolean {
  const normText = norm(r.title + " " + r.url);
  return variants.some((v) => {
    const nv = norm(v);
    return nv.length >= 6 && normText.includes(nv);
  });
}

function isManualsLibUrl(url: string): boolean {
  return url.toLowerCase().includes("manualslib.com");
}

/**
 * Score a ManualsLib result for ranking:
 *   /products/ page = 3 (product listing with all manuals)
 *   /manual/   page = 2 (individual manual)
 *   /brand/    page = 1 (brand listing — less specific)
 *   anything else  = 0
 */
function scoreManualsLibUrl(url: string): number {
  const u = url.toLowerCase();
  if (u.includes("/products/")) return 3;
  if (u.includes("/manual/"))   return 2;
  if (u.includes("/brand/"))    return 1;
  return 0;
}

/**
 * Find the best ManualsLib result from a set of Brave results.
 * Prefers /products/ pages; falls back to /manual/ pages; ignores non-ML results.
 */
function findBestManualsLibMatch(
  results: BraveResult[],
  variants: string[]
): BraveResult | null {
  const mlResults = results.filter((r) => isManualsLibUrl(r.url));
  const matching = mlResults.filter((r) => resultMatchesAnyVariant(r, variants));

  if (matching.length === 0) return null;

  // Sort by URL quality score descending
  matching.sort((a, b) => scoreManualsLibUrl(b.url) - scoreManualsLibUrl(a.url));
  return matching[0];
}

// ─── Manual Type Classification ───────────────────────────────────────────────

function classifyManualType(title: string, url: string): string {
  const t = (title + " " + url).toLowerCase();
  if (t.includes("wiring") || t.includes("schematic") || t.includes("diagram")) return "WIRING";
  if (t.includes("parts") || t.includes("catalog") || t.includes("exploded"))    return "PARTS";
  if (
    t.includes("service") || t.includes("technical") || t.includes("repair") ||
    t.includes("troubleshoot") || t.includes("sm/") || t.includes("/sm-")
  ) return "SERVICE";
  return "INSTALL";
}

// ─── ManualsLib Fallback Search URL ───────────────────────────────────────────

function manualsLibSearchUrl(brand: string, variants: string[]): string {
  const mlBrand = normalizeBrandForManualsLib(brand);
  // Use the first (most specific) variant for the search
  const q = encodeURIComponent(`${mlBrand} ${variants[0] ?? ""}`);
  return `https://www.manualslib.com/search/?q=${q}`;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function fetchBraveSpecs(
  brand: string,
  model: string,
  serial?: string
): Promise<BraveLookupResult | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key || !brand || !model) return null;

  // Pre-2005: manuals rarely digitized — skip lookup, tell the tech
  if (serial) {
    const mfgYear = estimateYearFromSerial(brand, serial);
    if (mfgYear !== null && mfgYear < 2005) {
      return {
        specsContext: "",
        manualUrls: [],
        noManualReason:
          `This unit was manufactured in ${mfgYear}. Digital manuals for equipment this old are rarely available online. ` +
          `Check with your wholesaler or call the manufacturer's tech support line for service literature.`,
      };
    }
  }

  const mlBrand    = normalizeBrandForManualsLib(brand);
  const mfrDomain  = getBrandDocDomain(brand);
  const baseModel  = getBaseModel(model);
  const variants   = getModelVariants(model);
  const primaryVar = variants[0]; // Most specific: stripped revision code

  // ── Stage 1: Parallel — quoted ManualsLib + spec search ──────────────────
  const [quotedResults, specResults] = await Promise.all([
    // Quoted model in search = Brave must contain exact string
    braveSearch(`site:manualslib.com ${mlBrand} "${primaryVar}"`, key, 10),
    // Spec context: OEM domain first, generic fallback
    mfrDomain
      ? braveSearch(`site:${mfrDomain} ${baseModel} specifications`, key, 5)
      : braveSearch(`${brand} ${baseModel} specifications technical data`, key, 5),
  ]);

  let manualsLibMatch = findBestManualsLibMatch(quotedResults, variants);

  // ── Stage 2: Unquoted search — more results, less strict Brave query ──────
  if (!manualsLibMatch) {
    const unquotedResults = await braveSearch(
      `site:manualslib.com ${mlBrand} ${primaryVar}`,
      key, 10
    );
    manualsLibMatch = findBestManualsLibMatch(unquotedResults, variants);
  }

  // ── Stage 3: Try all remaining variants individually ─────────────────────
  if (!manualsLibMatch) {
    for (const variant of variants.slice(1)) {
      if (norm(variant) === norm(primaryVar)) continue; // skip if same as Stage 1
      const vResults = await braveSearch(
        `site:manualslib.com ${mlBrand} "${variant}"`,
        key, 10
      );
      manualsLibMatch = findBestManualsLibMatch(vResults, variants);
      if (manualsLibMatch) break;

      // Unquoted fallback for this variant
      const vUnquoted = await braveSearch(
        `site:manualslib.com ${mlBrand} ${variant}`,
        key, 10
      );
      manualsLibMatch = findBestManualsLibMatch(vUnquoted, variants);
      if (manualsLibMatch) break;
    }
  }

  // ── Build spec context for AI ─────────────────────────────────────────────
  const specLines = specResults
    .slice(0, 3)
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description ?? ""}\n   ${r.url}`)
    .join("\n");
  const specsContext = specLines
    ? `WEB-VERIFIED SPECS — ${brand} ${model}:\n${specLines}\n\n` +
      `CRITICAL: Use these web results as your PRIMARY source for this specific model. ` +
      `Your training data may have incorrect specs for this exact unit. ` +
      `If inducer voltage, board part number, capacitor size, or any electrical spec is in these results — use it. ` +
      `If a spec is NOT here and NOT on the data plate — say "I need to verify that" rather than guessing.`
    : "";

  // ── Build manual URLs ─────────────────────────────────────────────────────
  const manualUrls: ManualEntry[] = [];

  if (manualsLibMatch) {
    const manualType = classifyManualType(manualsLibMatch.title, manualsLibMatch.url);
    manualUrls.push({
      type: manualType,
      url: manualsLibMatch.url,
      title: manualsLibMatch.title,
      source: 1,
    });

    // If we landed on a /products/ page, check if the quotedResults also has
    // a /manual/ or wiring/service variant for the same model — add those too
    if (manualsLibMatch.url.toLowerCase().includes("/products/")) {
      const extras = quotedResults.filter(
        (r) =>
          r.url !== manualsLibMatch!.url &&
          isManualsLibUrl(r.url) &&
          resultMatchesAnyVariant(r, variants) &&
          r.url.toLowerCase().includes("/manual/")
      );
      for (const extra of extras.slice(0, 2)) {
        const t = classifyManualType(extra.title, extra.url);
        if (!manualUrls.some((m) => m.type === t)) {
          manualUrls.push({ type: t, url: extra.url, title: extra.title, source: 1 });
        }
      }
    }

    return { specsContext, manualUrls };
  }

  // ── No verified match found ───────────────────────────────────────────────
  // Return a search URL fallback so the tech can find it manually
  // (much better than returning nothing or a wrong manual)
  const fallbackUrl = manualsLibSearchUrl(brand, variants);
  return {
    specsContext,
    manualUrls: [
      {
        type: "INSTALL",
        url: fallbackUrl,
        title: `${brand} ${model} — ManualsLib Search`,
        source: 3,
      },
    ],
    noManualReason:
      `Could not auto-locate the installation manual for ${brand} ${model} on ManualsLib. ` +
      `A search link has been added to your Manuals tab — tap it to search manually. ` +
      `If nothing comes up, try removing the last few characters of the model number.`,
  };
}
