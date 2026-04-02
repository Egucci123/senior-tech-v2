/**
 * Web-based model spec lookup for Senior Tech.
 * Step 1: Haiku extracts brand/model from image (cheap, fast)
 * Step 2: Brave Search fetches real manufacturer specs
 * Both fail gracefully — app works without them.
 */

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

    // Try direct parse
    let parsed: ExtractedModel | null = null;
    try {
      // Strip markdown fences if present
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      // Try extracting JSON object from any surrounding text
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          return null;
        }
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
  manualUrls: { type: string; url: string; title: string }[];
}

function classifyManualUrl(title: string, url: string): string | null {
  const t = (title + " " + url).toLowerCase();
  if (t.includes("install") || t.includes("setup") || t.includes("/iom/")) return "INSTALL";
  if (t.includes("service") || t.includes("technical") || t.includes("repair") || t.includes("/technical/") || t.includes("/lit/")) return "SERVICE";
  if (t.includes("wiring") || t.includes("schematic") || t.includes("diagram")) return "WIRING";
  if (t.includes("parts") || t.includes("catalog") || t.includes("iom")) return "PARTS";
  if (t.includes(".pdf") || t.includes("/pdf/") || t.includes("manual") || t.includes("guide")) return "INSTALL";
  return null;
}

/** Returns true if the URL is likely a direct PDF link */
function isDirectPdf(url: string): boolean {
  const u = url.toLowerCase();
  return u.endsWith(".pdf") || u.includes("/pdf/") || u.includes(".pdf?");
}

async function braveSearch(query: string, key: string, count = 6): Promise<BraveResult[]> {
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
}

export async function fetchBraveSpecs(
  brand: string,
  model: string
): Promise<BraveLookupResult | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key || !brand || !model) return null;

  try {
    // Three parallel searches: specs, manual pages, and direct PDF files
    const [specResults, manualResults, pdfResults] = await Promise.all([
      braveSearch(`${brand} ${model} inducer motor voltage specifications technical data service`, key, 6),
      braveSearch(`${brand} ${model} installation service manual filetype:pdf`, key, 6),
      braveSearch(`${brand} ${model} filetype:pdf`, key, 8),
    ]);

    if (!specResults.length && !manualResults.length && !pdfResults.length) return null;

    // Build spec context for Sonnet
    const specLines = specResults
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description ?? ""}\n   ${r.url}`)
      .join("\n");

    const specsContext = specLines
      ? `WEB-VERIFIED SPECS — ${brand} ${model}:\n${specLines}\n\nCRITICAL: Use these web results as your PRIMARY source for this specific model. Your training data may have wrong specs for this exact unit. If inducer voltage, board type, capacitor setup, or any electrical spec is mentioned in these results — use that, not your default assumption. If a spec is NOT in these results and NOT visible in the photo — say "I need to verify that for this exact model" rather than guessing.`
      : "";

    // Merge manual results: prefer direct PDFs first, then general manual pages
    // Direct PDFs from the pdf search are highest priority
    const directPdfs = pdfResults.filter((r) => isDirectPdf(r.url));
    const allManualCandidates = [...directPdfs, ...manualResults, ...pdfResults];

    const seen = new Set<string>();
    const manualUrls: { type: string; url: string; title: string }[] = [];

    for (const r of allManualCandidates) {
      const type = classifyManualUrl(r.title, r.url);
      if (type && !seen.has(type)) {
        seen.add(type);
        manualUrls.push({ type, url: r.url, title: r.title });
      }
    }

    // Fill any missing types — prefer a search-results page URL as fallback over nothing
    const allTypes = ["INSTALL", "SERVICE", "WIRING", "PARTS"];
    const gq = encodeURIComponent(`${brand} ${model}`);
    for (const type of allTypes) {
      if (!seen.has(type)) {
        // Use Brave search results page as fallback (better than a blind Google query)
        const suffix = type === "INSTALL" ? "installation+manual+filetype:pdf"
          : type === "SERVICE" ? "service+manual+filetype:pdf"
          : type === "WIRING" ? "wiring+diagram+filetype:pdf"
          : "parts+catalog+filetype:pdf";
        manualUrls.push({
          type,
          url: `https://search.brave.com/search?q=${gq}+${suffix}`,
          title: `${brand} ${model} ${type.toLowerCase()} manual`,
        });
      }
    }

    return { specsContext, manualUrls };
  } catch {
    return null;
  }
}
