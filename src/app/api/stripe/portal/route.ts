/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session so the tech can manage
 * their subscription (cancel, update payment method, view invoices).
 * Returns { url } — redirect to the portal.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe, APP_URL } from "@/lib/stripe";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400, headers: securityHeaders }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/`,
    });

    return NextResponse.json({ url: portalSession.url }, { headers: securityHeaders });
  } catch (err) {
    console.error("[stripe/portal] error:", err);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500, headers: securityHeaders }
    );
  }
}
