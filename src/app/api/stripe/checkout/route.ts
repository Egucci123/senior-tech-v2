/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for the $10/month subscription.
 * Returns { url } — the hosted Stripe checkout page URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, STRIPE_PRICE_ID, APP_URL } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: "Stripe price not configured" },
        { status: 500, headers: securityHeaders }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id, subscription_status")
      .eq("id", userId)
      .single();

    let customerId: string | undefined = userRow?.stripe_customer_id ?? undefined;

    // If already active, don't create a new checkout
    if (userRow?.subscription_status === "active") {
      return NextResponse.json(
        { error: "already_subscribed" },
        { status: 409, headers: securityHeaders }
      );
    }

    // Create a new Stripe customer if we don't have one yet
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Save customer ID immediately so the webhook can look it up
      await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        metadata: { supabase_user_id: userId },
      },
      success_url: `${APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/subscribe?cancelled=1`,
      allow_promotion_codes: true,
      customer_update: { address: "auto" },
    });

    return NextResponse.json({ url: session.url }, { headers: securityHeaders });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers: securityHeaders }
    );
  }
}
