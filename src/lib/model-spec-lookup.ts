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

export async function fetchBraveSpecs(
  brand: string,
  model: string
): Promise<string | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key || !brand || !model) return null;

  try {
    const query = encodeURIComponent(
      `${brand} ${model} specifications installation service manual`
    );
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${query}&count=4`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": key,
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const results: { title: string; description: string; url: string }[] =
      data?.web?.results ?? [];

    if (!results.length) return null;

    const lines = results
      .slice(0, 4)
      .map(
        (r, i) =>
          `${i + 1}. ${r.title}\n   ${r.description ?? ""}\n   ${r.url}`
      )
      .join("\n");

    return `WEB-VERIFIED SPECS — ${brand} ${model}:\n${lines}\n\nUse the above to fill in any details not visible in the photo. Prioritize manufacturer data over training data for this specific model.`;
  } catch {
    return null;
  }
}
