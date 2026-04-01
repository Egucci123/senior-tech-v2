import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ── Server-side Supabase client for usage tracking ── */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/* ── Constants ── */
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const MODEL_SONNET = "claude-sonnet-4-5";
const MODEL_HAIKU = "claude-haiku-4-5";

const MAX_TOKENS: Record<string, number> = {
  photo: 1500,
  complex: 800,
  simple: 300,
};

/* ── Static cached system prompt block (Senior Tech persona) ── */
import { STATIC_SYSTEM_PROMPT, getDynamicSystemPrompt } from "@/lib/system-prompt";

/* ── Build model selection ── */
function selectModel(
  requestType: string,
  hasPhoto: boolean,
  turnCount: number
): string {
  if (hasPhoto) return MODEL_SONNET;
  if (turnCount <= 3) return MODEL_HAIKU;
  if (requestType === "complex") return MODEL_SONNET;
  return MODEL_HAIKU;
}

/* ── POST handler ── */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const model = selectModel(requestType, hasPhoto, turnCount);
  const maxTokens = MAX_TOKENS[requestType] ?? 500;

  /* ── Build dynamic system block ── */
  const dynamicContext = [
    sessionState?.equipment?.brand &&
      `Equipment: ${sessionState.equipment.brand} ${sessionState.equipment.model} (${sessionState.equipment.type})`,
    sessionState?.symptoms?.length &&
      `Reported symptoms: ${sessionState.symptoms.join(", ")}`,
    sessionState?.ruled_out?.length &&
      `Ruled out: ${sessionState.ruled_out.join(", ")}`,
    sessionState?.working_diagnosis &&
      `Working diagnosis: ${sessionState.working_diagnosis}`,
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

  /* ── System prompt with cache_control ── */
  const systemBlocks = [
    {
      type: "text",
      text: STATIC_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
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
    return new Response(
      JSON.stringify({ error: "Anthropic API error", details: errorText }),
      { status: anthropicRes.status, headers: { "Content-Type": "application/json" } }
    );
  }

  /* ── Stream SSE back to client as plain text chunks ── */
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
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
            model === MODEL_SONNET
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
    },
  });
}
