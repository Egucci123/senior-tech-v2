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
  if (t.includes("install") || t.includes("setup")) return "INSTALL";
  if (t.includes("service") || t.includes("technical") || t.includes("repair")) return "SERVICE";
  if (t.includes("wiring") || t.includes("schematic") || t.includes("diagram")) return "WIRING";
  if (t.includes("parts") || t.includes("catalog") || t.includes("iom")) return "PARTS";
  if (t.includes(".pdf") || t.includes("manual") || t.includes("guide")) return "INSTALL";
  return null;
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
    // Single search covers both specs and manuals
    const [specResults, manualResults] = await Promise.all([
      braveSearch(`${brand} ${model} inducer motor voltage specifications technical data service`, key, 6),
      braveSearch(`${brand} ${model} installation service manual filetype:pdf`, key, 6),
    ]);

    if (!specResults.length && !manualResults.length) return null;

    // Build spec context for Sonnet
    const specLines = specResults
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description ?? ""}\n   ${r.url}`)
      .join("\n");

    const specsContext = specLines
      ? `WEB-VERIFIED SPECS — ${brand} ${model}:\n${specLines}\n\nCRITICAL: Use these web results as your PRIMARY source for this specific model. Your training data may have wrong specs for this exact unit. If inducer voltage, board type, capacitor setup, or any electrical spec is mentioned in these results — use that, not your default assumption. If a spec is NOT in these results and NOT visible in the photo — say "I need to verify that for this exact model" rather than guessing.`
      : "";

    // Extract real PDF URLs for Manuals tab
    const seen = new Set<string>();
    const manualUrls: { type: string; url: string; title: string }[] = [];

    for (const r of manualResults) {
      const type = classifyManualUrl(r.title, r.url);
      if (type && !seen.has(type)) {
        seen.add(type);
        manualUrls.push({ type, url: r.url, title: r.title });
      }
    }

    // Fill any missing types with Google fallback
    const allTypes = ["INSTALL", "SERVICE", "WIRING", "PARTS"];
    const gq = encodeURIComponent(`${brand} ${model}`);
    for (const type of allTypes) {
      if (!seen.has(type)) {
        const suffix = type === "INSTALL" ? "installation+manual"
          : type === "SERVICE" ? "service+manual"
          : type === "WIRING" ? "wiring+diagram"
          : "parts+catalog";
        manualUrls.push({
          type,
          url: `https://www.google.com/search?q=${gq}+${suffix}+filetype:pdf`,
          title: `${brand} ${model} ${type.toLowerCase()} manual`,
        });
      }
    }

    return { specsContext, manualUrls };
  } catch {
    return null;
  }
}
