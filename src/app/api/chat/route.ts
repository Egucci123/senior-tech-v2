import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractModelFromImage, fetchBraveSpecs } from "@/lib/model-spec-lookup";
import { AI_MODELS, MAX_TOKENS, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from "@/lib/ai-config";

/* ── Server-side Supabase admin client — uses service role key to bypass RLS ── */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/* ── Static cached system prompt block (Senior Tech persona) ── */
import { STATIC_SYSTEM_PROMPT, getDynamicSystemPrompt } from "@/lib/system-prompt";

/* ── Security headers applied to all responses ── */
const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/* ── Sanitize user-supplied strings before injecting into system prompt ── */
function sanitizeForPrompt(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 500);
}

/* ── Build model selection ── */
function selectModel(
  requestType: string,
  hasPhoto: boolean,
  turnCount: number
): string {
  // Haiku 4.5 is multimodal — reads data plates, gauges, and wiring diagrams.
  // extractModelFromImage already uses Haiku for OCR; the main response is structured
  // rule-following that Haiku handles equally well at 4.7x lower cache-write cost.
  void requestType; void hasPhoto; void turnCount;
  return AI_MODELS.HAIKU;
}

/* ── Server-side message window — trim history to last N messages ──────────────
 * Client sends up to 40 messages. Beyond 8 pairs (16 messages), older turns add
 * uncached input cost with diminishing diagnostic value. sessionState dynamicContext
 * carries equipment, symptoms, ruled_out, and working_diagnosis forward so the AI
 * never loses the key facts — only the verbatim exchange is trimmed.
 */
const MESSAGE_WINDOW = 16; // 8 back-and-forth pairs

/* ── Extend function timeout for photo analysis (requires Vercel Pro) ── */
export const maxDuration = 60;

/* ── POST handler ── */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...securityHeaders } }
    );
  }

  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!braveKey) {
    console.warn("[api/chat] BRAVE_SEARCH_API_KEY not configured — web specs disabled");
  }

  const body = await request.json();
  const {
    messages,
    sessionState,
    hasPhoto,
    turnCount,
    requestType,
    userId,
  } = body;

  /* ── Daily message cap check (75 soft cap) ── */
  if (userId) {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabaseAdmin
      .from("api_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", today);

    if (count && count >= 75) {
      return new Response(
        JSON.stringify({ error: "daily_limit", message: "You've reached today's limit — resets at midnight." }),
        { status: 429, headers: { "Content-Type": "application/json", ...securityHeaders } }
      );
    }
  }

  const model = selectModel(requestType, hasPhoto, turnCount);
  const maxTokens = MAX_TOKENS[requestType as keyof typeof MAX_TOKENS] ?? 500;

  /* ── Build dynamic system block — sanitize all sessionState fields ── */
  const readings = sessionState?.readings;
  const populatedReadings = readings
    ? Object.entries(readings as Record<string, string>)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `${k.replace(/_/g, " ")}=${v}`)
        .join(", ")
    : "";

  const dynamicContext = [
    sessionState?.equipment?.brand &&
      `Equipment: ${sanitizeForPrompt(sessionState.equipment.brand)} ${sanitizeForPrompt(sessionState.equipment.model)} (${sanitizeForPrompt(sessionState.equipment.type)})`,
    sessionState?.symptoms?.length &&
      `Reported symptoms: ${sanitizeForPrompt(sessionState.symptoms.join(", "))}`,
    sessionState?.ruled_out?.length &&
      `Ruled out: ${sanitizeForPrompt(sessionState.ruled_out.join(", "))}`,
    sessionState?.working_diagnosis &&
      `Working diagnosis: ${sanitizeForPrompt(sessionState.working_diagnosis)}`,
    populatedReadings &&
      `Gauge readings: ${sanitizeForPrompt(populatedReadings)}`,
    sessionState?.photos_received?.length &&
      `Photos received: ${sessionState.photos_received.length}`,
  ]
    .filter(Boolean)
    .join("\n");

  /* ── Trim message history to MESSAGE_WINDOW to cap uncached input cost ──
   * Old turns are expensive (uncached $0.80/MTok Haiku) and low-value past ~8 pairs.
   * sessionState carries equipment/symptoms/readings context forward.
   */
  const trimmedMessages = (messages as unknown[]).slice(-MESSAGE_WINDOW);

  /* ── Construct Anthropic API messages ── */
  const apiMessages = trimmedMessages.map(
    (m: unknown) => {
      const msg = m as { role: string; content: string; image_url?: string; image_base64?: string; image_media_type?: string };
      if (msg.image_base64 && msg.role === "user") {
        return {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: msg.image_media_type || "image/jpeg",
                data: msg.image_base64,
              },
            },
            {
              type: "text",
              text: msg.content,
            },
          ],
        };
      }
      return { role: msg.role, content: msg.content };
    }
  );

  /* ── Build user context from cookies/headers or session ── */
  const firstName = body.firstName || "Tech";
  const experienceLevel = body.experienceLevel || "mid";

  /* ── Web spec + manual lookup for photo requests ── */
  let webSpecsContext: string | null = null;
  let webManualUrls: { type: string; url: string; title: string }[] = [];
  let noManualReason: string | null = null;

  if (hasPhoto && braveKey) {
    // Hard 3-second deadline — keeps p95 latency tight; cache hits return in <200ms,
    // Brave searches usually complete in 1-2s. 3s catches nearly all; timeouts degrade
    // gracefully (AI responds from image alone, no spec context injected).
    const specLookup = async () => {
      /* ── Skip extractModelFromImage if equipment is already identified ──────────
       * If a tech sends a second photo (gauge, wiring diagram) after the data plate
       * was already read, we know brand+model from sessionState — no need to re-run
       * a Haiku API call just to extract the same model number again.
       */
      const knownBrand = sessionState?.equipment?.brand as string | undefined;
      const knownModel = sessionState?.equipment?.model as string | undefined;

      let lookupBrand: string;
      let lookupModel: string;
      let lookupSerial: string | undefined;

      if (knownBrand && knownModel) {
        // Equipment already identified — skip Haiku extraction entirely
        lookupBrand = knownBrand;
        lookupModel = knownModel;
        lookupSerial = sessionState?.equipment?.serial_number || undefined;
        console.log(`[WEB LOOKUP] Using known equipment: ${lookupBrand} ${lookupModel}`);
      } else {
        // Need to extract from the image
        const lastImgMsg = (trimmedMessages as { role: string; image_base64?: string; image_media_type?: string }[])
          .slice()
          .reverse()
          .find((m) => m.role === "user" && m.image_base64);
        if (!lastImgMsg?.image_base64) return;

        const extracted = await extractModelFromImage(
          lastImgMsg.image_base64,
          lastImgMsg.image_media_type || "image/jpeg",
          apiKey
        );
        if (!extracted?.brand || !extracted?.model) return;
        lookupBrand = extracted.brand;
        lookupModel = extracted.model;
        lookupSerial = extracted.serial;
      }

      // v5 suffix: busts cached results that included OEM PDFs; v5 = ManualsLib-only, no cache on source-3 fallback
      const cacheKey = `${lookupBrand}__${lookupModel}__v5`.toLowerCase().replace(/\s+/g, "_");

      // 7-day TTL: ignore stale cache entries
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Check Supabase cache first — avoid paying for repeat searches
      const { data: cached } = await supabaseAdmin
        .from("manual_searches")
        .select("manual_urls")
        .eq("model_number", cacheKey)
        .eq("brand", "__system_cache__")
        .gt("search_date", sevenDaysAgo)
        .maybeSingle();

      if (cached?.manual_urls) {
        console.log(`[WEB LOOKUP] Cache hit: ${cacheKey}`);
        const parsed = cached.manual_urls as { specsContext: string; manualUrls: { type: string; url: string; title: string; source?: number }[] };
        webSpecsContext = parsed.specsContext;
        webManualUrls = parsed.manualUrls;
      } else {
        console.log(`[WEB LOOKUP] Fetching: ${lookupBrand} ${lookupModel}`);
        const result = await fetchBraveSpecs(lookupBrand, lookupModel, lookupSerial);
        if (result) {
          webSpecsContext = result.specsContext;
          webManualUrls = result.manualUrls;
          if (result.noManualReason) noManualReason = result.noManualReason;
          // Only cache when we found an actual ManualsLib product page (source 1)
          // Don't cache source-3 search fallbacks — they add a card but open a dead search
          const hasRealManual = result.manualUrls.some((m) => (m as { source?: number }).source === 1);
          if (hasRealManual) {
            supabaseAdmin.from("manual_searches").insert({
              user_id: userId || "00000000-0000-0000-0000-000000000000",
              model_number: cacheKey,
              brand: "__system_cache__",
              search_date: new Date().toISOString(),
              manual_urls: { specsContext: result.specsContext, manualUrls: result.manualUrls },
            }).then(() => {}, () => {});
          }
        }
      }
    };

    const timeout = new Promise<void>((resolve) =>
      setTimeout(() => {
        console.warn("[api/chat] Spec lookup timed out (3s) — proceeding without pre-fetched specs");
        resolve();
      }, 3000)
    );

    await Promise.race([specLookup(), timeout]);
  }

  /* ── System prompt with cache_control ─────────────────────────────────────────
   * Two cache breakpoints:
   *   1. STATIC_SYSTEM_PROMPT  — never changes, cheapest to cache (~21k tokens)
   *   2. webSpecsContext       — per-model specs, stable within a session once fetched
   * The dynamic block (name + experience + session context) changes every turn,
   * so it intentionally has NO cache_control — caching a moving block wastes a write.
   */
  const systemBlocks = [
    {
      type: "text",
      text: STATIC_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    ...(webSpecsContext
      ? [{
          type: "text",
          text: webSpecsContext,
          cache_control: { type: "ephemeral" },  // cache specs — stable for this session
        }]
      : []),
    {
      type: "text",
      text: getDynamicSystemPrompt(firstName, experienceLevel) +
        (dynamicContext ? `\n\nCURRENT SESSION CONTEXT:\n${dynamicContext}` : ""),
    },
  ];

  /* ── Call Anthropic API with streaming ── */
  const anthropicBody = {
    model,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: apiMessages,
    stream: true,
  };

  const anthropicRes = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify(anthropicBody),
  });

  if (!anthropicRes.ok) {
    const errorText = await anthropicRes.text();
    console.error("Anthropic API error:", anthropicRes.status, errorText);
    const clientStatus = anthropicRes.status === 529 ? 503 : anthropicRes.status;
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable. Please try again." }),
      { status: clientStatus, headers: { "Content-Type": "application/json", ...securityHeaders } }
    );
  }

  /* ── Stream SSE back to client as plain text chunks ── */
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Inject manual URLs as machine-readable tag before Haiku text
      if (webManualUrls.length > 0) {
        controller.enqueue(
          encoder.encode(`<!-- BRAVE_MANUALS:${JSON.stringify(webManualUrls)} -->\n`)
        );
      }
      // Inject no-manual reason for pre-2005 equipment
      if (noManualReason) {
        controller.enqueue(
          encoder.encode(`<!-- NO_MANUAL_REASON:${noManualReason} -->\n`)
        );
      }

      const reader = anthropicRes.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      /* ── Token tracking — three separate buckets from Anthropic ──────────────
       * input_tokens        = uncached input   — charged at full rate ($0.80/MTok Haiku)
       * cache_creation_tokens = cache write    — charged at 1.25x  ($1.00/MTok Haiku)
       * cache_read_tokens   = cache hit        — charged at 0.1x   ($0.08/MTok Haiku)
       * Logging total = sum of all three for DB; cost uses real rates for each bucket.
       */
      let regularInputTokens = 0;
      let cacheWriteTokens = 0;
      let cacheReadTokens = 0;
      let outputTokens = 0;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }

              /* Capture all three token buckets from message_start */
              if (event.type === "message_start" && event.message?.usage) {
                const u = event.message.usage;
                regularInputTokens  = u.input_tokens                  ?? 0;
                cacheWriteTokens    = u.cache_creation_input_tokens    ?? 0;
                cacheReadTokens     = u.cache_read_input_tokens        ?? 0;
              }
              if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens ?? 0;
              }
            } catch {
              /* Skip non-JSON lines */
            }
          }
        }
      } catch (err) {
        console.error("Stream processing error:", err);
      } finally {
        /* Log usage to Supabase + console — use real rates for each token bucket */
        const totalInputTokens = regularInputTokens + cacheWriteTokens + cacheReadTokens;
        if (totalInputTokens || outputTokens) {
          // Haiku 4.5 rates: input $0.80, cache write $1.00, cache read $0.08, output $4.00 (per MTok)
          // Sonnet 4.5 rates: input $3.00, cache write $3.75, cache read $0.30, output $15.00 (per MTok)
          const isSonnet = model === AI_MODELS.SONNET;
          const costEstimate = isSonnet
            ? regularInputTokens * 0.000003    + cacheWriteTokens * 0.00000375  + cacheReadTokens * 0.0000003   + outputTokens * 0.000015
            : regularInputTokens * 0.0000008   + cacheWriteTokens * 0.000001    + cacheReadTokens * 0.00000008  + outputTokens * 0.000004;

          console.log(
            `[USAGE] model=${model} in=${regularInputTokens} cacheWrite=${cacheWriteTokens} cacheRead=${cacheReadTokens} out=${outputTokens} cost=$${costEstimate.toFixed(5)} type=${requestType} historyMsgs=${trimmedMessages.length}`
          );

          /* Fire-and-forget DB write */
          if (userId) {
            supabaseAdmin.from("api_usage").insert({
              user_id: userId,
              date: new Date().toISOString().split("T")[0],
              model_used: model,
              input_tokens: totalInputTokens,
              output_tokens: outputTokens,
              estimated_cost: costEstimate,
              request_type: requestType,
            }).then(({ error: dbErr }) => {
              if (dbErr) console.error("[USAGE DB] insert error:", dbErr.message);
            });
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      ...securityHeaders,
    },
  });
}
