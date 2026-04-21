/**
 * GET /api/stripe/verify-session?session_id=cs_xxx
 *
 * Called from /subscribe/success immediately after Stripe redirects back.
 * Retrieves the checkout session from Stripe, confirms payment, then
 * updates Supabase synchronously — so the app doesn't have to wait for
 * a webhook to fire before the user can access the app.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400, headers: securityHeaders }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json(
        { error: "payment_not_complete", status: session.payment_status },
        { status: 402, headers: securityHeaders }
      );
    }

    const sub = session.subscription as import("stripe").Stripe.Subscription | null;
    const customerId = session.customer as string;

    // Look up the Supabase user by Stripe customer ID
    const { data: userRow, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (lookupError || !userRow) {
      console.error("[verify-session] user not found for customer:", customerId);
      return NextResponse.json(
        { error: "user_not_found" },
        { status: 404, headers: securityHeaders }
      );
    }

    // Update subscription status
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        subscription_status: "active",
        subscription_id: sub?.id ?? null,
        subscription_current_period_end: sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
      })
      .eq("id", userRow.id);

    if (updateError) {
      console.error("[verify-session] update error:", updateError);
      return NextResponse.json(
        { error: "db_update_failed" },
        { status: 500, headers: securityHeaders }
      );
    }

    return NextResponse.json({ ok: true }, { headers: securityHeaders });
  } catch (err) {
    console.error("[verify-session] error:", err);
    return NextResponse.json(
      { error: "verification_failed" },
      { status: 500, headers: securityHeaders }
    );
  }
}
