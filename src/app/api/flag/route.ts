import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client — bypasses RLS, only used server-side
function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      user_id,
      session_id,
      brand,
      model,
      serial,
      error_category,
      correct_value,
      ai_response_excerpt,
    } = body;

    if (!error_category) {
      return NextResponse.json(
        { error: "error_category is required" },
        { status: 400, headers: securityHeaders }
      );
    }

    const { error } = await adminClient()
      .from("corrections")
      .insert({
        user_id: user_id || "00000000-0000-0000-0000-000000000000",
        session_id: session_id ?? null,
        brand: brand ?? null,
        model: model ?? null,
        serial: serial ?? null,
        error_category,
        correct_value: correct_value ?? null,
        ai_response_excerpt: ai_response_excerpt ?? null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[flag] Supabase insert error:", error);
      return NextResponse.json(
        { error: "DB insert failed", detail: error.message },
        { status: 500, headers: securityHeaders }
      );
    }

    return NextResponse.json({ ok: true }, { headers: securityHeaders });
  } catch (err) {
    console.error("[flag] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: securityHeaders }
    );
  }
}
