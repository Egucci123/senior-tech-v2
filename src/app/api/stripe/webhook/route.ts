/**
 * POST /api/stripe/webhook
 *
 * Stripe sends signed events here for subscription lifecycle management.
 * This is the reliability backbone — handles renewals, failures, cancellations.
 * The /verify-session route handles the immediate post-checkout update;
 * this webhook handles everything that happens after (renewals, cancels, etc.)
 *
 * Configure in Stripe Dashboard → Webhooks → Add endpoint:
 *   URL: https://senior-tech-v2.vercel.app/api/stripe/webhook
 *   Events: customer.subscription.updated, customer.subscription.deleted,
 *            invoice.payment_failed, invoice.payment_succeeded
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import type Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return new NextResponse("Webhook signature invalid", { status: 400 });
  }

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        // Backup handler — /verify-session usually fires first
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const customerId = session.customer as string;
        await updateByCustomerId(customerId, {
          subscription_status: "active",
          subscription_id: session.subscription as string,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        // Renewal — keep status active and refresh period end
        const invoice = event.data.object as Stripe.Invoice;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        await updateByCustomerId(invoice.customer as string, {
          subscription_status: "active",
          subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await updateByCustomerId(invoice.customer as string, {
          subscription_status: "past_due",
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const statusMap: Record<string, string> = {
          active:   "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "cancelled",
          unpaid:   "past_due",
          paused:   "inactive",
          incomplete: "inactive",
          incomplete_expired: "cancelled",
        };
        await updateByCustomerId(sub.customer as string, {
          subscription_status: statusMap[sub.status] ?? "inactive",
          subscription_id: sub.id,
          subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateByCustomerId(sub.customer as string, {
          subscription_status: "cancelled",
          subscription_id: null,
          subscription_current_period_end: null,
        });
        break;
      }

      default:
        // Unhandled event — ignore
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  return new NextResponse("ok", { status: 200 });
}

async function updateByCustomerId(
  customerId: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("stripe_customer_id", customerId);
  if (error) {
    console.error("[webhook] db update error:", error.message, "customer:", customerId);
  }
}
