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
  if (hasPhoto) return AI_MODELS.SONNET;
  if (turnCount <= 3) return AI_MODELS.HAIKU;
  if (requestType === "complex") return AI_MODELS.SONNET;
  return AI_MODELS.HAIKU;
}

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
  const dynamicContext = [
    sessionState?.equipment?.brand &&
      `Equipment: ${sanitizeForPrompt(sessionState.equipment.brand)} ${sanitizeForPrompt(sessionState.equipment.model)} (${sanitizeForPrompt(sessionState.equipment.type)})`,
    sessionState?.symptoms?.length &&
      `Reported symptoms: ${sanitizeForPrompt(sessionState.symptoms.join(", "))}`,
    sessionState?.ruled_out?.length &&
      `Ruled out: ${sanitizeForPrompt(sessionState.ruled_out.join(", "))}`,
    sessionState?.working_diagnosis &&
      `Working diagnosis: ${sanitizeForPrompt(sessionState.working_diagnosis)}`,
    sessionState?.photos_received?.length &&
      `Photos received: ${sessionState.photos_received.length}`,
  ]
    .filter(Boolean)
    .join("\n");

  /* ── Construct Anthropic API messages ── */
  const apiMessages = messages.map(
    (m: { role: string; content: string; image_url?: string; image_base64?: string; image_media_type?: string }) => {
      if (m.image_base64 && m.role === "user") {
        return {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: m.image_media_type || "image/jpeg",
                data: m.image_base64,
              },
            },
            {
              type: "text",
              text: m.content,
            },
          ],
        };
      }
      return { role: m.role, content: m.content };
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
    const lastImgMsg = [...messages].reverse().find(
      (m: { role: string; image_base64?: string }) => m.role === "user" && m.image_base64
    );
    if (lastImgMsg?.image_base64) {
      const extracted = await extractModelFromImage(
        lastImgMsg.image_base64,
        lastImgMsg.image_media_type || "image/jpeg",
        apiKey
      );
      if (extracted?.brand && extracted?.model) {
        // v5 suffix: busts cached results that included OEM PDFs; v5 = ManualsLib-only, no cache on source-3 fallback
        const cacheKey = `${extracted.brand}__${extracted.model}__v5`.toLowerCase().replace(/\s+/g, "_");

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
          console.log(`[WEB LOOKUP] Fetching: ${extracted.brand} ${extracted.model}`);
          const result = await fetchBraveSpecs(extracted.brand, extracted.model, extracted.serial);
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
      }
    }
  }

  /* ── System prompt with cache_control ── */
  const systemBlocks = [
    {
      type: "text",
      text: STATIC_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    ...(webSpecsContext ? [{ type: "text", text: webSpecsContext }] : []),
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
      // Inject manual URLs as machine-readable tag before Sonnet text
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
      let inputTokens = 0;
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

              /* Track usage */
              if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens ?? 0;
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
        /* Log usage to Supabase + console */
        if (inputTokens || outputTokens) {
          const costEstimate =
            model === AI_MODELS.SONNET
              ? inputTokens * 0.000003 + outputTokens * 0.000015
              : inputTokens * 0.0000008 + outputTokens * 0.000004;

          console.log(
            `[USAGE] model=${model} input=${inputTokens} output=${outputTokens} cost=$${costEstimate.toFixed(5)} type=${requestType}`
          );

          /* Fire-and-forget DB write */
          if (userId) {
            supabaseAdmin.from("api_usage").insert({
              user_id: userId,
              date: new Date().toISOString().split("T")[0],
              model_used: model,
              input_tokens: inputTokens,
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
